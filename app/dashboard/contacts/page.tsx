"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
    Plus,
    Search,
    MoreHorizontal,
    Mail,
    Phone,
    Building2,
    Download,
    Upload,
    Loader2,
    Trash2,
    Settings2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { SequenceEnrollmentDialog } from "@/components/email/sequence-enrollment-dialog";
import { useContacts, useDeleteContact, useUpdateContact, useProfiles, useActiveProfile } from "@/hooks/use-data";
import { ContactDialog } from "@/components/contacts/contact-dialog";
import { ContactFilters, type ContactFilterValues } from "@/components/contacts/contact-filters";
import { ImportDialog } from "@/components/contacts/import-dialog";
import { StatusManagementDialog } from "@/components/contacts/status-management-dialog";
import type { Contact } from "@/types";
import { SipService } from "@/lib/services/sip-service";
import { useDialerStore } from "@/lib/stores";
import { UserCheck, Play } from "lucide-react";

// Organization ID from authenticated profile

function getInitials(firstName: string, lastName?: string | null) {
    return `${firstName[0]}${lastName?.[0] || ""}`.toUpperCase();
}

function getScoreColor(score: number) {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    return "text-red-500";
}

export default function ContactsPage() {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [importDialogOpen, setImportDialogOpen] = useState(false);
    const [statusDialogOpen, setStatusDialogOpen] = useState(false);
    const [editingContact, setEditingContact] = useState<Contact | null>(null);
    const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
    const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);
    const [filters, setFilters] = useState<ContactFilterValues>({
        search: "",
        company: "",
        status: "all",
        minScore: "",
        maxScore: "",
        ownerId: "all",
    });

    const { startAutoDialer, setAutoDialerQueue, openDialer, setCurrentNumber, startCall } = useDialerStore();
    const { data: contacts, isLoading, mutate } = useContacts();
    const { data: profiles } = useProfiles();
    const { data: activeProfile } = useActiveProfile();
    const { trigger: deleteContact } = useDeleteContact();
    const { trigger: updateContact } = useUpdateContact();

    const filteredContacts = (contacts || []).filter((contact) => {
        const matchesSearch =
            contact.first_name.toLowerCase().includes(filters.search.toLowerCase()) ||
            (contact.last_name?.toLowerCase() || "").includes(filters.search.toLowerCase()) ||
            (contact.email?.toLowerCase() || "").includes(filters.search.toLowerCase());

        const matchesCompany = (contact.company?.toLowerCase() || "").includes(filters.company.toLowerCase());
        const matchesStatus = filters.status === "all" || contact.status === filters.status;
        const matchesOwner = filters.ownerId === "all" ||
            (filters.ownerId === "unassigned" && !contact.owner_id) ||
            contact.owner_id === filters.ownerId;
        const matchesMinScore = filters.minScore === "" || (contact.lead_score || 0) >= Number(filters.minScore);
        const matchesMaxScore = filters.maxScore === "" || (contact.lead_score || 0) <= Number(filters.maxScore);

        return matchesSearch && matchesCompany && matchesStatus && matchesOwner && matchesMinScore && matchesMaxScore;
    });

    const handleEdit = (contact: Contact) => {
        setEditingContact(contact);
        setDialogOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this contact?")) return;
        try {
            await deleteContact(id);
            toast.success("Contact deleted");
            mutate();
        } catch (error) {
            const message = error instanceof Error ? error.message : "Unknown error occurred";
            toast.error("Failed to delete contact", {
                description: message
            });
        }
    };

    const handleSuccess = () => {
        mutate();
        setEditingContact(null);
    };

    const handleCall = (phone: string | null) => {
        if (!phone) {
            toast.error("Contact has no phone number");
            return;
        }
        setCurrentNumber(phone);
        openDialer();
        // The SipService call happens automatically in the Dialer widget's handleCall 
        // but since we want it to start immediately when clicking from the list:
        SipService.getInstance().call(phone);
        startCall(); // This updates the store state to 'connecting'
    };

    const handleEmail = (email: string | null) => {
        if (!email) {
            toast.error("Contact has no email address");
            return;
        }
        window.location.href = `mailto:${email}`;
    };

    const handleExport = () => {
        if (filteredContacts.length === 0) {
            toast.error("No contacts to export");
            return;
        }

        const headers = ["first_name", "last_name", "email", "phone", "company", "status", "lead_score"];
        const rows = filteredContacts.map(c => [
            c.first_name,
            c.last_name || "",
            c.email || "",
            c.phone || "",
            c.company || "",
            c.status || "new",
            c.lead_score || 0
        ]);

        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `contacts_export_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Contacts exported successfully");
    };

    const toggleSelection = (contactId: string) => {
        setSelectedContacts(prev =>
            prev.includes(contactId)
                ? prev.filter(id => id !== contactId)
                : [...prev, contactId]
        );
    };

    const toggleAll = () => {
        setSelectedContacts(prev =>
            prev.length === filteredContacts.length
                ? []
                : filteredContacts.map(c => c.id)
        );
    };

    const handleBulkDelete = async () => {
        if (!confirm(`Are you sure you want to delete ${selectedContacts.length} contacts?`)) return;
        try {
            for (const id of selectedContacts) {
                await deleteContact(id);
            }
            toast.success("Contacts deleted");
            setSelectedContacts([]);
            mutate();
        } catch (error) {
            const message = error instanceof Error ? error.message : "Unknown error occurred";
            toast.error("Failed to delete some contacts", {
                description: message
            });
        }
    };

    const handleAssign = async (agentId: string) => {
        try {
            const agent = profiles?.find(p => p.id === agentId);
            for (const id of selectedContacts) {
                await updateContact({ id, updates: { owner_id: agentId } });
            }
            toast.success(`Assigned ${selectedContacts.length} contacts to ${agent?.full_name || 'agent'}`);
            setSelectedContacts([]);
            mutate();
        } catch (error) {
            const message = error instanceof Error ? error.message : "Unknown error occurred";
            toast.error("Failed to assign contacts", {
                description: message
            });
        }
    };

    const handleAddToAutoDial = () => {
        const queue = filteredContacts
            .filter(c => selectedContacts.includes(c.id) && c.phone)
            .map(c => ({ number: c.phone!, name: `${c.first_name} ${c.last_name || ''}`.trim() }));

        if (queue.length === 0) {
            toast.error("No contacts with phone numbers selected");
            return;
        }

        setAutoDialerQueue(queue);
        startAutoDialer();
        openDialer();
        toast.success(`Added ${queue.length} contacts to Auto-Dialer`);
        setSelectedContacts([]);
    };

    const hotLeads = filteredContacts.filter((c) => (c.lead_score ?? 0) >= 80).length;
    const avgScore =
        filteredContacts.length > 0
            ? Math.round(
                filteredContacts.reduce((acc, c) => acc + (c.lead_score || 0), 0) /
                filteredContacts.length
            )
            : 0;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
        >
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Contacts</h1>
                    <p className="text-muted-foreground">
                        Manage and organize your contacts
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {(activeProfile?.role === "admin" || activeProfile?.role === "manager") && (
                        <Button variant="outline" size="icon" onClick={() => setStatusDialogOpen(true)}>
                            <Settings2 className="h-4 w-4" />
                        </Button>
                    )}
                    <Button onClick={() => setDialogOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Contact
                    </Button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Total Contacts
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <Skeleton className="h-8 w-16" />
                        ) : (
                            <div className="text-2xl font-bold">{filteredContacts.length}</div>
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Hot Leads
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <Skeleton className="h-8 w-16" />
                        ) : (
                            <div className="text-2xl font-bold text-green-500">{hotLeads}</div>
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Avg Score
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <Skeleton className="h-8 w-16" />
                        ) : (
                            <div className="text-2xl font-bold">{avgScore}</div>
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            New This Week
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">-</div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters & Search */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Search contacts..."
                                value={filters.search}
                                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                className="pl-10"
                            />
                        </div>
                        <div className="flex gap-2">
                            {selectedContacts.length > 0 && (
                                <>
                                    <Button variant="outline" onClick={handleAddToAutoDial}>
                                        <Play className="h-4 w-4 mr-2" />
                                        Auto-Dial ({selectedContacts.length})
                                    </Button>
                                    <Button variant="outline" onClick={() => setEnrollDialogOpen(true)}>
                                        <Mail className="h-4 w-4 mr-2" />
                                        Enroll
                                    </Button>
                                    {(activeProfile?.role === "admin" || activeProfile?.role === "manager") && (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="outline">
                                                    <UserCheck className="h-4 w-4 mr-2" />
                                                    Assign
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent>
                                                {profiles?.filter(p => p.role !== 'viewer').map(agent => (
                                                    <DropdownMenuItem key={agent.id} onClick={() => handleAssign(agent.id)}>
                                                        {agent.full_name} ({agent.role})
                                                    </DropdownMenuItem>
                                                ))}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    )}
                                    <Button variant="destructive" onClick={handleBulkDelete}>
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete
                                    </Button>
                                </>
                            )}
                            <ContactFilters
                                currentFilters={filters}
                                onFilterChange={setFilters}
                            />
                            <Button variant="outline" onClick={handleExport}>
                                <Download className="h-4 w-4 mr-2" />
                                Export
                            </Button>
                            {(activeProfile?.role === "admin" || activeProfile?.role === "manager") && (
                                <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
                                    <Upload className="h-4 w-4 mr-2" />
                                    Import
                                </Button>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Contacts Table */}
            <Card>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="p-8 flex items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : filteredContacts.length === 0 ? (
                        <div className="p-8 text-center">
                            <p className="text-muted-foreground">
                                {filters.search || filters.company
                                    ? "No contacts match your filters."
                                    : "No contacts yet. Add your first contact!"}
                            </p>
                            {!(filters.search || filters.company) && (
                                <Button
                                    className="mt-4"
                                    onClick={() => setDialogOpen(true)}
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Contact
                                </Button>
                            )}
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[40px]">
                                        <Checkbox
                                            checked={selectedContacts.length === filteredContacts.length && filteredContacts.length > 0}
                                            onCheckedChange={toggleAll}
                                        />
                                    </TableHead>
                                    <TableHead>Contact</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Score</TableHead>
                                    <TableHead>Owner</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredContacts.map((contact) => (
                                    <TableRow
                                        key={contact.id}
                                        className="cursor-pointer hover:bg-muted/50"
                                    >
                                        <TableCell onClick={(e) => e.stopPropagation()}>
                                            <Checkbox
                                                checked={selectedContacts.includes(contact.id)}
                                                onCheckedChange={() => toggleSelection(contact.id)}
                                            />
                                        </TableCell>
                                        <TableCell onClick={() => handleEdit(contact)}>
                                            <div className="flex items-center gap-3">
                                                <Avatar>
                                                    <AvatarFallback>
                                                        {getInitials(contact.first_name, contact.last_name)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="font-medium">
                                                        {contact.first_name} {contact.last_name}
                                                    </p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {contact.email}
                                                    </p>
                                                    {contact.company && (
                                                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                                            <Building2 className="h-3 w-3" />
                                                            {contact.company}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell onClick={() => handleEdit(contact)}>
                                            <Badge variant="secondary" className="capitalize">
                                                {contact.status || "new"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell onClick={() => handleEdit(contact)}>
                                            <span
                                                className={`font-semibold ${getScoreColor(contact.lead_score || 0)}`}
                                            >
                                                {contact.lead_score || 0}
                                            </span>
                                        </TableCell>
                                        <TableCell onClick={() => handleEdit(contact)}>
                                            {contact.owner_id ? (
                                                <div className="flex items-center gap-2">
                                                    <Avatar className="h-6 w-6">
                                                        <AvatarFallback className="text-[10px]">
                                                            {profiles?.find(p => p.id === contact.owner_id)?.full_name?.[0] || 'U'}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <span className="text-sm">
                                                        {profiles?.find(p => p.id === contact.owner_id)?.full_name || 'Assigned'}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-muted-foreground italic">Unassigned</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleCall(contact.phone || null);
                                                    }}
                                                >
                                                    <Phone className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleEmail(contact.email || null);
                                                    }}
                                                >
                                                    <Mail className="h-4 w-4" />
                                                </Button>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => handleEdit(contact)}>
                                                            Edit Contact
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem>Add to Sequence</DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            className="text-destructive"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDelete(contact.id);
                                                            }}
                                                        >
                                                            Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Contact Dialog */}
            <ContactDialog
                open={dialogOpen}
                onOpenChange={(open) => {
                    setDialogOpen(open);
                    if (!open) setEditingContact(null);
                }}
                contact={editingContact}
                organizationId={activeProfile?.organization_id || ""}
                onSuccess={handleSuccess}
            />

            <ImportDialog
                open={importDialogOpen}
                onOpenChange={setImportDialogOpen}
                organizationId={activeProfile?.organization_id || ""}
                onSuccess={mutate}
            />

            <StatusManagementDialog
                open={statusDialogOpen}
                onOpenChange={setStatusDialogOpen}
                organizationId={activeProfile?.organization_id || ""}
            />
            <SequenceEnrollmentDialog
                open={enrollDialogOpen}
                onOpenChange={setEnrollDialogOpen}
                contactIds={selectedContacts}
                onSuccess={() => setSelectedContacts([])}
            />
        </motion.div>
    );
}
