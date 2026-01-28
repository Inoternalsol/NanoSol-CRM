"use client";

import { motion } from "framer-motion";
import {
    Users,
    Briefcase,
    DollarSign,
    TrendingUp,
    Phone,
    Mail,
    Calendar,
    ArrowUpRight,
    ArrowDownRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { ContactDialog } from "@/components/contacts/contact-dialog";
import { DealDialog } from "@/components/deals/deal-dialog";
import { EmailComposerDialog } from "@/components/email/email-composer-dialog";
import { EventDialog } from "@/components/calendar/event-dialog";
import { useDialerStore } from "@/lib/stores";


const container = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
        },
    },
};

const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
};

import { useActiveProfile, useContacts, useActivities, useDeals, useTasks, usePipelines } from "@/hooks/use-data";
import { Skeleton } from "@/components/ui/skeleton";
import type { Task } from "@/types";

export default function DashboardPage() {
    const { data: profile, isLoading: profileLoading } = useActiveProfile();
    const { data: contacts, isLoading: contactsLoading, mutate: mutateContacts } = useContacts();
    const { data: deals, isLoading: dealsLoading, mutate: mutateDeals } = useDeals();
    const { data: activities, isLoading: activitiesLoading, mutate: mutateActivities } = useActivities();
    const { data: tasks, isLoading: tasksLoading, mutate: mutateTasks } = useTasks("todo");
    const { data: pipelines } = usePipelines();

    const [contactDialogOpen, setContactDialogOpen] = useState(false);
    const [dealDialogOpen, setDealDialogOpen] = useState(false);
    const [emailDialogOpen, setEmailDialogOpen] = useState(false);
    const [eventDialogOpen, setEventDialogOpen] = useState(false);
    const { openDialer } = useDialerStore();

    const isAdmin = profile?.role === "admin" || profile?.role === "manager";

    // Filtered data for Agents: only see assigned/owned items
    const myContacts = isAdmin ? contacts : contacts?.filter(c => c.owner_id === profile?.id);
    const myDeals = isAdmin ? deals : deals?.filter(d => d.owner_id === profile?.id);
    const myActivities = isAdmin ? activities : activities?.filter(a => a.created_by === profile?.id);
    const myTasks = isAdmin ? tasks : tasks?.filter((t: Task) => t.assigned_to?.id === profile?.id);

    const totalRevenue = myDeals?.reduce((acc, deal) => acc + (deal.stage === "closed" ? deal.value : 0), 0) || 0;
    const activeDealsCount = myDeals?.filter(d => d.stage !== "closed" && d.stage !== "lost").length || 0;

    const stats = [
        {
            title: "My Contacts",
            value: myContacts?.length.toString() || "0",
            change: "+12.5%",
            trend: "up",
            icon: Users,
        },
        {
            title: "Active Deals",
            value: activeDealsCount.toString(),
            change: "+8.2%",
            trend: "up",
            icon: Briefcase,
        },
        {
            title: "Revenue (Closed)",
            value: `$${totalRevenue.toLocaleString()}`,
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
    ];

    if (profileLoading || contactsLoading || dealsLoading || activitiesLoading || tasksLoading) {
        return <div className="p-8 space-y-6">
            <Skeleton className="h-10 w-64" />
            <div className="grid grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
            </div>
            <Skeleton className="h-64" />
        </div>;
    }

    return (
        <motion.div
            initial="hidden"
            animate="show"
            variants={container}
            className="space-y-6"
        >
            {/* Welcome Section */}
            <motion.div variants={item}>
                <h1 className="text-3xl font-bold tracking-tight">
                    Welcome back, {profile?.full_name || "User"}
                </h1>
                <p className="text-muted-foreground mt-1">
                    Here&apos;s what&apos;s happening with your CRM today.
                </p>
            </motion.div>

            {/* Stats Grid */}
            <motion.div
                variants={container}
                className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
            >
                {stats.map((stat) => (
                    <motion.div key={stat.title} variants={item}>
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
                                    <span
                                        className={
                                            stat.trend === "up" ? "text-green-500" : "text-red-500"
                                        }
                                    >
                                        {stat.change}
                                    </span>
                                    <span className="text-muted-foreground ml-1">
                                        vs last month
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </motion.div>

            {/* Main Content Grid */}
            <div className="grid gap-6 lg:grid-cols-7">
                {/* Recent Activity */}
                <motion.div variants={item} className="lg:col-span-4">
                    <Card className="h-full">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Recent Activity</CardTitle>
                            <Button variant="ghost" size="sm">
                                View all
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {myActivities?.slice(0, 5).map((activity) => (
                                <div
                                    key={activity.id}
                                    className="flex items-start gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                                >
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                                        <Phone className="h-5 w-5 text-primary" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium truncate">{activity.title}</p>
                                        <p className="text-sm text-muted-foreground truncate">
                                            {activity.description}
                                        </p>
                                    </div>
                                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                                        {new Date(activity.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                            ))}
                            {(!myActivities || myActivities.length === 0) && (
                                <p className="text-center text-muted-foreground py-8">No recent activity.</p>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Upcoming Tasks */}
                <motion.div variants={item} className="lg:col-span-3">
                    <Card className="h-full">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Upcoming Tasks</CardTitle>
                            <Button variant="ghost" size="sm">
                                Add task
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {myTasks?.slice(0, 5).map((task: Task) => (
                                <div
                                    key={task.id}
                                    className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                                >
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium truncate">{task.title}</p>
                                        <p className="text-sm text-muted-foreground">
                                            Due: {task.due_date ? new Date(task.due_date).toLocaleDateString() : "No date"}
                                        </p>
                                    </div>
                                    <Badge
                                        variant={
                                            task.priority === "high"
                                                ? "destructive"
                                                : task.priority === "medium"
                                                    ? "default"
                                                    : "secondary"
                                        }
                                    >
                                        {task.priority || "low"}
                                    </Badge>
                                </div>
                            ))}
                            {(!myTasks || myTasks.length === 0) && (
                                <p className="text-center text-muted-foreground py-8">No upcoming tasks.</p>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>
            </div>

            {/* Quick Actions */}
            <motion.div variants={item}>
                <Card>
                    <CardHeader>
                        <CardTitle>Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-3">
                        <Button onClick={() => setContactDialogOpen(true)}>
                            <Users className="h-4 w-4 mr-2" />
                            Add Contact
                        </Button>
                        <Button variant="outline" onClick={() => setDealDialogOpen(true)}>
                            <Briefcase className="h-4 w-4 mr-2" />
                            Create Deal
                        </Button>
                        <Button variant="outline" onClick={() => openDialer()}>
                            <Phone className="h-4 w-4 mr-2" />
                            Make Call
                        </Button>
                        <Button variant="outline" onClick={() => setEmailDialogOpen(true)}>
                            <Mail className="h-4 w-4 mr-2" />
                            Send Email
                        </Button>
                        <Button variant="outline" onClick={() => setEventDialogOpen(true)}>
                            <Calendar className="h-4 w-4 mr-2" />
                            Schedule Meeting
                        </Button>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Dialogs */}
            <ContactDialog
                open={contactDialogOpen}
                onOpenChange={setContactDialogOpen}
                organizationId={profile?.organization_id || ""}
                onSuccess={() => {
                    mutateContacts();
                    mutateActivities();
                }}
            />
            <DealDialog
                open={dealDialogOpen}
                onOpenChange={setDealDialogOpen}
                organizationId={profile?.organization_id || ""}
                pipelineId={pipelines?.[0]?.id || "default"}
                stages={pipelines?.[0]?.stages || []}
                onSuccess={() => {
                    mutateDeals();
                    mutateActivities();
                }}
            />
            <EmailComposerDialog
                open={emailDialogOpen}
                onOpenChange={setEmailDialogOpen}
                organizationId={profile?.organization_id || ""}
            />
            <EventDialog
                open={eventDialogOpen}
                onOpenChange={setEventDialogOpen}
                onSuccess={() => {
                    mutateTasks();
                    mutateActivities();
                }}
            />
        </motion.div>
    );
}
