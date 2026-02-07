"use client";

import { LucideIcon, Plus, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
    icon?: LucideIcon;
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
    secondaryActionLabel?: string;
    onSecondaryAction?: () => void;
    className?: string;
}

export function EmptyState({
    icon: Icon = Inbox,
    title,
    description,
    actionLabel,
    onAction,
    secondaryActionLabel,
    onSecondaryAction,
    className
}: EmptyStateProps) {
    return (
        <div className={cn(
            "flex flex-col items-center justify-center py-16 px-4 text-center",
            className
        )}>
            <div className="rounded-full bg-muted/50 p-6 mb-6">
                <Icon className="h-12 w-12 text-muted-foreground/60" />
            </div>
            <h3 className="text-xl font-semibold tracking-tight mb-2">
                {title}
            </h3>
            <p className="text-muted-foreground max-w-md mb-6">
                {description}
            </p>
            <div className="flex gap-3">
                {actionLabel && onAction && (
                    <Button onClick={onAction} className="gap-2">
                        <Plus className="h-4 w-4" />
                        {actionLabel}
                    </Button>
                )}
                {secondaryActionLabel && onSecondaryAction && (
                    <Button variant="outline" onClick={onSecondaryAction}>
                        {secondaryActionLabel}
                    </Button>
                )}
            </div>
        </div>
    );
}

// Pre-configured empty states for common use cases
export function ContactsEmptyState({ onAction }: { onAction?: () => void }) {
    return (
        <EmptyState
            title="No contacts yet"
            description="Get started by adding your first contact. You can also import contacts from a CSV file."
            actionLabel="Add Contact"
            onAction={onAction}
            secondaryActionLabel="Import CSV"
        />
    );
}

export function DealsEmptyState({ onAction }: { onAction?: () => void }) {
    return (
        <EmptyState
            title="No deals in this pipeline"
            description="Create your first deal to start tracking your sales opportunities."
            actionLabel="Create Deal"
            onAction={onAction}
        />
    );
}

export function WorkflowsEmptyState({ onAction }: { onAction?: () => void }) {
    return (
        <EmptyState
            title="No automation workflows"
            description="Build automation workflows to streamline your processes and save time."
            actionLabel="New Workflow"
            onAction={onAction}
        />
    );
}

export function TasksEmptyState({ onAction }: { onAction?: () => void }) {
    return (
        <EmptyState
            title="All caught up!"
            description="You have no pending tasks. Create a new task to stay organized."
            actionLabel="Add Task"
            onAction={onAction}
        />
    );
}

export function ActivitiesEmptyState() {
    return (
        <EmptyState
            title="No activity yet"
            description="Activities will appear here as you interact with contacts and deals."
        />
    );
}
