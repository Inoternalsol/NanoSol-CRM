import { DashboardStatsSkeleton } from "@/components/ui/skeleton-loaders";

export default function DashboardLoading() {
    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <div className="h-8 w-48 bg-muted animate-pulse rounded-md" />
                <div className="h-4 w-96 bg-muted animate-pulse rounded-md" />
            </div>
            
            <DashboardStatsSkeleton count={4} />
            
            <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 mt-8">
                <div className="h-[400px] w-full bg-muted/50 animate-pulse rounded-xl border" />
                <div className="h-[400px] w-full bg-muted/50 animate-pulse rounded-xl border" />
            </div>
        </div>
    );
}
