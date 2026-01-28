"use client";

import { useEmailSequences, useUpdateEmailSequence } from "@/hooks/use-data";
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Mail } from "lucide-react";

interface SequenceEnrollmentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    contactIds: string[];
    onSuccess?: () => void;
}

export function SequenceEnrollmentDialog({
    open,
    onOpenChange,
    contactIds,
    onSuccess,
}: SequenceEnrollmentDialogProps) {
    const { data: sequences } = useEmailSequences();
    const { trigger: updateSequence } = useUpdateEmailSequence();
    const [selectedSequenceId, setSelectedSequenceId] = useState<string>("");
    const [isEnrolling, setIsEnrolling] = useState(false);

    const handleEnroll = async () => {
        if (!selectedSequenceId) return;
        setIsEnrolling(true);

        try {
            const sequence = sequences?.find(s => s.id === selectedSequenceId);
            if (!sequence) throw new Error("Sequence not found");

            // In a real app, this would create sequence_enrollments records
            // For now, we update the enrolled_count and show a toast
            await updateSequence({
                id: selectedSequenceId,
                updates: { enrolled_count: (sequence.enrolled_count || 0) + contactIds.length }
            });

            toast.success(`Enrolled ${contactIds.length} contacts into "${sequence.name}"`);
            onSuccess?.();
            onOpenChange(false);
        } catch (error) {
            console.error(error);
            toast.error("Failed to enroll contacts");
        } finally {
            setIsEnrolling(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Enroll in Sequence</DialogTitle>
                    <DialogDescription>
                        Select an automated sequence to enroll the selected {contactIds.length} contacts.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Automated Sequence</Label>
                        <Select onValueChange={setSelectedSequenceId} value={selectedSequenceId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a sequence" />
                            </SelectTrigger>
                            <SelectContent>
                                {sequences?.map((s) => (
                                    <SelectItem key={s.id} value={s.id}>
                                        <div className="flex items-center gap-2">
                                            <Mail className="h-4 w-4 text-muted-foreground" />
                                            <span>{s.name}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isEnrolling}>
                        Cancel
                    </Button>
                    <Button onClick={handleEnroll} disabled={!selectedSequenceId || isEnrolling}>
                        {isEnrolling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Enroll Contacts
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
