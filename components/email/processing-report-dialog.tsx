
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

export interface ProcessingResult {
    id: string;
    status: 'success' | 'error';
    message?: string;
    error?: string;
}

interface ProcessingReportDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    results: ProcessingResult[];
    stats: {
        processed: number;
        successCount: number;
        failureCount: number;
    };
}

export function ProcessingReportDialog({
    open,
    onOpenChange,
    results,
    stats
}: ProcessingReportDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Processing Complete</DialogTitle>
                    <DialogDescription>
                        Here is the summary of the sequence processing run.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-3 gap-4 py-4">
                    <div className="flex flex-col items-center justify-center p-4 bg-muted/40 rounded-lg border">
                        <span className="text-2xl font-bold">{stats.processed}</span>
                        <span className="text-xs text-muted-foreground uppercase">Total</span>
                    </div>
                    <div className="flex flex-col items-center justify-center p-4 bg-green-500/10 text-green-600 rounded-lg border border-green-200">
                        <span className="text-2xl font-bold">{stats.successCount}</span>
                        <span className="text-xs uppercase">Success</span>
                    </div>
                    <div className="flex flex-col items-center justify-center p-4 bg-red-500/10 text-red-600 rounded-lg border border-red-200">
                        <span className="text-2xl font-bold">{stats.failureCount}</span>
                        <span className="text-xs uppercase">Failed</span>
                    </div>
                </div>

                {stats.failureCount > 0 && (
                    <div className="space-y-2">
                        <h4 className="text-sm font-medium flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                            Failures & Errors
                        </h4>
                        <ScrollArea className="h-[200px] border rounded-md p-4 bg-muted/20">
                            <div className="space-y-3">
                                {results.filter(r => r.status === 'error').map((result, i) => (
                                    <div key={i} className="flex items-start gap-3 text-sm">
                                        <XCircle className="h-4 w-4 text-destructive mt-0.5" />
                                        <div>
                                            <p className="font-medium">Enrollment ID: {result.id}</p>
                                            <p className="text-muted-foreground">{result.message || result.error || "Unknown Error"}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>
                )}

                {stats.failureCount === 0 && stats.processed > 0 && (
                    <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                        <CheckCircle2 className="h-12 w-12 text-green-500 mb-2 opacity-80" />
                        <p>All sequences processed successfully.</p>
                    </div>
                )}

                <DialogFooter>
                    <Button onClick={() => onOpenChange(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
