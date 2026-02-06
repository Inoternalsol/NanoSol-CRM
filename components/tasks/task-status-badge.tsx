"use client";

import { useState } from "react";
import { CheckCircle2, Circle, Clock, Loader2 } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useUpdateTask } from "@/hooks/use-tasks";
import { toast } from "sonner";
import type { Task } from "@/types";

interface TaskStatusBadgeProps {
    task: Task;
    className?: string;
}

export function TaskStatusBadge({ task, className }: TaskStatusBadgeProps) {
    const { trigger: updateTask } = useUpdateTask();
    const [isUpdating, setIsUpdating] = useState(false);

    const handleStatusChange = async (newStatus: Task["status"]) => {
        if (newStatus === task.status) return;

        setIsUpdating(true);
        try {
            await updateTask({
                id: task.id,
                updates: { status: newStatus }
            });
            toast.success(`Task marked as ${newStatus.replace("_", " ")}`);
        } catch {
            toast.error("Failed to update status");
        } finally {
            setIsUpdating(false);
        }
    };

    const getStatusConfig = (status: Task["status"]) => {
        switch (status) {
            case "completed":
                return {
                    icon: CheckCircle2,
                    label: "Completed",
                    color: "bg-green-100 text-green-700 hover:bg-green-200 border-green-200",
                    iconColor: "text-green-600"
                };
            case "in_progress":
                return {
                    icon: Clock,
                    label: "In Progress",
                    color: "bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200",
                    iconColor: "text-blue-600"
                };
            default:
                return {
                    icon: Circle,
                    label: "Pending",
                    color: "bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200",
                    iconColor: "text-slate-500"
                };
        }
    };

    const config = getStatusConfig(task.status);
    const Icon = isUpdating ? Loader2 : config.icon;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    className={cn(
                        "flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                        config.color,
                        className
                    )}
                    disabled={isUpdating}
                >
                    <Icon className={cn("h-3.5 w-3.5", config.iconColor, isUpdating && "animate-spin")} />
                    <span>{config.label}</span>
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => handleStatusChange("pending")}>
                    <div className="flex items-center gap-2">
                        <Circle className="h-4 w-4 text-slate-500" />
                        <span>Pending</span>
                    </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusChange("in_progress")}>
                    <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-blue-500" />
                        <span>In Progress</span>
                    </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusChange("completed")}>
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span>Completed</span>
                    </div>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
