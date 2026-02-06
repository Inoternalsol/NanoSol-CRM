"use client";

import { useEffect } from "react";
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
    FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useSaveEmailAccount } from "@/hooks/use-email";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { EmailAccount } from "@/types";

const accountFormSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(1, "Account name is required"),
    from_name: z.string().optional(),
    email_addr: z.string().email("Invalid email address"),
    smtp_host: z.string().min(1, "SMTP host is required"),
    smtp_port: z.coerce.number().default(587),
    smtp_user: z.string().min(1, "SMTP username is required"),
    smtp_pass: z.string().optional(),
    imap_host: z.string().optional(),
    imap_port: z.coerce.number().default(993),
    imap_user: z.string().optional(),
    imap_pass: z.string().optional(),
    is_org_wide: z.boolean().default(false),
});

interface AccountDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    account?: EmailAccount | null;
    organizationId: string;
}

export function AccountDialog({
    open,
    onOpenChange,
    account,
    organizationId,
}: AccountDialogProps) {
    const { trigger: saveAccount, isMutating: isSaving } = useSaveEmailAccount();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const form = useForm<any>({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolver: zodResolver(accountFormSchema) as any,
        defaultValues: {
            id: account?.id,
            name: account?.name || "",
            from_name: account?.from_name || "",
            email_addr: account?.email_addr || "",
            smtp_host: account?.smtp_host || "",
            smtp_port: account?.smtp_port || 587,
            smtp_user: account?.smtp_user || "",
            smtp_pass: "",
            imap_host: account?.imap_host || "imap.gmail.com",
            imap_port: account?.imap_port || 993,
            imap_user: account?.imap_user || "",
            imap_pass: "",
            is_org_wide: account?.is_org_wide || false,
        },
    });

    // Reset form when account changes
    useEffect(() => {
        if (open) {
            form.reset({
                id: account?.id,
                name: account?.name || "",
                from_name: account?.from_name || "",
                email_addr: account?.email_addr || "",
                smtp_host: account?.smtp_host || "",
                smtp_port: account?.smtp_port || 587,
                smtp_user: account?.smtp_user || "",
                smtp_pass: "",
                imap_host: account?.imap_host || "imap.gmail.com",
                imap_port: account?.imap_port || 993,
                imap_user: account?.imap_user || "",
                imap_pass: "",
                is_org_wide: account?.is_org_wide || false,
            });
        }
    }, [account, open, form]);

    const onSubmit = async (values: z.infer<typeof accountFormSchema>) => {
        try {
            await saveAccount({ ...values, organization_id: organizationId });
            toast.success("Account saved successfully");
            onOpenChange(false);
            if (!account) form.reset();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to save account");
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{account ? "Edit Account" : "Add Email Account"}</DialogTitle>
                    <DialogDescription>
                        Configure your SMTP and IMAP settings. Use App Passwords for Gmail/Outlook.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Account Label</FormLabel>
                                        <FormControl>
                                            <Input id="name" placeholder="Work, Personal, etc." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="from_name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Sender Name</FormLabel>
                                        <FormControl>
                                            <Input id="from_name" placeholder="John Doe" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <FormField
                            control={form.control}
                            name="email_addr"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email Address</FormLabel>
                                    <FormControl>
                                        <Input id="email_addr" placeholder="you@example.com" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="space-y-4 border p-4 rounded-lg bg-muted/30">
                            <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Outgoing (SMTP)</h4>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="col-span-2">
                                    <FormField
                                        control={form.control}
                                        name="smtp_host"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Host</FormLabel>
                                                <FormControl>
                                                    <Input id="smtp_host" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <FormField
                                    control={form.control}
                                    name="smtp_port"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Port</FormLabel>
                                            <FormControl>
                                                <Input id="smtp_port" type="number" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="smtp_user"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Username</FormLabel>
                                            <FormControl>
                                                <Input id="smtp_user" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="smtp_pass"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Password {account && "(Leave blank to keep current)"}</FormLabel>
                                            <FormControl>
                                                <Input id="smtp_pass" type="password" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        <div className="space-y-4 border p-4 rounded-lg bg-muted/30">
                            <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Incoming (IMAP)</h4>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="col-span-2">
                                    <FormField
                                        control={form.control}
                                        name="imap_host"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Host</FormLabel>
                                                <FormControl>
                                                    <Input id="imap_host" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <FormField
                                    control={form.control}
                                    name="imap_port"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Port</FormLabel>
                                            <FormControl>
                                                <Input id="imap_port" type="number" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="imap_user"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Username</FormLabel>
                                            <FormControl>
                                                <Input id="imap_user" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="imap_pass"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Password {account && "(Leave blank)"}</FormLabel>
                                            <FormControl>
                                                <Input id="imap_pass" type="password" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        <FormField
                            control={form.control}
                            name="is_org_wide"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 mt-6">
                                    <div className="space-y-0.5">
                                        <FormLabel className="text-base font-medium">Shared Organization Account</FormLabel>
                                        <FormDescription>
                                            If enabled, all agents in your organization can use this account to send emails.
                                        </FormDescription>
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
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSaving}>
                                {isSaving ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    "Save Account"
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
