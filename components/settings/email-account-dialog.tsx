"use client";

import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Loader2, Mail, Server, Shield } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useSaveEmailAccount } from "@/hooks/use-email";
import type { SMTPConfig } from "@/types";
import { useEffect } from "react";

interface EmailAccountDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    account?: SMTPConfig | null;
    orgId: string;
}

export function EmailAccountDialog({
    open,
    onOpenChange,
    account,
    orgId
}: EmailAccountDialogProps) {
    const { trigger: saveAccount, isMutating: isSaving } = useSaveEmailAccount();

    const form = useForm({
        defaultValues: {
            name: "",
            smtp_host: "",
            smtp_port: 587,
            smtp_user: "",
            smtp_pass: "",
            from_name: "",
            email_addr: "",
            imap_host: "",
            imap_port: 993,
            imap_user: "",
            imap_pass: "",
            is_org_wide: false,
            use_tls: true,
        }
    });

    useEffect(() => {
        if (account && open) {
            form.reset({
                name: account.name || "",
                smtp_host: account.smtp_host,
                smtp_port: account.smtp_port,
                smtp_user: account.smtp_user,
                smtp_pass: "", // Don't populate password
                from_name: account.from_name || "",
                email_addr: account.email_addr,
                imap_host: account.imap_host || "",
                imap_port: account.imap_port || 993,
                imap_user: account.imap_user || "",
                imap_pass: "", // Don't populate password
                is_org_wide: account.is_org_wide,
                use_tls: account.use_tls,
            });
        } else if (!account && open) {
            form.reset({
                name: "",
                smtp_host: "",
                smtp_port: 587,
                smtp_user: "",
                smtp_pass: "",
                from_name: "",
                email_addr: "",
                imap_host: "",
                imap_port: 993,
                imap_user: "",
                imap_pass: "",
                is_org_wide: false,
                use_tls: true,
            });
        }
    }, [account, open, form]);

    const onSubmit = async (data: any) => {
        try {
            await saveAccount({
                id: account?.id,
                orgId,
                ...data
            });
            toast.success(account ? "Account updated successfully" : "Account added successfully");
            onOpenChange(false);
        } catch (error: any) {
            toast.error(error.message || "Failed to save account");
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Mail className="h-5 w-5" />
                        {account ? "Edit Email Account" : "Add Email Account"}
                    </DialogTitle>
                    <DialogDescription>
                        Configure your SMTP and IMAP settings for sending and receiving emails.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2 sm:col-span-2">
                            <Label htmlFor="name">Account Display Name</Label>
                            <Input id="name" {...form.register("name")} placeholder="e.g. Support Inbox, Personal Gmail" required />
                        </div>

                        <div className="flex items-center justify-between sm:col-span-2 p-3 rounded-lg border bg-muted/30">
                            <div className="space-y-0.5">
                                <Label>Organization Wide</Label>
                                <p className="text-xs text-muted-foreground">Allow all authorized users in the organization to use this account.</p>
                            </div>
                            <Switch
                                checked={form.watch("is_org_wide")}
                                onCheckedChange={(val) => form.setValue("is_org_wide", val)}
                            />
                        </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                        <h4 className="text-sm font-semibold flex items-center gap-2">
                            <Server className="h-4 w-4" />
                            SMTP Settings (Sending)
                        </h4>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="smtp_host">SMTP Host</Label>
                                <Input id="smtp_host" {...form.register("smtp_host")} placeholder="smtp.gmail.com" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="smtp_port">SMTP Port</Label>
                                <Input id="smtp_port" type="number" {...form.register("smtp_port", { valueAsNumber: true })} placeholder="587" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="smtp_user">SMTP Username</Label>
                                <Input id="smtp_user" {...form.register("smtp_user")} placeholder="user@example.com" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="smtp_pass">SMTP Password</Label>
                                <Input id="smtp_pass" type="password" {...form.register("smtp_pass")} placeholder={account ? "•••••••• (hidden)" : "Password"} required={!account} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="from_name">From Name</Label>
                                <Input id="from_name" {...form.register("from_name")} placeholder="John Doe" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email_addr">From Email</Label>
                                <Input id="email_addr" type="email" {...form.register("email_addr")} placeholder="john@example.com" required />
                            </div>
                        </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                        <h4 className="text-sm font-semibold flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            IMAP Settings (Receiving - Optional)
                        </h4>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="imap_host">IMAP Host</Label>
                                <Input id="imap_host" {...form.register("imap_host")} placeholder="imap.gmail.com" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="imap_port">IMAP Port</Label>
                                <Input id="imap_port" type="number" {...form.register("imap_port", { valueAsNumber: true })} placeholder="993" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="imap_user">IMAP Username</Label>
                                <Input id="imap_user" {...form.register("imap_user")} placeholder="user@example.com" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="imap_pass">IMAP Password</Label>
                                <Input id="imap_pass" type="password" {...form.register("imap_pass")} placeholder={account ? "•••••••• (hidden)" : "Password"} />
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {account ? "Update Account" : "Add Account"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
