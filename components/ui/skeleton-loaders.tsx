"use client";

import { cn } from "@/lib/utils";

interface SkeletonProps {
    className?: string;
}

// Base skeleton with pulse animation
export function Skeleton({ className }: SkeletonProps) {
    return (
        <div className={cn("animate-pulse rounded-md bg-muted", className)} />
    );
}

// Contact card skeleton
export function ContactCardSkeleton() {
    return (
        <div className="flex items-center space-x-4 p-4 border rounded-lg">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-[150px]" />
                <Skeleton className="h-3 w-[200px]" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
        </div>
    );
}

// Contact list skeleton
export function ContactListSkeleton({ count = 5 }: { count?: number }) {
    return (
        <div className="space-y-3">
            {Array.from({ length: count }).map((_, i) => (
                <ContactCardSkeleton key={i} />
            ))}
        </div>
    );
}

// Deal card skeleton (for kanban)
export function DealCardSkeleton() {
    return (
        <div className="p-4 border rounded-lg space-y-3 bg-card">
            <div className="flex justify-between items-start">
                <Skeleton className="h-4 w-[120px]" />
                <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-3 w-[100px]" />
            <div className="flex gap-2">
                <Skeleton className="h-3 w-[60px]" />
                <Skeleton className="h-3 w-[80px]" />
            </div>
        </div>
    );
}

// Deal column skeleton (for kanban)
export function DealColumnSkeleton({ count = 3 }: { count?: number }) {
    return (
        <div className="min-w-[280px] space-y-3">
            <div className="flex justify-between items-center">
                <Skeleton className="h-5 w-[100px]" />
                <Skeleton className="h-5 w-8 rounded-full" />
            </div>
            <div className="space-y-2">
                {Array.from({ length: count }).map((_, i) => (
                    <DealCardSkeleton key={i} />
                ))}
            </div>
        </div>
    );
}

// Table row skeleton
export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
    return (
        <tr className="border-b">
            {Array.from({ length: columns }).map((_, i) => (
                <td key={i} className="p-4">
                    <Skeleton className="h-4 w-full max-w-[150px]" />
                </td>
            ))}
        </tr>
    );
}

// Table skeleton
export function TableSkeleton({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) {
    return (
        <div className="rounded-md border">
            <table className="w-full">
                <thead>
                    <tr className="border-b bg-muted/50">
                        {Array.from({ length: columns }).map((_, i) => (
                            <th key={i} className="p-4">
                                <Skeleton className="h-4 w-[80px]" />
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {Array.from({ length: rows }).map((_, i) => (
                        <TableRowSkeleton key={i} columns={columns} />
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// Stats card skeleton
export function StatsCardSkeleton() {
    return (
        <div className="p-6 border rounded-lg space-y-3">
            <div className="flex justify-between items-center">
                <Skeleton className="h-4 w-[100px]" />
                <Skeleton className="h-8 w-8 rounded" />
            </div>
            <Skeleton className="h-8 w-[80px]" />
            <Skeleton className="h-3 w-[120px]" />
        </div>
    );
}

// Dashboard stats skeleton
export function DashboardStatsSkeleton({ count = 4 }: { count?: number }) {
    return (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: count }).map((_, i) => (
                <StatsCardSkeleton key={i} />
            ))}
        </div>
    );
}

// Form skeleton
export function FormSkeleton({ fields = 4 }: { fields?: number }) {
    return (
        <div className="space-y-4">
            {Array.from({ length: fields }).map((_, i) => (
                <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-[100px]" />
                    <Skeleton className="h-10 w-full" />
                </div>
            ))}
            <Skeleton className="h-10 w-[120px]" />
        </div>
    );
}
