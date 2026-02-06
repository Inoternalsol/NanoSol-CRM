"use client";

import React from "react";
import { Phone, User, Trash2, History as HistoryIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface CallRecord {
    number: string;
    name?: string;
    time: Date;
    status: string;
}

interface CallHistoryProps {
    calls: CallRecord[];
    onDial: (number: string, name?: string) => void;
    onClear: () => void;
}

export const CallHistory = ({ calls, onDial, onClear }: CallHistoryProps) => {
    if (calls.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full py-12 text-muted-foreground space-y-4">
                <div className="p-4 bg-muted/50 rounded-full">
                    <HistoryIcon className="h-8 w-8 opacity-20" />
                </div>
                <p className="text-sm font-medium">No recent calls</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recent Activity</h3>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={onClear} title="Clear History">
                    <Trash2 className="h-3.5 w-3.5" />
                </Button>
            </div>

            <div className="space-y-1">
                {calls.map((call, i) => (
                    <button
                        key={i}
                        onClick={() => onDial(call.number, call.name)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-primary/5 group transition-all text-left border border-transparent hover:border-primary/10"
                    >
                        <div className={cn(
                            "h-10 w-10 rounded-full flex items-center justify-center transition-colors",
                            call.status === "answered" ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"
                        )}>
                            {call.name ? <User className="h-5 w-5" /> : <Phone className="h-5 w-5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
                                {call.name || call.number}
                            </p>
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                <span>{call.number}</span>
                                <span>•</span>
                                <span>{formatDistanceToNow(call.time, { addSuffix: true })}</span>
                            </div>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <Phone className="h-4 w-4 text-primary" />
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};
