import { Button } from "@/components/ui/button";
import { WifiOff } from "lucide-react";
import Link from "next/link";

export default function OfflinePage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background p-6 text-center">
            <div className="p-4 rounded-full bg-muted mb-6">
                <WifiOff className="w-12 h-12 text-muted-foreground" />
            </div>
            <h1 className="text-2xl font-bold mb-2">You are currently offline</h1>
            <p className="text-muted-foreground mb-8 max-w-md">
                It looks like you don&apos;t have an active internet connection.
                Some features of NanoSol CRM may be unavailable until you reconnect.
            </p>
            <Button asChild variant="default">
                <Link href="/dashboard">Try Reconnecting</Link>
            </Button>
        </div>
    );
}
