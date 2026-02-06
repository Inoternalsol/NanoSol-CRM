"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { TaskCard } from "./task-card";
import { Task } from "@/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export type TaskStatus = "pending" | "in_progress" | "completed";

interface TaskColumnProps {
    id: TaskStatus;
    title: string;
    tasks: Task[];
}

export function TaskColumn({ id, title, tasks }: TaskColumnProps) {
    const { setNodeRef } = useDroppable({
        id: id,
    });

    return (
        <div className="flex w-[350px] flex-col rounded-xl bg-muted/50 p-4">
            <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold text-lg">{title}</h3>
                <Badge variant="secondary" className="bg-background">{tasks.length}</Badge>
            </div>

            <div ref={setNodeRef} className="flex flex-1 flex-col gap-3 min-h-[500px]">
                <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                    {tasks.map((task) => (
                        <TaskCard key={task.id} task={task} />
                    ))}
                </SortableContext>
                {tasks.length === 0 && (
                    <div className="flex h-32 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 bg-background/50">
                        <span className="text-sm text-muted-foreground">No tasks</span>
                    </div>
                )}
            </div>
        </div>
    );
}
