"use client";

import { useWorkflows } from "@/hooks/use-workflows";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const WorkflowBuilder = dynamic(() => import("@/components/automation/workflow-builder"), {
    ssr: false,
    loading: () => (
        <div className="flex items-center justify-center h-screen">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
    ),
});

import { use } from "react";

export default function BuilderPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { data: workflows, isLoading } = useWorkflows();
    const workflow = workflows?.find(w => w.id === id);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!workflow) {
        return (
            <div className="flex items-center justify-center h-screen flex-col gap-4">
                <h1 className="text-2xl font-bold">Workflow not found</h1>
                <p className="text-muted-foreground">The workflow you are looking for does not exist or has been deleted.</p>
            </div>
        );
    }

    return <WorkflowBuilder workflow={workflow} />;
}
