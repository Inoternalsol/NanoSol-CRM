"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Loader2, Phone, Server, Star } from "lucide-react";
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
import { useSaveSipAccount } from "@/hooks/use-settings";
import type { SIPProfile } from "@/types";

interface SipAccountDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    account?: SIPProfile | null;
    userId: string;
    orgId: string;
    onSuccess?: () => void;
}

interface SipFormData {
    name: string;
    display_name: string;
    sip_username: string;
    sip_password: string;
    sip_domain: string;
    ws_server: string;
    outbound_proxy: string;
    is_default: boolean;
}

export function SipAccountDialog({
    open,
    onOpenChange,
    account,
    userId,
    orgId,
    onSuccess
}: SipAccountDialogProps) {
    const { trigger: saveAccount, isMutating: isSaving } = useSaveSipAccount();
    const isEditing = !!account;

    const form = useForm<SipFormData>({
        defaultValues: {
            name: "",
            display_name: "",
            sip_username: "",
            sip_password: "",
            sip_domain: "",
            ws_server: "",
            outbound_proxy: "",
            is_default: false,
        }
    });

    useEffect(() => {
        if (account && open) {
            form.reset({
                name: account.name || "",
                display_name: account.display_name || "",
                sip_username: account.sip_username || "",
                sip_password: "", // Don't populate password
                sip_domain: account.sip_domain || "",
                ws_server: account.ws_server || account.websocket_server || "",
                outbound_proxy: account.outbound_proxy || "",
                is_default: account.is_default || false,
            });
        } else if (!account && open) {
            form.reset({
                name: "",
                display_name: "",
                sip_username: "",
                sip_password: "",
                sip_domain: "",
                ws_server: "",
                outbound_proxy: "",
                is_default: false,
            });
        }
    }, [account, open, form]);

    const onSubmit = async (data: SipFormData) => {
        try {
            const accountData: Partial<SIPProfile> = {
                name: data.name || "SIP Account",
                display_name: data.display_name,
                sip_username: data.sip_username,
                sip_domain: data.sip_domain,
                ws_server: data.ws_server || undefined,
                outbound_proxy: data.outbound_proxy || undefined,
                is_default: data.is_default,
                is_active: true,
            };

            // Only include password if provided (for updates, empty means keep existing)
            if (data.sip_password) {
                accountData.sip_password_encrypted = data.sip_password; // Will be encrypted by backend
            }

            await saveAccount({
                id: account?.id,
                userId,
                orgId,
                data: accountData
            });

            toast.success(isEditing ? "SIP account updated" : "SIP account added");
            onOpenChange(false);
            onSuccess?.();
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Failed to save account";
            toast.error(errorMessage);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Phone className="h-5 w-5" />
                        {isEditing ? "Edit SIP Account" : "Add SIP Account"}
                    </DialogTitle>
                    <DialogDescription>
                        Configure your SIP credentials for making and receiving calls.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Account Name</Label>
                            <Input
                                id="name"
                                {...form.register("name")}
                                placeholder="e.g. Work SIP, Personal Line"
                            />
                            <p className="text-xs text-muted-foreground">A friendly name to identify this account</p>
                        </div>

                        <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                            <div className="space-y-0.5">
                                <Label className="flex items-center gap-2">
                                    <Star className="h-4 w-4" />
                                    Set as Default
                                </Label>
                                <p className="text-xs text-muted-foreground">Use this account for outbound calls by default</p>
                            </div>
                            <Switch
                                checked={form.watch("is_default")}
                                onCheckedChange={(val) => form.setValue("is_default", val)}
                            />
                        </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                        <h4 className="text-sm font-semibold flex items-center gap-2">
                            <Server className="h-4 w-4" />
                            SIP Credentials
                        </h4>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="display_name">Display Name (Caller ID)</Label>
                                <Input
                                    id="display_name"
                                    {...form.register("display_name")}
                                    placeholder="John Doe"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="sip_username">SIP Username</Label>
                                <Input
                                    id="sip_username"
                                    {...form.register("sip_username")}
                                    placeholder="1001"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="sip_password">SIP Password</Label>
                                <Input
                                    id="sip_password"
                                    type="password"
                                    {...form.register("sip_password")}
                                    placeholder={isEditing ? "•••••••• (hidden)" : "Password"}
                                    required={!isEditing}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="sip_domain">SIP Domain</Label>
                                <Input
                                    id="sip_domain"
                                    {...form.register("sip_domain")}
                                    placeholder="sip.provider.com"
                                    required
                                />
                            </div>
                            <div className="space-y-2 sm:col-span-2">
                                <Label htmlFor="ws_server">WebSocket Server</Label>
                                <Input
                                    id="ws_server"
                                    {...form.register("ws_server")}
                                    placeholder="wss://sip.provider.com:8089/ws"
                                />
                                <p className="text-xs text-muted-foreground">Required for browser-based calling</p>
                            </div>
                            <div className="space-y-2 sm:col-span-2">
                                <Label htmlFor="outbound_proxy">Outbound Proxy (Optional)</Label>
                                <Input
                                    id="outbound_proxy"
                                    {...form.register("outbound_proxy")}
                                    placeholder="sip:proxy.provider.com:5060"
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isEditing ? "Update Account" : "Add Account"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
