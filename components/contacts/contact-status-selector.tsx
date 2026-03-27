"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useContactStatuses, useUpdateContact } from "@/hooks/use-data";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ContactStatusSelectorProps {
    contactId: string;
    currentStatus?: string | null;
}

export function ContactStatusSelector({ contactId, currentStatus }: ContactStatusSelectorProps) {
    const { data: statuses, isLoading: loadingStatuses } = useContactStatuses();
    const { trigger: updateContact, isMutating: isUpdating } = useUpdateContact();

    const handleStatusChange = async (statusName: string) => {
        if (statusName === currentStatus) return;

        try {
            await updateContact({
                id: contactId,
                updates: { status: statusName }
            });
            toast.success(`Status updated to ${statusName.replace(/_/g, ' ')}`);
        } catch (error) {
            console.error("Failed to update status:", error);
            toast.error("Failed to update status");
        }
    };

    if (loadingStatuses) {
        return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
    }

    const selectedStatus = statuses?.find((s) => s.name === currentStatus);

    return (
        <Select
            value={currentStatus || "new"}
            onValueChange={handleStatusChange}
            disabled={isUpdating}
        >
            <SelectTrigger className="h-8 w-[160px] text-xs font-medium bg-background/50 hover:bg-background transition-colors">
                {isUpdating ? (
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                ) : (
                    <div className={cn(
                        "mr-2 h-2 w-2 rounded-full shrink-0",
                        selectedStatus?.color === 'red' && "bg-red-500",
                        selectedStatus?.color === 'blue' && "bg-blue-500",
                        selectedStatus?.color === 'green' && "bg-green-500",
                        selectedStatus?.color === 'orange' && "bg-orange-500",
                        selectedStatus?.color === 'purple' && "bg-purple-500",
                        selectedStatus?.color === 'yellow' && "bg-yellow-500",
                        selectedStatus?.color === 'slate' && "bg-slate-500",
                        (!selectedStatus?.color || selectedStatus?.color === 'gray') && "bg-slate-400"
                    )} />
                )}
                <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px] overflow-y-auto">
                {statuses?.map((status) => (
                    <SelectItem 
                        key={status.id} 
                        value={status.name}
                        className="text-xs"
                    >
                        <div className="flex items-center gap-2">
                             <div className={cn(
                                "h-2 w-2 rounded-full shrink-0",
                                status.color === 'red' && "bg-red-500",
                                status.color === 'blue' && "bg-blue-500",
                                status.color === 'green' && "bg-green-500",
                                status.color === 'orange' && "bg-orange-500",
                                status.color === 'purple' && "bg-purple-500",
                                status.color === 'yellow' && "bg-yellow-500",
                                status.color === 'slate' && "bg-slate-500",
                                (!status.color || status.color === 'gray') && "bg-slate-400"
                            )} />
                            {status.label}
                        </div>
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
