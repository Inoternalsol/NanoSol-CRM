import { TableSkeleton } from "@/components/ui/skeleton-loaders";

export default function ContactsLoading() {
    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div className="flex flex-col gap-2">
                    <div className="h-8 w-32 bg-muted animate-pulse rounded-md" />
                    <div className="h-4 w-64 bg-muted animate-pulse rounded-md" />
                </div>
                <div className="h-10 w-32 bg-muted animate-pulse rounded-md" />
            </div>
            
            <div className="h-12 w-full bg-muted/50 animate-pulse rounded-md mb-4" />
            
            <TableSkeleton rows={8} columns={5} />
        </div>
    );
}
