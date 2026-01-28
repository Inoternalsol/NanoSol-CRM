"use client";

import { motion } from "framer-motion";
import {
    User,
    Building2,
    Palette,
    Mail,
    Phone,
    Shield,
    Bell,
    Database,
    Key,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useActiveProfile, useUpdateProfile, useOrganization, useUpdateOrganization, useSipProfile, useUpdateSipProfile, useSmtpConfig, useUpdateSmtpConfig, useApiKeys, useUpdateApiKeys } from "@/hooks/use-data";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useEffect } from "react";
import type { Profile, Organization, SIPProfile, SMTPConfig, APIKeys, AIProvider } from "@/types";

export default function SettingsPage() {
    const { data: profile, isLoading: profileLoading } = useActiveProfile();
    const { data: org, isLoading: orgLoading } = useOrganization(profile?.organization_id || null);
    const { data: sip, isLoading: sipLoading } = useSipProfile(profile?.id || null);
    const { data: smtp, isLoading: smtpLoading } = useSmtpConfig(profile?.organization_id || null);
    const { data: apiKeys, isLoading: apiKeysLoading } = useApiKeys(profile?.organization_id || null);

    const { trigger: updateProfile, isMutating: isUpdatingProfile } = useUpdateProfile();
    const { trigger: updateOrg, isMutating: isUpdatingOrg } = useUpdateOrganization();
    const { trigger: updateSip, isMutating: isUpdatingSip } = useUpdateSipProfile();
    const { trigger: updateSmtp, isMutating: isUpdatingSmtp } = useUpdateSmtpConfig();
    const { trigger: updateApiKeys, isMutating: isUpdatingApiKeys } = useUpdateApiKeys();

    const router = useRouter();
    const isAdmin = profile?.role === "admin" || profile?.role === "manager";

    // Profile Form
    const profileForm = useForm({
        defaultValues: {
            full_name: profile?.full_name || "",
            phone: profile?.phone || "",
        }
    });

    // Organization Form
    const orgForm = useForm({
        defaultValues: {
            name: org?.name || "",
            slug: org?.slug || "",
            primary_color: org?.primary_color || "#3b82f6",
            logo_url: org?.logo_url || "",
        }
    });

    // SIP Form
    const sipForm = useForm({
        defaultValues: {
            display_name: sip?.display_name || "",
            sip_username: sip?.sip_username || "",
            sip_password: "", // Handled separately/hidden
            sip_domain: sip?.sip_domain || "",
            outbound_proxy: sip?.outbound_proxy || "",
            ws_server: sip?.ws_server || "",
        }
    });

    // SMTP Form
    const smtpForm = useForm({
        defaultValues: {
            host: smtp?.host || "",
            port: smtp?.port || 587,
            username: smtp?.username || "",
            password: "",
            from_name: smtp?.from_name || "",
            from_email: smtp?.from_email || "",
        }
    });

    // API Keys Form
    const apiKeysForm = useForm({
        defaultValues: {
            openai_key: "",
            gemini_key: "",
            qwen_key: "",
            kimi_key: "",
            active_provider: (apiKeys?.active_provider || "openai") as AIProvider,
        }
    });

    // Sync forms when data loads
    useEffect(() => {
        if (profile) profileForm.reset({ full_name: profile.full_name, phone: profile.phone });
    }, [profile, profileForm]);

    useEffect(() => {
        if (org) orgForm.reset({ name: org.name, slug: org.slug, primary_color: org.primary_color, logo_url: org.logo_url });
    }, [org, orgForm]);

    useEffect(() => {
        if (sip) sipForm.reset({
            display_name: sip.display_name,
            sip_username: sip.sip_username,
            sip_domain: sip.sip_domain,
            outbound_proxy: sip.outbound_proxy || ""
        });
    }, [sip, sipForm]);

    useEffect(() => {
        if (smtp) smtpForm.reset({
            host: smtp.host,
            port: smtp.port,
            username: smtp.username,
            from_name: smtp.from_name || "",
            from_email: smtp.from_email || ""
        });
    }, [smtp, smtpForm]);

    useEffect(() => {
        if (apiKeys) apiKeysForm.reset({
            active_provider: apiKeys.active_provider || "openai",
            // Note: We don't populate the keys since they're encrypted; user must re-enter to update
        });
    }, [apiKeys, apiKeysForm]);


    if (profileLoading || orgLoading || sipLoading || smtpLoading || apiKeysLoading) {
        return (
            <div className="flex h-[400px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }


    if (!profile) {
        return (
            <div className="flex flex-col items-center justify-center h-[400px] space-y-4">
                <p className="text-muted-foreground">Profile not found. Please log in again.</p>
                <Button onClick={() => router.push("/login")}>Go to Login</Button>
            </div>
        );
    }

    const onProfileSubmit = async (data: Partial<Profile>) => {
        try {
            await updateProfile({ id: profile.id, updates: data });
            toast.success("Profile updated successfully");
        } catch {
            toast.error("Failed to update profile");
        }
    };

    const onOrgSubmit = async (data: Partial<Organization>) => {
        try {
            await updateOrg({ id: org?.id || "", updates: data });
            toast.success("Organization updated successfully");
        } catch {
            toast.error("Failed to update organization");
        }
    };

    const onSipSubmit = async (data: Partial<SIPProfile>) => {
        try {
            await updateSip({ userId: profile.id, orgId: profile.organization_id, updates: data });
            toast.success("SIP settings updated successfully");
        } catch {
            toast.error("Failed to update SIP settings");
        }
    };

    const onSmtpSubmit = async (data: Partial<SMTPConfig> & { password?: string }) => {
        try {
            const { password, ...rest } = data;
            const updates: Partial<SMTPConfig> = { ...rest };

            // Handle password field mapping
            if (password) {
                updates.password_encrypted = password;
            }

            await updateSmtp({ orgId: profile.organization_id, updates });
            toast.success("SMTP settings updated successfully");
            // Clear password field after successful save
            smtpForm.setValue("password", "");
        } catch {
            toast.error("Failed to update SMTP settings");
        }
    };

    const onApiKeysSubmit = async (data: { openai_key: string; gemini_key: string; qwen_key: string; kimi_key: string; active_provider: AIProvider }) => {
        try {
            const updates: Partial<APIKeys> = {
                active_provider: data.active_provider,
            };
            // Only include keys that were entered (non-empty)
            if (data.openai_key) updates.openai_key_encrypted = data.openai_key;
            if (data.gemini_key) updates.gemini_key_encrypted = data.gemini_key;
            if (data.qwen_key) updates.qwen_key_encrypted = data.qwen_key;
            if (data.kimi_key) updates.kimi_key_encrypted = data.kimi_key;

            await updateApiKeys({ orgId: profile.organization_id, updates });
            toast.success("API keys saved successfully");
            apiKeysForm.reset({ openai_key: "", gemini_key: "", qwen_key: "", kimi_key: "", active_provider: data.active_provider });
        } catch {
            toast.error("Failed to save API keys");
        }
    };


    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
        >
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                <p className="text-muted-foreground">
                    Manage your account and organization settings
                </p>
            </div>

            <Tabs defaultValue="profile" className="space-y-6">
                <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5">
                    <TabsTrigger value="profile">Profile</TabsTrigger>
                    {isAdmin && <TabsTrigger value="organization">Organization</TabsTrigger>}
                    <TabsTrigger value="integrations">Integrations</TabsTrigger>
                    <TabsTrigger value="notifications">Notifications</TabsTrigger>
                    <TabsTrigger value="security">Security</TabsTrigger>
                </TabsList>

                {/* Profile Settings */}
                <TabsContent value="profile">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <User className="h-5 w-5" />
                                Profile Settings
                            </CardTitle>
                            <CardDescription>
                                Manage your personal information and preferences
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="full_name">Full Name</Label>
                                        <Input id="full_name" {...profileForm.register("full_name")} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email</Label>
                                        <Input id="email" type="email" value={profile.email} disabled />
                                        <p className="text-xs text-muted-foreground">Email cannot be changed.</p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="phone">Phone</Label>
                                        <Input id="phone" type="tel" {...profileForm.register("phone")} />
                                    </div>
                                </div>
                                <Button type="submit" disabled={isUpdatingProfile}>
                                    {isUpdatingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Save Changes
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Organization Settings - Admin Only */}
                {isAdmin && (
                    <TabsContent value="organization">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Building2 className="h-5 w-5" />
                                    Organization Settings
                                </CardTitle>
                                <CardDescription>
                                    Configure your organization&apos;s branding and preferences
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <form onSubmit={orgForm.handleSubmit(onOrgSubmit)} className="space-y-6">
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="name">Organization Name</Label>
                                            <Input id="name" {...orgForm.register("name")} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="slug">Subdomain</Label>
                                            <div className="flex">
                                                <Input id="slug" {...orgForm.register("slug")} className="rounded-r-none" />
                                                <span className="flex items-center px-3 bg-muted border border-l-0 rounded-r-md text-sm text-muted-foreground">
                                                    .nanosol.app
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <Separator />

                                    <div>
                                        <h4 className="font-medium mb-4 flex items-center gap-2">
                                            <Palette className="h-4 w-4" />
                                            Branding
                                        </h4>
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <div className="space-y-2">
                                                <Label htmlFor="primary_color">Primary Color</Label>
                                                <div className="flex gap-2">
                                                    <Input id="primary_color" {...orgForm.register("primary_color")} />
                                                    <div className="w-10 h-10 rounded-md border" style={{ backgroundColor: orgForm.watch("primary_color") }} />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="logo_url">Logo URL</Label>
                                                <Input id="logo_url" {...orgForm.register("logo_url")} placeholder="https://..." />
                                            </div>
                                        </div>
                                    </div>

                                    <Button type="submit" disabled={isUpdatingOrg}>
                                        {isUpdatingOrg && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Save Organization
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </TabsContent>
                )}

                {/* Integrations */}
                <TabsContent value="integrations">
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Phone className="h-5 w-5" />
                                    SIP Configuration
                                </CardTitle>
                                <CardDescription>
                                    Configure your SIP credentials for making calls
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <form onSubmit={sipForm.handleSubmit(onSipSubmit)} className="space-y-4">
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="display_name">Display Name</Label>
                                            <Input id="display_name" {...sipForm.register("display_name")} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="sip_username">SIP Username</Label>
                                            <Input id="sip_username" {...sipForm.register("sip_username")} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="sip_password">SIP Password</Label>
                                            <Input id="sip_password" type="password" {...sipForm.register("sip_password")} placeholder="••••••••" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="sip_domain">SIP Domain</Label>
                                            <Input id="sip_domain" {...sipForm.register("sip_domain")} placeholder="sip.provider.com" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="ws_server">WebSocket Server URL</Label>
                                            <Input id="ws_server" {...sipForm.register("ws_server")} placeholder="wss://sip.provider.com:8089/ws" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="outbound_proxy">Outbound Proxy (optional)</Label>
                                            <Input id="outbound_proxy" {...sipForm.register("outbound_proxy")} />
                                        </div>
                                    </div>
                                    <Button type="submit" disabled={isUpdatingSip}>
                                        {isUpdatingSip && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Save SIP Settings
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>

                        {isAdmin && (
                            <>
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Mail className="h-5 w-5" />
                                            SMTP Configuration
                                        </CardTitle>
                                        <CardDescription>
                                            Configure your email sending settings
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <form onSubmit={smtpForm.handleSubmit(onSmtpSubmit)} className="space-y-4">
                                            <div className="grid gap-4 sm:grid-cols-2">
                                                <div className="space-y-2">
                                                    <Label htmlFor="host">SMTP Host</Label>
                                                    <Input id="host" {...smtpForm.register("host")} placeholder="smtp.provider.com" />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="port">SMTP Port</Label>
                                                    <Input id="port" {...smtpForm.register("port", { valueAsNumber: true })} placeholder="587" />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="username">Username</Label>
                                                    <Input id="username" {...smtpForm.register("username")} placeholder="your-email@domain.com" />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="password">Password</Label>
                                                    <Input id="password" type="password" {...smtpForm.register("password")} placeholder="••••••••" />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="from_name">From Name</Label>
                                                    <Input id="from_name" {...smtpForm.register("from_name")} placeholder="Your Name" />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="from_email">From Email</Label>
                                                    <Input id="from_email" {...smtpForm.register("from_email")} placeholder="no-reply@domain.com" />
                                                </div>
                                            </div>
                                            <Button type="submit" disabled={isUpdatingSmtp}>
                                                {isUpdatingSmtp && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                Save SMTP Settings
                                            </Button>
                                        </form>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Key className="h-5 w-5" />
                                            API Keys
                                        </CardTitle>
                                        <CardDescription>
                                            Manage your API keys for AI-powered features. Keys are securely stored.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <form onSubmit={apiKeysForm.handleSubmit(onApiKeysSubmit)} className="space-y-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="active_provider">Active AI Provider</Label>
                                                <select
                                                    id="active_provider"
                                                    {...apiKeysForm.register("active_provider")}
                                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    <option value="openai">OpenAI (GPT-4)</option>
                                                    <option value="gemini">Google Gemini</option>
                                                    <option value="qwen">Alibaba QWEN</option>
                                                    <option value="kimi">Moonshot KIMI</option>
                                                </select>
                                            </div>
                                            <Separator />
                                            <div className="grid gap-4 sm:grid-cols-2">
                                                <div className="space-y-2">
                                                    <Label htmlFor="openai_key">OpenAI API Key</Label>
                                                    <Input id="openai_key" type="password" {...apiKeysForm.register("openai_key")} placeholder="sk-..." />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="gemini_key">Gemini API Key</Label>
                                                    <Input id="gemini_key" type="password" {...apiKeysForm.register("gemini_key")} placeholder="AIza..." />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="qwen_key">QWEN API Key</Label>
                                                    <Input id="qwen_key" type="password" {...apiKeysForm.register("qwen_key")} placeholder="qwen-..." />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="kimi_key">KIMI API Key</Label>
                                                    <Input id="kimi_key" type="password" {...apiKeysForm.register("kimi_key")} placeholder="kimi-..." />
                                                </div>
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                Only enter keys you wish to update. Leave fields empty to keep existing keys.
                                            </p>
                                            <Button type="submit" disabled={isUpdatingApiKeys}>
                                                {isUpdatingApiKeys && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                Save API Keys
                                            </Button>
                                        </form>
                                    </CardContent>
                                </Card>

                            </>
                        )}
                    </div>
                </TabsContent>

                {/* Notifications */}
                <TabsContent value="notifications">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Bell className="h-5 w-5" />
                                Notification Preferences
                            </CardTitle>
                            <CardDescription>
                                Choose what notifications you want to receive
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-medium">Email Notifications</p>
                                        <p className="text-sm text-muted-foreground">
                                            Receive email updates for important events
                                        </p>
                                    </div>
                                    <Switch defaultChecked />
                                </div>
                                <Separator />
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-medium">New Lead Alerts</p>
                                        <p className="text-sm text-muted-foreground">
                                            Get notified when new leads are created
                                        </p>
                                    </div>
                                    <Switch defaultChecked />
                                </div>
                                <Separator />
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-medium">Deal Updates</p>
                                        <p className="text-sm text-muted-foreground">
                                            Notifications for deal stage changes
                                        </p>
                                    </div>
                                    <Switch defaultChecked />
                                </div>
                                <Separator />
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-medium">Task Reminders</p>
                                        <p className="text-sm text-muted-foreground">
                                            Reminders for upcoming and overdue tasks
                                        </p>
                                    </div>
                                    <Switch defaultChecked />
                                </div>
                                <Separator />
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-medium">Missed Call Alerts</p>
                                        <p className="text-sm text-muted-foreground">
                                            Get notified about missed incoming calls
                                        </p>
                                    </div>
                                    <Switch />
                                </div>
                            </div>
                            <Button onClick={() => toast.success("Notification preferences saved")}>
                                Save Preferences
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Security */}
                <TabsContent value="security">
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Shield className="h-5 w-5" />
                                    Security Settings
                                </CardTitle>
                                <CardDescription>
                                    Manage your account security
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="currentPass">Current Password</Label>
                                        <Input id="currentPass" type="password" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="newPass">New Password</Label>
                                        <Input id="newPass" type="password" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="confirmPass">Confirm New Password</Label>
                                        <Input id="confirmPass" type="password" />
                                    </div>
                                </div>
                                <Button onClick={() => toast.success("Password update feature coming soon")}>
                                    Update Password
                                </Button>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Database className="h-5 w-5" />
                                    Data Management
                                </CardTitle>
                                <CardDescription>
                                    Export or delete your data
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between p-4 rounded-lg border">
                                    <div>
                                        <p className="font-medium">Export All Data</p>
                                        <p className="text-sm text-muted-foreground">
                                            Download all your CRM data as JSON/CSV
                                        </p>
                                    </div>
                                    <Button variant="outline">Export</Button>
                                </div>
                                <div className="flex items-center justify-between p-4 rounded-lg border border-destructive/50">
                                    <div>
                                        <p className="font-medium text-destructive">Delete Account</p>
                                        <p className="text-sm text-muted-foreground">
                                            Permanently delete your account and all data
                                        </p>
                                    </div>
                                    <Button variant="destructive">Delete</Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </motion.div>
    );
}
