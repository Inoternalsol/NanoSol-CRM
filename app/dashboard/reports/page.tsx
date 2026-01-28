"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
    BarChart as BarChartIcon,
    TrendingUp,
    Users,
    Phone,
    DollarSign,
    Calendar,
    Download,
    Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCallLogs, useDeals, useContacts } from "@/hooks/use-data";
import { formatCurrency } from "@/lib/utils";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    LineChart,
    Line,
    Legend,
    PieChart,
    Pie,
    Cell,
} from "recharts";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function ReportsPage() {
    const { data: callLogs, isLoading: callsLoading } = useCallLogs(1000);
    const { data: deals, isLoading: dealsLoading } = useDeals();
    const { data: contacts, isLoading: contactsLoading } = useContacts();

    const isLoading = callsLoading || dealsLoading || contactsLoading;

    // Process Call Data
    const callStats = useMemo(() => {
        if (!callLogs) return [];
        const days: Record<string, number> = {};
        // Last 7 days
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            days[d.toISOString().split("T")[0]] = 0;
        }

        callLogs.forEach((log) => {
            const date = log.started_at.split("T")[0];
            if (days[date] !== undefined) {
                days[date]++;
            }
        });

        return Object.entries(days).map(([name, total]) => ({ name, total }));
    }, [callLogs]);

    // Process Deal Data
    const pipelineStats = useMemo(() => {
        if (!deals) return [];
        const stages: Record<string, { name: string; value: number }> = {
            "lead": { name: "Lead", value: 0 },
            "qualified": { name: "Qualified", value: 0 },
            "proposal": { name: "Proposal", value: 0 },
            "negotiation": { name: "Negotiation", value: 0 },
            "closed-won": { name: "Closed Won", value: 0 },
        };

        deals.forEach((deal) => {
            if (stages[deal.stage]) {
                stages[deal.stage].value += deal.value;
            }
        });

        return Object.values(stages);
    }, [deals]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-24">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
        >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Analytics & Reports</h1>
                    <p className="text-muted-foreground">
                        Visualize your sales performance and team activity
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline">
                        <Calendar className="h-4 w-4 mr-2" />
                        Last 30 Days
                    </Button>
                    <Button>
                        <Download className="h-4 w-4 mr-2" />
                        Export Data
                    </Button>
                </div>
            </div>

            {/* Top Stats */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(deals?.filter(d => d.stage === 'closed-won').reduce((a, b) => a + b.value, 0) || 0)}</div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <TrendingUp className="h-3 w-3 text-green-500" />
                            +12% from last month
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Call Connect Rate</CardTitle>
                        <Phone className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">48.2%</div>
                        <p className="text-xs text-muted-foreground mt-1">Average 5.2 mins per call</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">New Leads</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">+{contacts?.length || 0}</div>
                        <p className="text-xs text-muted-foreground mt-1">Growth this quarter</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
                        <BarChartIcon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">24%</div>
                        <p className="text-xs text-muted-foreground mt-1">Up 2% since last week</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Call Volume Chart */}
                <Card className="p-6">
                    <CardHeader className="px-0 pt-0">
                        <CardTitle>Call Volume</CardTitle>
                        <CardDescription>Daily outgoing calls over the last 7 days</CardDescription>
                    </CardHeader>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={callStats}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis
                                    dataKey="name"
                                    stroke="#888888"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(str) => new Date(str).toLocaleDateString("en-US", { weekday: 'short' })}
                                />
                                <YAxis
                                    stroke="#888888"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e0e0e0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="total"
                                    stroke="#3b82f6"
                                    strokeWidth={3}
                                    dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                                    activeDot={{ r: 6, strokeWidth: 0 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* Pipeline Value Chart */}
                <Card className="p-6">
                    <CardHeader className="px-0 pt-0">
                        <CardTitle>Pipeline Distribution</CardTitle>
                        <CardDescription>Value distribution across sales stages</CardDescription>
                    </CardHeader>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={pipelineStats}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis
                                    dataKey="name"
                                    stroke="#888888"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    stroke="#888888"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value) => `$${value / 1000}k`}
                                />
                                <Tooltip
                                    formatter={(value) => formatCurrency(value as number)}
                                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e0e0e0' }}
                                />
                                <Bar
                                    dataKey="value"
                                    fill="#3b82f6"
                                    radius={[4, 4, 0, 0]}
                                    barSize={40}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>

            {/* Deal Sources Pie Chart */}
            <div className="grid gap-6 md:grid-cols-2">
                <Card className="p-6">
                    <CardHeader className="px-0 pt-0">
                        <CardTitle>Deal Sources</CardTitle>
                        <CardDescription>Where your deals come from</CardDescription>
                    </CardHeader>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={[
                                        { name: "Direct", value: 35 },
                                        { name: "Referral", value: 25 },
                                        { name: "LinkedIn", value: 20 },
                                        { name: "Website", value: 15 },
                                        { name: "Other", value: 5 },
                                    ]}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    dataKey="value"
                                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                                >
                                    {[0, 1, 2, 3, 4].map((index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>


            {/* Performance Table Placeholder */}
            <Card>
                <CardHeader>
                    <CardTitle>Team Leaderboard</CardTitle>
                    <CardDescription>Performance based on deals closed and call activity</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="relative w-full overflow-auto">
                        <table className="w-full caption-bottom text-sm">
                            <thead className="[&_tr]:border-b">
                                <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Agent</th>
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Calls</th>
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Deals Won</th>
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Revenue</th>
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Conversion</th>
                                </tr>
                            </thead>
                            <tbody className="[&_tr:last-child]:border-0">
                                {[
                                    { name: "Sarah Johnson", calls: 452, deals: 12, revenue: 145000, conv: "2.6%" },
                                    { name: "Michael Chen", calls: 384, deals: 8, revenue: 92000, conv: "2.1%" },
                                    { name: "John Smith", calls: 512, deals: 7, revenue: 84000, conv: "1.4%" },
                                ].map((agent) => (
                                    <tr key={agent.name} className="border-b transition-colors hover:bg-muted/50">
                                        <td className="p-4 align-middle font-medium">{agent.name}</td>
                                        <td className="p-4 align-middle">{agent.calls}</td>
                                        <td className="p-4 align-middle">{agent.deals}</td>
                                        <td className="p-4 align-middle">{formatCurrency(agent.revenue)}</td>
                                        <td className="p-4 align-middle">
                                            <div className="flex items-center gap-2">
                                                <div className="w-full h-2 bg-muted rounded-full overflow-hidden max-w-[60px]">
                                                    <div className="h-full bg-primary" style={{ width: agent.conv }} />
                                                </div>
                                                {agent.conv}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}
