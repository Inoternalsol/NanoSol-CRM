"use client";

import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useCreateDeal, useUpdateDeal, useContacts, useActiveProfile } from "@/hooks/use-data";
import type { Deal } from "@/types";

interface DealFormData {
    name: string;
    value: number;
    stage: string;
    probability: number;
    contact_id: string;
    expected_close_date: string;
}

interface DealDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    deal?: Deal | null;
    pipelineId: string;
    organizationId: string;
    stages: { id: string; name: string }[];
    onSuccess?: () => void;
}

export function DealDialog({
    open,
    onOpenChange,
    deal,
    pipelineId,
    organizationId,
    stages,
    onSuccess,
}: DealDialogProps) {
    const isEditing = !!deal;
    const { data: contacts } = useContacts();
    const { data: activeProfile } = useActiveProfile();
    const isAgent = activeProfile?.role === "agent";
    const { trigger: createDeal, isMutating: isCreating } = useCreateDeal();
    const { trigger: updateDeal, isMutating: isUpdating } = useUpdateDeal();

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        control,
        formState: { errors },
    } = useForm<DealFormData>({
        defaultValues: deal
            ? {
                name: deal.name,
                value: deal.value,
                stage: deal.stage,
                probability: deal.probability,
                contact_id: deal.contact_id || "none",
                expected_close_date: deal.expected_close_date || "",
            }
            : {
                name: "",
                value: 0,
                stage: stages[0]?.id || "lead",
                probability: 10,
                contact_id: "none",
                expected_close_date: "",
            },
    });

    useEffect(() => {
        if (deal) {
            reset({
                name: deal.name,
                value: deal.value,
                stage: deal.stage,
                probability: deal.probability,
                contact_id: deal.contact_id || "none",
                expected_close_date: deal.expected_close_date || "",
            });
        } else {
            reset({
                name: "",
                value: 0,
                stage: stages[0]?.id || "lead",
                probability: 10,
                contact_id: "none",
                expected_close_date: "",
            });
        }
    }, [deal, reset, stages]);

    const selectedStage = useWatch({
        control,
        name: "stage",
    });

    const watchedContactId = useWatch({
        control,
        name: "contact_id",
    });

    const onSubmit = async (data: DealFormData) => {
        try {
            if (isEditing && deal) {
                await updateDeal({
                    id: deal.id,
                    updates: {
                        ...data,
                        value: Number(data.value),
                        probability: Number(data.probability),
                        contact_id: data.contact_id === "none" ? null : data.contact_id,
                    },
                });
                toast.success("Deal updated successfully");
            } else {
                await createDeal({
                    ...data,
                    organization_id: organizationId,
                    pipeline_id: pipelineId,
                    value: Number(data.value),
                    probability: Number(data.probability),
                    contact_id: data.contact_id === "none" ? null : data.contact_id,
                    expected_close_date: data.expected_close_date || null,
                    currency: "USD",
                    owner_id: activeProfile?.id || null,
                });
                toast.success("Deal created successfully");
            }
            reset();
            onOpenChange(false);
            onSuccess?.();
        } catch (error: any) {
            console.error("Error saving deal:", error);
            const errorMessage = error?.message || error?.code || "Failed to save deal";
            toast.error(`Error: ${errorMessage}`);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{isEditing ? "Edit Deal" : "Add New Deal"}</DialogTitle>
                    <DialogDescription>
                        {isEditing
                            ? "Update the deal information."
                            : "Fill in the details to create a new deal."}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Deal Name *</Label>
                        <Input
                            id="name"
                            {...register("name", { required: "Deal name is required" })}
                            placeholder="Enterprise Agreement"
                        />
                        {errors.name && (
                            <p className="text-xs text-destructive">{errors.name.message}</p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="value">Value ($)</Label>
                            <Input
                                id="value"
                                type="number"
                                step="0.01"
                                {...register("value", { min: 0 })}
                                placeholder="50000"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="probability">Probability (%)</Label>
                            <Input
                                id="probability"
                                type="number"
                                min="0"
                                max="100"
                                {...register("probability", { min: 0, max: 100 })}
                                placeholder="50"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="stage">Stage</Label>
                        <Select
                            value={selectedStage}
                            onValueChange={(value) => setValue("stage", value)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select stage" />
                            </SelectTrigger>
                            <SelectContent>
                                {stages.map((stage) => (
                                    <SelectItem key={stage.id} value={stage.id}>
                                        {stage.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="contact_id">Contact</Label>
                        <Select
                            value={watchedContactId}
                            onValueChange={(value) => setValue("contact_id", value)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select contact (optional)" />
                            </SelectTrigger>
                            <SelectContent>
                                {!isAgent && <SelectItem value="none">No contact</SelectItem>}
                                {contacts?.map((contact) => (
                                    <SelectItem key={contact.id} value={contact.id}>
                                        {contact.first_name} {contact.last_name}
                                        {contact.company && ` - ${contact.company}`}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {isAgent && watchedContactId === "none" && (
                            <p className="text-xs text-destructive">Agents must link a contact to create a deal.</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="expected_close_date">Expected Close Date</Label>
                        <Input
                            id="expected_close_date"
                            type="date"
                            {...register("expected_close_date")}
                        />
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isCreating || isUpdating || (isAgent && watchedContactId === "none")}>
                            {isCreating || isUpdating
                                ? "Saving..."
                                : isEditing
                                    ? "Update Deal"
                                    : "Create Deal"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
