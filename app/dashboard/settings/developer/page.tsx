"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Plus, Trash2, Key, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface ApiKey {
    id: string;
    label: string;
    key_prefix: string;
    scopes: string[];
    last_used_at: string | null;
    created_at: string;
}

export default function DeveloperSettingsPage() {
    const supabase = createClient();
    const [keys, setKeys] = useState<ApiKey[]>([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [newLabel, setNewLabel] = useState("");
    const [generatedKey, setGeneratedKey] = useState<string | null>(null);

    useEffect(() => {
        fetchKeys();
    }, []);

    const fetchKeys = async () => {
        try {
            const { data, error } = await supabase
                .from("organization_api_keys")
                .select("*")
                .order("created_at", { ascending: false });

            if (error) throw error;
            setKeys(data || []);
        } catch (error) {
            console.error("Error fetching keys:", error);
            toast.error("Failed to load API keys");
        } finally {
            setLoading(false);
        }
    };

    const createKey = async () => {
        if (!newLabel) return;

        try {
            const res = await fetch("/api/settings/api-keys", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ label: newLabel })
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || "Failed to create key");

            setGeneratedKey(data.apiKey);
            // Refresh list
            fetchKeys();
            toast.success("API Key generated");
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const deleteKey = async (id: string) => {
        if (!confirm("Are you sure? This will immediately revoke access for this key.")) return;
        try {
            const res = await fetch(`/api/settings/api-keys?id=${id}`, {
                method: "DELETE"
            });
            if (!res.ok) throw new Error("Failed to revoke");

            setKeys(keys.filter((k) => k.id !== id));
            toast.success("API Key revoked");
        } catch (error) {
            toast.error("Failed to revoke key");
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success("Copied to clipboard");
    };

    return (
        <div className="space-y-6 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Developer Settings</h2>
                    <p className="text-muted-foreground">
                        Manage API keys for external access to your CRM.
                    </p>
                </div>
                <Dialog open={open} onOpenChange={(v) => {
                    if (!v) setGeneratedKey(null); // Reset on close
                    setOpen(v);
                }}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" /> Generate Key
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Generate API Key</DialogTitle>
                            <DialogDescription>
                                Create a new key for your application.
                            </DialogDescription>
                        </DialogHeader>

                        {!generatedKey ? (
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="label">Key Label</Label>
                                    <Input
                                        id="label"
                                        value={newLabel}
                                        onChange={(e) => setNewLabel(e.target.value)}
                                        placeholder="e.g. Zapier Integration"
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="py-4 space-y-4">
                                <div className="bg-yellow-500/10 text-yellow-500 p-3 rounded-md border border-yellow-500/20 flex items-start gap-2">
                                    <ShieldAlert className="h-5 w-5 mt-0.5" />
                                    <div className="text-sm">
                                        <p className="font-bold">Save this key now!</p>
                                        <p>We won't show it again. If you lose it, you'll need to generate a new one.</p>
                                    </div>
                                </div>
                                <div className="relative">
                                    <Input value={generatedKey} readOnly className="font-mono pr-10" />
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="absolute right-0 top-0 h-10 w-10 hover:bg-transparent"
                                        onClick={() => copyToClipboard(generatedKey)}
                                    >
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        )}

                        <DialogFooter>
                            {!generatedKey ? (
                                <>
                                    <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                                    <Button onClick={createKey} disabled={!newLabel}>Generate</Button>
                                </>
                            ) : (
                                <Button onClick={() => setOpen(false)}>Done</Button>
                            )}
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="space-y-4">
                {keys.map((key) => (
                    <Card key={key.id}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 py-4">
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                    <Key className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium">{key.label}</span>
                                    {key.scopes.map(scope => (
                                        <Badge key={scope} variant="secondary" className="text-[10px]">{scope}</Badge>
                                    ))}
                                </div>
                                <div className="text-xs text-muted-foreground font-mono">
                                    Prefix: {key.key_prefix}•••••
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-xs text-muted-foreground text-right">
                                    <p>Created: {new Date(key.created_at).toLocaleDateString()}</p>
                                    <p>Last Used: {key.last_used_at ? new Date(key.last_used_at).toLocaleDateString() : 'Never'}</p>
                                </div>
                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => deleteKey(key.id)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardHeader>
                    </Card>
                ))}
                {!loading && keys.length === 0 && (
                    <div className="text-center text-muted-foreground py-10 border rounded-lg border-dashed">
                        <p>No active API keys.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
