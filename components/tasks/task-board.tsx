"use client";

import { useMemo } from "react";
import {
    DndContext,
    DragOverlay,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragStartEvent,
    DragOverEvent,
    DragEndEvent,
    defaultDropAnimationSideEffects,
    DropAnimation
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { TaskColumn, TaskStatus } from "./task-column";
import { TaskCard } from "./task-card";
import { useUpdateTask } from "@/hooks/use-tasks";
import { useState } from "react";
import { Task } from "@/types";
import { Loader2 } from "lucide-react";

const columns: { id: TaskStatus; title: string }[] = [
    { id: "pending", title: "To Do" },
    { id: "in_progress", title: "In Progress" },
    { id: "completed", title: "Done" },
];

interface TaskBoardProps {
    tasks: Task[];
    isLoading: boolean;
}

export function TaskBoard({ tasks, isLoading }: TaskBoardProps) {
    const { trigger: updateTask } = useUpdateTask();
    const [activeId, setActiveId] = useState<string | null>(null);

    // Group tasks by status
    const tasksByStatus = useMemo(() => {
        const grouped: Record<TaskStatus, Task[]> = {
            pending: [],
            in_progress: [],
            completed: []
        };

        tasks?.forEach((task) => {
            // Safe mapping of status from DB to column types
            const status = task.status as TaskStatus;
            if (grouped[status]) {
                grouped[status].push(task);
            }
        });

        // Sort by position
        Object.keys(grouped).forEach((key) => {
            grouped[key as TaskStatus].sort((a, b) => (a.position || 0) - (b.position || 0));
        });

        return grouped;
    }, [tasks]);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    function handleDragStart(event: DragStartEvent) {
        setActiveId(event.active.id as string);
    }

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        const activeId = active.id;
        const overId = over?.id;

        if (!overId) {
            setActiveId(null);
            return;
        }

        // Find the task that was dragged
        const activeTask = tasks?.find(t => t.id === activeId);
        if (!activeTask) {
            setActiveId(null);
            return;
        }

        // Determine the container (column) we dropped into or over
        // If overId is a container (status), map directly.
        // If overId is an item, find its container.
        let overContainerId = overId as TaskStatus;

        // Check if we dropped directly onto a column container
        if (Object.keys(tasksByStatus).includes(overId as string)) {
            overContainerId = overId as TaskStatus;
        } else {
            // We dropped onto another task, find that task's status to know the column
            const overTask = tasks?.find(t => t.id === overId);
            if (overTask && overTask.status) {
                overContainerId = overTask.status as TaskStatus;
            }
        }

        // If the status is different, update the DB
        if (overContainerId && activeTask.status !== overContainerId) {
            // Optimistic update could happen here, but for now we rely on SWR revalidation
            updateTask({
                id: activeId as string,
                updates: { status: overContainerId as "pending" | "in_progress" | "completed" }
            }).then(() => {
                // Success feedback or local state update if needed
            });
        }

        setActiveId(null);
    }

    // Custom drop animation
    const dropAnimation: DropAnimation = {
        sideEffects: defaultDropAnimationSideEffects({
            styles: {
                active: {
                    opacity: '0.5',
                },
            },
        }),
    };

    if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="flex h-full gap-4 overflow-x-auto pb-4">
                {columns.map((col) => (
                    <TaskColumn
                        key={col.id}
                        id={col.id}
                        title={col.title}
                        tasks={tasksByStatus[col.id]}
                    />
                ))}
            </div>
            <DragOverlay dropAnimation={dropAnimation}>
                {activeId ? <TaskCard task={tasks?.find(t => t.id === activeId)!} /> : null}
            </DragOverlay>
        </DndContext>
    );
}
