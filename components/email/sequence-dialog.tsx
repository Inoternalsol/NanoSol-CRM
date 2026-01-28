"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useEmailTemplates, useCreateEmailSequence, useUpdateEmailSequence } from "@/hooks/use-data";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Clock } from "lucide-react";
import { useEffect } from "react";
import type { EmailSequence } from "@/types";

const stepSchema = z.object({
    id: z.string().optional(),
    order: z.number(),
    delay_days: z.number().min(0, "Delay must be at least 0 days"),
    template_id: z.string().min(1, "Template is required"),
    subject_override: z.string().optional().nullable(),
});

const formSchema = z.object({
    name: z.string().min(1, "Sequence name is required"),
    steps: z.array(stepSchema).min(1, "At least one step is required"),
    is_active: z.boolean().default(true),
});

interface SequenceDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    sequence?: EmailSequence | null;
    organizationId: string;
    onSuccess?: () => void;
}

export function SequenceDialog({
    open,
    onOpenChange,
    sequence,
    organizationId,
    onSuccess,
}: SequenceDialogProps) {
    const { data: templates } = useEmailTemplates();
    const { trigger: createSequence, isMutating: isCreating } = useCreateEmailSequence();
    const { trigger: updateSequence, isMutating: isUpdating } = useUpdateEmailSequence();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema) as any,
        defaultValues: {
            name: "",
            steps: [{ order: 1, delay_days: 1, template_id: "" }],
            is_active: true,
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "steps",
    });

    useEffect(() => {
        if (sequence) {
            form.reset({
                name: sequence.name,
                steps: sequence.steps.map(s => ({
                    ...s,
                    subject_override: s.subject_override || null
                })),
                is_active: sequence.is_active,
            });
        } else {
            form.reset({
                name: "",
                steps: [{ order: 1, delay_days: 1, template_id: "" }],
                is_active: true,
            });
        }
    }, [sequence, form, open]);

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        try {
            const sequenceData = {
                ...values,
                steps: values.steps.map(s => ({
                    ...s,
                    id: s.id || undefined,
                    subject_override: s.subject_override || null
                }))
            };

            if (sequence) {
                await updateSequence({
                    id: sequence.id,
                    updates: sequenceData as any,
                });
                toast.success("Sequence updated");
            } else {
                await createSequence({
                    ...sequenceData,
                    organization_id: organizationId,
                } as any);
                toast.success("Sequence created");
            }
            onSuccess?.();
            onOpenChange(false);
        } catch (error) {
            console.error("Failed to save sequence:", error);
            toast.error("Failed to save sequence");
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{sequence ? "Edit Sequence" : "New Sequence"}</DialogTitle>
                    <DialogDescription>
                        Define the steps and timing for your automated email sequence.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Sequence Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g. Onboarding Nurture" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h4 className="text-sm font-semibold">Sequence Steps</h4>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                        append({
                                            order: fields.length + 1,
                                            delay_days: 3,
                                            template_id: "",
                                        })
                                    }
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Step
                                </Button>
                            </div>

                            {fields.map((field, index) => (
                                <div
                                    key={field.id}
                                    className="p-4 rounded-lg border bg-muted/30 space-y-4 relative"
                                >
                                    <div className="flex items-center justify-between">
                                        <Badge variant="outline">Step {index + 1}</Badge>
                                        {fields.length > 1 && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-destructive"
                                                onClick={() => remove(index)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>

                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <FormField
                                            control={form.control}
                                            name={`steps.${index}.delay_days`}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="flex items-center gap-2">
                                                        <Clock className="h-3 w-3" />
                                                        Delay (Days)
                                                    </FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            type="number"
                                                            {...field}
                                                            onChange={(e) =>
                                                                field.onChange(parseInt(e.target.value))
                                                            }
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name={`steps.${index}.template_id`}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Select Template</FormLabel>
                                                    <Select
                                                        onValueChange={field.onChange}
                                                        defaultValue={field.value}
                                                    >
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select template" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {templates?.map((t) => (
                                                                <SelectItem key={t.id} value={t.id}>
                                                                    {t.name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isCreating || isUpdating}>
                                {(isCreating || isUpdating) && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                {sequence ? "Save Changes" : "Create Sequence"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

function Badge({ children, variant = "default" }: { children: React.ReactNode, variant?: "default" | "outline" }) {
    return (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${variant === "default" ? "bg-primary text-primary-foreground" : "border text-foreground"
            }`}>
            {children}
        </span>
    );
}
