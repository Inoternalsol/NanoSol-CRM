"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useCreateAutomationRule, useUpdateAutomationRule } from "@/hooks/use-data";
import { toast } from "sonner";
import type { AutomationRule } from "@/types";
import { Loader2 } from "lucide-react";

const TRIGGER_TYPES = [
    { value: "lead_created", label: "Lead Created" },
    { value: "deal_stage_changed", label: "Deal Stage Changed" },
    { value: "email_opened", label: "Email Opened" },
    { value: "meeting_scheduled", label: "Meeting Scheduled" },
    { value: "task_completed", label: "Task Completed" },
];

const ACTION_TYPES = [
    { value: "send_email", label: "Send Email" },
    { value: "create_task", label: "Create Task" },
    { value: "update_field", label: "Update Field" },
    { value: "send_notification", label: "Send Notification" },
    { value: "add_tag", label: "Add Tag" },
];

const automationSchema = z.object({
    name: z.string().min(1, "Automation name is required"),
    trigger_type: z.string().min(1, "Trigger is required"),
    action_type: z.string().min(1, "Action is required"),
    is_active: z.boolean().default(true),
});

type AutomationFormValues = z.infer<typeof automationSchema>;

interface AutomationDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    automation?: AutomationRule | null;
    organizationId: string;
}

export function AutomationDialog({
    open,
    onOpenChange,
    automation,
    organizationId,
}: AutomationDialogProps) {
    const isEditing = !!automation;
    const { trigger: createRule, isMutating: isCreating } = useCreateAutomationRule();
    const { trigger: updateRule, isMutating: isUpdating } = useUpdateAutomationRule();
    const isLoading = isCreating || isUpdating;

    const form = useForm<AutomationFormValues>({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolver: zodResolver(automationSchema) as any,
        defaultValues: {
            name: "",
            trigger_type: "",
            action_type: "",
            is_active: true,
        },
    });

    useEffect(() => {
        if (automation) {
            form.reset({
                name: automation.name,
                trigger_type: automation.trigger_type,
                action_type: automation.actions[0]?.type || "",
                is_active: automation.is_active,
            });
        } else {
            form.reset({
                name: "",
                trigger_type: "",
                action_type: "",
                is_active: true,
            });
        }
    }, [automation, form]);

    const onSubmit = async (values: AutomationFormValues) => {
        try {
            const ruleData = {
                name: values.name,
                trigger_type: values.trigger_type,
                trigger_config: {},
                actions: [
                    {
                        id: crypto.randomUUID(),
                        type: values.action_type,
                        config: {},
                        order: 0,
                    },
                ],
                is_active: values.is_active,
                organization_id: organizationId,
            };

            if (isEditing && automation) {
                await updateRule({
                    id: automation.id,
                    updates: ruleData,
                });
                toast.success("Automation updated successfully");
            } else {
                await createRule(ruleData);
                toast.success("Automation created successfully");
            }
            onOpenChange(false);
            form.reset();
        } catch (error) {
            console.error("Failed to save automation:", error);
            toast.error("Failed to save automation");
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>
                        {isEditing ? "Edit Automation" : "Create Automation"}
                    </DialogTitle>
                    <DialogDescription>
                        {isEditing
                            ? "Update your workflow automation"
                            : "Create a new automation to streamline your workflow"}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Automation Name</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="e.g., New Lead → Welcome Email"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="trigger_type"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>When this happens (Trigger)</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a trigger" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {TRIGGER_TYPES.map((trigger) => (
                                                <SelectItem
                                                    key={trigger.value}
                                                    value={trigger.value}
                                                >
                                                    {trigger.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="action_type"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Do this (Action)</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select an action" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {ACTION_TYPES.map((action) => (
                                                <SelectItem
                                                    key={action.value}
                                                    value={action.value}
                                                >
                                                    {action.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="is_active"
                            render={({ field }) => (
                                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                                    <div className="space-y-0.5">
                                        <FormLabel>Active</FormLabel>
                                        <p className="text-sm text-muted-foreground">
                                            Enable or disable this automation
                                        </p>
                                    </div>
                                    <FormControl>
                                        <Switch
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                {isEditing ? "Save Changes" : "Create Automation"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
