import { Button } from "@/components/ui/button";
import { useDialerStore } from "@/lib/stores";
import { Pause, Play, SkipForward, Square, UserMinus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function AutoDialerControls() {
    const {
        autoDialerQueue,
        isAutoDialerPaused,
        toggleAutoDialerPause,
        terminateAutoDialer,
        skipCurrent,
        callStatus
    } = useDialerStore();

    const pendingCount = autoDialerQueue.filter(q => !q.lastStatus).length;
    const completedCount = autoDialerQueue.length - pendingCount;
    const currentItem = autoDialerQueue.find(q => !q.lastStatus); // The one currently being processed or next in line

    return (
        <div className="absolute -top-14 left-0 right-0 bg-background border px-4 py-2 flex items-center justify-between shadow-lg rounded-t-xl z-[-1]">
            <div className="flex items-center gap-3">
                <Badge variant={isAutoDialerPaused ? "secondary" : "default"} className="animate-pulse">
                    {isAutoDialerPaused ? "Paused" : "Auto-Dialing"}
                </Badge>
                <span className="text-xs text-muted-foreground font-medium">
                    {completedCount + (currentItem ? 1 : 0)} of {autoDialerQueue.length}
                </span>
            </div>

            <div className="flex items-center gap-1">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={toggleAutoDialerPause}
                    title={isAutoDialerPaused ? "Resume" : "Pause"}
                >
                    {isAutoDialerPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                </Button>

                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={skipCurrent}
                    disabled={!currentItem}
                    title="Skip current contact"
                >
                    <SkipForward className="h-4 w-4" />
                </Button>

                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => {
                        if (confirm("Stop auto-dialing session?")) {
                            terminateAutoDialer();
                        }
                    }}
                    title="Stop Auto-Dialer"
                >
                    <Square className="h-4 w-4 fill-current" />
                </Button>
            </div>
        </div>
    );
}
