"use client";

import { motion } from "framer-motion";
import { Users, Briefcase, DollarSign, TrendingUp, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useActiveProfile, useContactCount, useDealStats } from "@/hooks/use-data";
import { useMemo } from "react";

const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
};

export function StatsGrid() {
    const { data: profile, isLoading: profileLoading } = useActiveProfile();
    const isAdmin = profile?.role === "admin" || profile?.role === "manager";

    const { data: contactCount, isLoading: contactsLoading } = useContactCount(profile?.id, isAdmin);
    const { data: dealStats, isLoading: dealsLoading } = useDealStats(profile?.id, isAdmin);

    const stats = useMemo(() => [
        {
            title: "My Contacts",
            value: contactCount?.toString() || "0",
            change: "+12.5%",
            trend: "up",
            icon: Users,
        },
        {
            title: "Active Deals",
            value: dealStats?.activeCount?.toString() || "0",
            change: "+8.2%",
            trend: "up",
            icon: Briefcase,
        },
        {
            title: "Revenue (Closed)",
            value: `$${(dealStats?.totalRevenue || 0).toLocaleString()}`,
            change: "+23.1%",
            trend: "up",
            icon: DollarSign,
        },
        {
            title: "Conversion Rate",
            value: "24.8%",
            change: "-2.4%",
            trend: "down",
            icon: TrendingUp,
        },
    ], [contactCount, dealStats]);

    if (profileLoading || contactsLoading || dealsLoading) {
        return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                    <Card key={i}>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-4 w-4 rounded-full" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-8 w-16 mb-1" />
                            <Skeleton className="h-3 w-32" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
                <motion.div
                    key={stat.title}
                    variants={item}
                    initial="hidden"
                    animate="show"
                >
                    <Card className="hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                {stat.title}
                            </CardTitle>
                            <stat.icon className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stat.value}</div>
                            <div className="flex items-center text-xs mt-1">
                                {stat.trend === "up" ? (
                                    <ArrowUpRight className="h-4 w-4 text-green-500 mr-1" />
                                ) : (
                                    <ArrowDownRight className="h-4 w-4 text-red-500 mr-1" />
                                )}
                                <span className={stat.trend === "up" ? "text-green-500" : "text-red-500"}>
                                    {stat.change}
                                </span>
                                <span className="text-muted-foreground ml-1">vs last month</span>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            ))}
        </div>
    );
}
