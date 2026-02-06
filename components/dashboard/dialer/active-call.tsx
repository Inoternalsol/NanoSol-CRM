"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Play, Pause, Volume2, VolumeX, Hash, PhoneForwarded, PhoneOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useWaveform } from "@/hooks/use-waveform";
import { SipService } from "@/lib/services/sip-service";

interface Contact {
    first_name: string;
    last_name?: string | null;
    company?: string | null;
}

interface ActiveCallProps {
    contact: Contact | null;
    status: string;
    duration: string;
    isMuted: boolean;
    onMuteToggle: () => void;
    isOnHold: boolean;
    onHoldToggle: () => void;
    isSpeakerOn: boolean;
    onSpeakerToggle: () => void;
    showKeypad: boolean;
    onKeypadToggle: () => void;
    onHangup: () => void;
}

export const ActiveCall = ({
    contact,
    status,
    duration,
    isMuted,
    onMuteToggle,
    isOnHold,
    onHoldToggle,
    isSpeakerOn,
    onSpeakerToggle,
    showKeypad,
    onKeypadToggle,
    onHangup
}: ActiveCallProps) => {
    const stream = SipService.getInstance().remoteStream;
    const volumes = useWaveform(stream, status === "active", 20);

    return (
        <div className="space-y-6 flex flex-col items-center py-4">
            {/* Visualizer */}
            <div className="w-full h-24 flex items-center justify-center gap-1.5 px-10">
                {volumes.map((vol, i) => (
                    <motion.div
                        key={i}
                        className={cn(
                            "w-1.5 bg-primary/40 rounded-full",
                            status === "active" ? "bg-primary" : "bg-muted-foreground/30 h-1"
                        )}
                        initial={{ height: "4px" }}
                        animate={{ height: status === "active" ? `${vol}%` : "4px" }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    />
                ))}
            </div>

            <div className="text-center">
                <p className="text-xl font-bold">{contact?.first_name || "Unknown"} {contact?.last_name || ""}</p>
                <p className="text-sm text-muted-foreground">{contact?.company || "Outbound Call"}</p>
                <div className="mt-2 flex items-center justify-center gap-2">
                    <span className={cn(
                        "h-2 w-2 rounded-full",
                        status === "active" ? "bg-green-500 animate-pulse" : "bg-yellow-500"
                    )} />
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        {status} • {duration}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4 w-full px-6">
                <CallControlButton
                    icon={isMuted ? MicOff : Mic}
                    label={isMuted ? "Unmute" : "Mute"}
                    active={isMuted}
                    onClick={onMuteToggle}
                    variant={isMuted ? "destructive" : "outline"}
                />
                <CallControlButton
                    icon={isOnHold ? Play : Pause}
                    label={isOnHold ? "Resume" : "Hold"}
                    active={isOnHold}
                    onClick={onHoldToggle}
                />
                <CallControlButton
                    icon={isSpeakerOn ? Volume2 : VolumeX}
                    label="Speaker"
                    active={isSpeakerOn}
                    onClick={onSpeakerToggle}
                />
                <CallControlButton
                    icon={Hash}
                    label="Keypad"
                    active={showKeypad}
                    onClick={onKeypadToggle}
                />
                <CallControlButton
                    icon={PhoneForwarded}
                    label="Transfer"
                    onClick={() => { }}
                />
            </div>

            <div className="pt-6 w-full px-6">
                <Button
                    variant="destructive"
                    className="w-full h-14 rounded-2xl shadow-lg shadow-red-500/20 text-lg font-semibold hover:scale-[1.02] transition-transform"
                    onClick={onHangup}
                >
                    <PhoneOff className="mr-2 h-6 w-6" />
                    End Call
                </Button>
            </div>
        </div>
    );
};

interface ControlButtonProps {
    icon: React.ElementType;
    label: string;
    active?: boolean;
    onClick: () => void;
    variant?: "outline" | "destructive" | "default" | "secondary" | "ghost" | "link";
}

const CallControlButton = ({ icon: Icon, label, active, onClick, variant = "outline" }: ControlButtonProps) => (
    <div className="flex flex-col items-center gap-1.5">
        <Button
            variant={variant}
            size="icon"
            className={cn(
                "h-14 w-14 rounded-2xl transition-all shadow-sm",
                active && variant === "outline" && "bg-primary/10 border-primary text-primary"
            )}
            onClick={onClick}
            title={label}
        >
            <Icon className="h-6 w-6" />
        </Button>
        <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
    </div>
);
