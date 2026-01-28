"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
    Zap,
    Plus,
    Play,
    Pause,
    MoreHorizontal,
    ArrowRight,
    Mail,
    User,
    Calendar,
    Loader2,
    Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    useAutomationRules,
    useDeleteAutomationRule,
    useToggleAutomationRule,
} from "@/hooks/use-data";
import { AutomationDialog } from "@/components/automations/automation-dialog";
import type { AutomationRule } from "@/types";
import { toast } from "sonner";

// Organization ID from authenticated profile

const triggerTypes = [
    {
        icon: User,
        name: "Lead Created",
        description: "When a new lead is added to the CRM",
    },
    {
        icon: ArrowRight,
        name: "Deal Stage Changed",
        description: "When a deal moves to a different stage",
    },
    {
        icon: Mail,
        name: "Email Opened",
        description: "When a contact opens your email",
    },
    {
        icon: Calendar,
        name: "Meeting Scheduled",
        description: "When a meeting is booked on your calendar",
    },
];

// Format trigger type for display
function formatTriggerType(type: string): string {
    return type.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useActiveProfile } from "@/hooks/use-data";

export default function AutomationsPage() {
    const { data: activeProfile, isLoading: profileLoading } = useActiveProfile();
    const router = useRouter();

    useEffect(() => {
        if (!profileLoading && activeProfile && activeProfile.role !== "admin") {
            router.push("/dashboard");
        }
    }, [activeProfile, profileLoading, router]);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedAutomation, setSelectedAutomation] = useState<AutomationRule | null>(null);

    const { data: automations = [], isLoading, mutate } = useAutomationRules();
    const { trigger: deleteRule } = useDeleteAutomationRule();
    const { trigger: toggleRule } = useToggleAutomationRule();

    const handleNewAutomation = () => {
        setSelectedAutomation(null);
        setDialogOpen(true);
    };

    const handleEditAutomation = (automation: AutomationRule) => {
        setSelectedAutomation(automation);
        setDialogOpen(true);
    };

    const handleDeleteAutomation = async (id: string) => {
        try {
            await deleteRule(id);
            mutate();
            toast.success("Automation deleted");
        } catch (error) {
            console.error("Delete failed:", error);
            toast.error("Failed to delete automation");
        }
    };

    const handleToggleAutomation = async (id: string, currentStatus: boolean) => {
        try {
            await toggleRule({ id, is_active: !currentStatus });
            mutate();
            toast.success(`Automation ${!currentStatus ? "activated" : "paused"}`);
        } catch (error) {
            console.error("Toggle failed:", error);
            toast.error("Failed to update automation");
        }
    };

    const handleDialogClose = (open: boolean) => {
        setDialogOpen(open);
        if (!open) {
            mutate();
        }
    };

    const activeCount = automations.filter((a) => a.is_active).length;
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
        >
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Automations</h1>
                    <p className="text-muted-foreground">
                        Build workflows to automate repetitive tasks
                    </p>
                </div>
                <Button onClick={handleNewAutomation}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Automation
                </Button>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Active Automations
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {activeCount}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Total Automations
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-primary">
                            {automations.length}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Paused
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {automations.length - activeCount}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Time Saved
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-500">~48h</div>
                    </CardContent>
                </Card>
            </div>

            {/* Automations List */}
            <Card>
                <CardHeader>
                    <CardTitle>Your Automations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : automations.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No automations yet</p>
                            <p className="text-sm">Create your first automation</p>
                        </div>
                    ) : (
                        automations.map((automation) => (
                            <div
                                key={automation.id}
                                className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <div
                                        className={`flex h-10 w-10 items-center justify-center rounded-lg ${automation.is_active
                                            ? "bg-primary/10"
                                            : "bg-muted"
                                            }`}
                                    >
                                        <Zap
                                            className={`h-5 w-5 ${automation.is_active
                                                ? "text-primary"
                                                : "text-muted-foreground"
                                                }`}
                                        />
                                    </div>
                                    <div>
                                        <p className="font-medium">{automation.name}</p>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <span>Trigger: {formatTriggerType(automation.trigger_type)}</span>
                                            <span>•</span>
                                            <span>{automation.actions.length} action{automation.actions.length !== 1 ? "s" : ""}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <Badge
                                        variant={automation.is_active ? "default" : "secondary"}
                                    >
                                        {automation.is_active ? "active" : "paused"}
                                    </Badge>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className={
                                            automation.is_active
                                                ? "text-orange-500"
                                                : "text-green-500"
                                        }
                                        onClick={() => handleToggleAutomation(automation.id, automation.is_active)}
                                    >
                                        {automation.is_active ? (
                                            <Pause className="h-4 w-4" />
                                        ) : (
                                            <Play className="h-4 w-4" />
                                        )}
                                    </Button>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => handleEditAutomation(automation)}>
                                                Edit
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                className="text-destructive"
                                                onClick={() => handleDeleteAutomation(automation.id)}
                                            >
                                                <Trash2 className="h-4 w-4 mr-2" />
                                                Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                        ))
                    )}
                </CardContent>
            </Card>

            {/* Available Triggers */}
            <Card>
                <CardHeader>
                    <CardTitle>Available Triggers</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {triggerTypes.map((trigger) => (
                            <div
                                key={trigger.name}
                                className="p-4 rounded-lg border hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer"
                                onClick={handleNewAutomation}
                            >
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted mb-3">
                                    <trigger.icon className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <p className="font-medium text-sm">{trigger.name}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {trigger.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <AutomationDialog
                open={dialogOpen}
                onOpenChange={handleDialogClose}
                automation={selectedAutomation}
                organizationId={activeProfile?.organization_id || ""}
            />
        </motion.div>
    );
}
