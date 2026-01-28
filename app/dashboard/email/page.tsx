"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
    Mail,
    Send,
    Inbox,
    Archive,
    Trash2,
    Star,
    Plus,
    Search,
    MoreHorizontal,
    Paperclip,
    Clock,
    Loader2,
    Edit,
    Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useEmailTemplates, useDeleteEmailTemplate, useEmailSequences, useActiveProfile } from "@/hooks/use-data";
import { TemplateDialog } from "@/components/email/template-dialog";
import { EmailComposerDialog } from "@/components/email/email-composer-dialog";
import { SequenceDialog } from "@/components/email/sequence-dialog";
import type { EmailTemplate, EmailSequence } from "@/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Note: Email inbox would need IMAP/API integration - templates work with database

// Sample emails (inbox would need a separate integration - keeping mock for now)
const mockEmails = [
    {
        id: "1",
        from: { name: "John Smith", email: "john@acme.com", initials: "JS" },
        subject: "Re: Q1 Proposal - Ready for Review",
        preview:
            "Hi, I've reviewed the proposal and have a few questions about the pricing structure...",
        time: "10:30 AM",
        isRead: false,
        isStarred: true,
        hasAttachment: true,
        folder: "inbox",
    },
    {
        id: "2",
        from: { name: "Sarah Johnson", email: "sarah@techstart.io", initials: "SJ" },
        subject: "Demo Follow-up",
        preview:
            "Thank you for the demo yesterday. Our team was impressed with the features...",
        time: "Yesterday",
        isRead: true,
        isStarred: false,
        hasAttachment: false,
        folder: "inbox",
    },
    {
        id: "3",
        from: { name: "Michael Chen", email: "m.chen@globaltech.com", initials: "MC" },
        subject: "Contract Questions",
        preview:
            "I have a few questions regarding the contract terms we discussed last week...",
        time: "Yesterday",
        isRead: true,
        isStarred: false,
        hasAttachment: true,
        folder: "sent",
    },
    {
        id: "4",
        from: { name: "Emily Davis", email: "emily@innovate.co", initials: "ED" },
        subject: "Meeting Request",
        preview:
            "Would you be available for a call next week to discuss the pilot program?",
        time: "Jan 17",
        isRead: true,
        isStarred: true,
        hasAttachment: false,
        folder: "starred",
    },
];

type EmailFolder = "inbox" | "sent" | "starred" | "archive" | "trash";

export default function EmailPage() {
    const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
    const [composerOpen, setComposerOpen] = useState(false);
    const [sequenceOpen, setSequenceOpen] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
    const [selectedSequence, setSelectedSequence] = useState<EmailSequence | null>(null);
    const [activeFolder, setActiveFolder] = useState<EmailFolder>("inbox");
    const [isSyncing, setIsSyncing] = useState(false);

    const { data: templates = [], isLoading: templatesLoading, mutate: mutateTemplates } = useEmailTemplates();
    const { data: sequences = [], mutate: mutateSequences } = useEmailSequences();
    const { trigger: deleteTemplate } = useDeleteEmailTemplate();
    const { data: activeProfile } = useActiveProfile();

    const handleSync = () => {
        setIsSyncing(true);
        setTimeout(() => {
            setIsSyncing(false);
            toast.success("Inbox synced via IMAP");
        }, 3000);
    };

    const filteredEmails = mockEmails.filter((e) => {
        if (activeFolder === "starred") return e.isStarred;
        return e.folder === activeFolder;
    });

    const folderStats = {
        inbox: mockEmails.filter((e) => e.folder === "inbox").length,
        sent: mockEmails.filter((e) => e.folder === "sent").length,
        starred: mockEmails.filter((e) => e.isStarred).length,
        archive: mockEmails.filter((e) => e.folder === "archive").length,
        trash: mockEmails.filter((e) => e.folder === "trash").length,
    };

    const handleNewTemplate = () => {
        setSelectedTemplate(null);
        setTemplateDialogOpen(true);
    };

    const handleEditTemplate = (template: EmailTemplate) => {
        setSelectedTemplate(template);
        setTemplateDialogOpen(true);
    };

    const handleDeleteTemplate = async (id: string) => {
        try {
            await deleteTemplate(id);
            mutateTemplates();
            toast.success("Template deleted");
        } catch (error) {
            console.error("Delete failed:", error);
            toast.error("Failed to delete template");
        }
    };

    const handleDialogClose = (open: boolean) => {
        setTemplateDialogOpen(open);
        if (!open) {
            mutateTemplates();
        }
    };
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
        >
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Email</h1>
                    <p className="text-muted-foreground">
                        Manage emails and automated sequences
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" onClick={() => setSequenceOpen(true)}>
                        <Clock className="h-4 w-4 mr-2" />
                        Sequences
                    </Button>
                    <Button onClick={() => setComposerOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Compose
                    </Button>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-4">
                {/* Sidebar */}
                <Card className="lg:col-span-1">
                    <CardContent className="p-4">
                        <div className="space-y-1">
                            <Button
                                variant={activeFolder === "inbox" ? "secondary" : "ghost"}
                                className="w-full justify-start"
                                onClick={() => setActiveFolder("inbox")}
                            >
                                <Inbox className="h-4 w-4 mr-2" />
                                Inbox
                                {folderStats.inbox > 0 && (
                                    <Badge variant="default" className="ml-auto">
                                        {folderStats.inbox}
                                    </Badge>
                                )}
                            </Button>
                            <Button
                                variant={activeFolder === "sent" ? "secondary" : "ghost"}
                                className="w-full justify-start"
                                onClick={() => setActiveFolder("sent")}
                            >
                                <Send className="h-4 w-4 mr-2" />
                                Sent
                            </Button>
                            <Button
                                variant={activeFolder === "starred" ? "secondary" : "ghost"}
                                className="w-full justify-start"
                                onClick={() => setActiveFolder("starred")}
                            >
                                <Star className="h-4 w-4 mr-2" />
                                Starred
                            </Button>
                            <Button
                                variant={activeFolder === "archive" ? "secondary" : "ghost"}
                                className="w-full justify-start"
                                onClick={() => setActiveFolder("archive")}
                            >
                                <Archive className="h-4 w-4 mr-2" />
                                Archive
                            </Button>
                            <Button
                                variant={activeFolder === "trash" ? "secondary" : "ghost"}
                                className="w-full justify-start"
                                onClick={() => setActiveFolder("trash")}
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Trash
                            </Button>
                        </div>

                        <Separator className="my-4" />

                        <div>
                            <h4 className="text-sm font-semibold mb-2">Quick Stats</h4>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Sent Today</span>
                                    <span className="font-medium">24</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Open Rate</span>
                                    <span className="font-medium">45%</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Click Rate</span>
                                    <span className="font-medium">12%</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Main Content */}
                <div className="lg:col-span-3">
                    <Tabs defaultValue="inbox">
                        <TabsList className="mb-4">
                            <TabsTrigger value="inbox">Inbox</TabsTrigger>
                            <TabsTrigger value="sequences">Sequences</TabsTrigger>
                            <TabsTrigger value="templates">Templates</TabsTrigger>
                        </TabsList>

                        <TabsContent value="inbox">
                            <Card>
                                <CardHeader className="pb-3 border-b">
                                    <div className="flex flex-col sm:flex-row items-center gap-4">
                                        <div className="relative flex-1 w-full">
                                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                            <Input placeholder="Search emails..." className="pl-10" />
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleSync}
                                            disabled={isSyncing}
                                        >
                                            <motion.div
                                                animate={isSyncing ? { rotate: 360 } : {}}
                                                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                                            >
                                                <Zap className={cn("h-4 w-4 mr-2", isSyncing && "text-primary")} />
                                            </motion.div>
                                            {isSyncing ? "Syncing..." : "Sync Inbox"}
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0 relative">
                                    {isSyncing && (
                                        <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] z-10 flex items-center justify-center">
                                            <div className="flex flex-col items-center gap-2">
                                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                                <p className="text-sm font-medium">Connecting to IMAP...</p>
                                            </div>
                                        </div>
                                    )}
                                    <ScrollArea className="h-[500px]">
                                        {filteredEmails.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-24 text-center">
                                                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-4 opacity-50">
                                                    <Mail className="h-10 w-10 text-muted-foreground" />
                                                </div>
                                                <h3 className="text-lg font-semibold">No emails found</h3>
                                                <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-6">
                                                    It looks like your {activeFolder} is empty. Connect your IMAP server or check back later.
                                                </p>
                                                <Button variant="outline" onClick={handleSync}>
                                                    Try Syncing Again
                                                </Button>
                                            </div>
                                        ) : (
                                            filteredEmails.map((email, index) => (
                                                <div key={email.id}>
                                                    <div
                                                        className={`
                                                            flex items-start gap-4 p-4 cursor-pointer hover:bg-muted/50 transition-colors
                                                            ${!email.isRead ? "bg-primary/5" : ""}
                                                          `}
                                                    >
                                                        <Avatar>
                                                            <AvatarFallback>
                                                                {email.from.initials}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center justify-between mb-1">
                                                                <span
                                                                    className={`font-medium ${!email.isRead ? "text-foreground" : "text-muted-foreground"}`}
                                                                >
                                                                    {email.from.name}
                                                                </span>
                                                                <span className="text-xs text-muted-foreground">
                                                                    {email.time}
                                                                </span>
                                                            </div>
                                                            <p
                                                                className={`text-sm truncate ${!email.isRead ? "font-medium" : ""}`}
                                                            >
                                                                {email.subject}
                                                            </p>
                                                            <p className="text-sm text-muted-foreground truncate">
                                                                {email.preview}
                                                            </p>
                                                            <div className="flex items-center gap-2 mt-2">
                                                                {email.isStarred && (
                                                                    <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                                                                )}
                                                                {email.hasAttachment && (
                                                                    <Paperclip className="h-3 w-3 text-muted-foreground" />
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {index < filteredEmails.length - 1 && <Separator />}
                                                </div>
                                            ))
                                        )}
                                    </ScrollArea>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="sequences">
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <CardTitle>Email Sequences</CardTitle>
                                        <Button size="sm" onClick={() => {
                                            setSelectedSequence(null);
                                            setSequenceOpen(true);
                                        }}>
                                            <Plus className="h-4 w-4 mr-2" />
                                            New Sequence
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {sequences.map((sequence) => (
                                        <div
                                            key={sequence.id}
                                            className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                                                    <Mail className="h-5 w-5 text-primary" />
                                                </div>
                                                <div>
                                                    <p className="font-medium">{sequence.name}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {sequence.enrolled_count || 0} enrolled
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="text-right">
                                                    <p className="text-sm font-medium">
                                                        {sequence.open_rate || 0}%
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Open Rate
                                                    </p>
                                                </div>
                                                <Badge
                                                    variant={
                                                        sequence.is_active
                                                            ? "default"
                                                            : "secondary"
                                                    }
                                                >
                                                    {sequence.is_active ? "active" : "paused"}
                                                </Badge>
                                                <Button variant="ghost" size="icon">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="templates">
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <CardTitle>Email Templates</CardTitle>
                                        <Button size="sm" onClick={handleNewTemplate}>
                                            <Plus className="h-4 w-4 mr-2" />
                                            New Template
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {templatesLoading ? (
                                        <div className="flex items-center justify-center py-8">
                                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                        </div>
                                    ) : templates.length === 0 ? (
                                        <div className="text-center py-8 text-muted-foreground">
                                            <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                            <p>No templates yet</p>
                                            <p className="text-sm">Create your first email template</p>
                                        </div>
                                    ) : (
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            {templates.map((template) => (
                                                <div
                                                    key={template.id}
                                                    className="p-4 rounded-lg border hover:bg-muted/50 transition-colors group"
                                                >
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                                                                <Mail className="h-5 w-5 text-muted-foreground" />
                                                            </div>
                                                            <div>
                                                                <p className="font-medium">{template.name}</p>
                                                                <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                                                                    {template.subject}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8"
                                                                onClick={() => handleEditTemplate(template)}
                                                            >
                                                                <Edit className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-destructive"
                                                                onClick={() => handleDeleteTemplate(template.id)}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>

            <TemplateDialog
                open={templateDialogOpen}
                onOpenChange={handleDialogClose}
                template={selectedTemplate}
                organizationId={activeProfile?.organization_id || ""}
            />

            <EmailComposerDialog
                open={composerOpen}
                onOpenChange={setComposerOpen}
                organizationId={activeProfile?.organization_id || ""}
            />

            <SequenceDialog
                open={sequenceOpen}
                onOpenChange={setSequenceOpen}
                sequence={selectedSequence}
                organizationId={activeProfile?.organization_id || ""}
                onSuccess={() => mutateSequences()}
            />
        </motion.div>
    );
}
