"use client";

import { useForm } from "react-hook-form";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useEmailTemplates, useActiveProfile } from "@/hooks/use-data";
import { toast } from "sonner";
import { Loader2, Send, Sparkles } from "lucide-react";
import { useState } from "react";

const formSchema = z.object({
    to: z.string().email("Invalid email address"),
    subject: z.string().min(1, "Subject is required"),
    body: z.string().min(1, "Message body is required"),
});

interface EmailComposerDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    defaultTo?: string;
    organizationId: string;
}

export function EmailComposerDialog({
    open,
    onOpenChange,
    defaultTo = "",
}: EmailComposerDialogProps) {
    const [isSending, setIsSending] = useState(false);
    const { data: templates } = useEmailTemplates();
    const { data: profile } = useActiveProfile();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            to: defaultTo,
            subject: "",
            body: "",
        },
    });

    const handleTemplateSelect = (templateId: string) => {
        const template = templates?.find((t) => t.id === templateId);
        if (template) {
            form.setValue("subject", template.subject);
            form.setValue("body", template.body_html.replace(/<[^>]*>?/gm, "")); // Simple HTML to text
        }
    };

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        setIsSending(true);
        // Simulate sending email
        await new Promise((resolve) => setTimeout(resolve, 1500));
        console.log("Sending email:", values);
        setIsSending(false);
        toast.success("Email sent successfully");
        onOpenChange(false);
        form.reset();
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Compose Email</DialogTitle>
                    <DialogDescription>
                        Send a new email or use a template.
                    </DialogDescription>
                </DialogHeader>

                <div className="mb-4">
                    <Label className="text-sm font-medium mb-2 block">Use Template</Label>
                    <Select onValueChange={handleTemplateSelect}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a template" />
                        </SelectTrigger>
                        <SelectContent>
                            {templates?.map((t) => (
                                <SelectItem key={t.id} value={t.id}>
                                    {t.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="to"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>To</FormLabel>
                                    <FormControl>
                                        <Input placeholder="recipient@example.com" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="subject"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Subject</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Email subject" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="body"
                            render={({ field }) => (
                                <FormItem>
                                    <div className="flex items-center justify-between">
                                        <FormLabel>Message</FormLabel>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 text-xs text-primary"
                                            onClick={async () => {
                                                const subject = form.getValues("subject");
                                                if (!subject) {
                                                    toast.error("Please enter a subject first");
                                                    return;
                                                }
                                                const toastId = toast.loading("AI is drafting your email...");
                                                // Simulate AI generation
                                                await new Promise(r => setTimeout(r, 2000));
                                                const draft = `Hi,\n\nI'm writing to you regarding "${subject}".\n\nI would like to discuss next steps and see how we can move forward with our proposal. Please let me know your availability for a brief call this week.\n\nBest regards,\n${profile?.full_name || 'The Team'}`;
                                                form.setValue("body", draft);
                                                toast.success("Draft generated!", { id: toastId });
                                            }}
                                        >
                                            <Sparkles className="mr-2 h-3 w-3" />
                                            Draft with AI
                                        </Button>
                                    </div>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Write your message here..."
                                            className="min-h-[200px]"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
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
                            <Button type="submit" disabled={isSending}>
                                {isSending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Sending...
                                    </>
                                ) : (
                                    <>
                                        <Send className="mr-2 h-4 w-4" />
                                        Send Email
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
