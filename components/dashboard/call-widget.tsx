"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Phone,
    PhoneOff,
    Mic,
    MicOff,
    Volume2,
    VolumeX,
    Minimize2,
    Maximize2,
    X,
    Hash,
    Clock,
    Pause,
    Play,
    PhoneForwarded,
    User,
    Search,
    Wifi,
    WifiOff,
    AlertCircle,
    CheckCircle2,
    History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useDialerStore } from "@/lib/stores";
import { SipService } from "@/lib/services/sip-service";
import { useCreateActivity, useContacts, useCreateCallLog, useActiveProfile } from "@/hooks/use-data";
import { toast } from "sonner";

const dialpadKeys = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    ["*", "0", "#"],
];

const dialpadLetters: Record<string, string> = {
    "2": "ABC",
    "3": "DEF",
    "4": "GHI",
    "5": "JKL",
    "6": "MNO",
    "7": "PQRS",
    "8": "TUV",
    "9": "WXYZ",
};

const callOutcomes = [
    { label: "Answered", value: "answered", color: "bg-green-500 hover:bg-green-600" },
    { label: "No Answer", value: "no-answer", color: "bg-yellow-500 hover:bg-yellow-600" },
    { label: "DND", value: "dnd", color: "bg-orange-500 hover:bg-orange-600" },
    { label: "Failed", value: "failed", color: "bg-red-500 hover:bg-red-600" },
];

// SIP error code to friendly message mapping
const sipErrorMessages: Record<number, string> = {
    400: "Bad request - check the number format",
    401: "Authentication failed",
    403: "Call forbidden by provider",
    404: "Number not found",
    408: "Request timeout",
    480: "Temporarily unavailable",
    486: "Busy",
    487: "Call cancelled",
    488: "Not acceptable here",
    500: "Server error",
    502: "Bad gateway",
    503: "Service unavailable",
    504: "Gateway timeout",
    600: "Busy everywhere",
    603: "Declined",
};

const StatusBadge = ({ sipStatus }: { sipStatus: string }) => (
    <Badge
        variant="outline"
        className={cn(
            "text-xs gap-1",
            sipStatus === "connected" && "border-green-500 text-green-500",
            sipStatus === "connecting" && "border-yellow-500 text-yellow-500",
            sipStatus === "disconnected" && "border-red-500 text-red-500",
            sipStatus === "error" && "border-red-500 text-red-500"
        )}
    >
        {sipStatus === "connected" && <><Wifi className="h-3 w-3" /> Ready</>}
        {sipStatus === "connecting" && <><Wifi className="h-3 w-3 animate-pulse" /> Connecting</>}
        {sipStatus === "disconnected" && <><WifiOff className="h-3 w-3" /> Offline</>}
        {sipStatus === "error" && <><AlertCircle className="h-3 w-3" /> Error</>}
    </Badge>
);

export function CallWidget() {
    const {
        isOpen,
        isInCall,
        currentNumber,
        callStatus,
        callDuration,
        closeDialer,
        openDialer,
        setCurrentNumber,
        startCall,
        endCall,
        updateQueueStatus,
        autoDialerActive,
        nextAutoDialNumber,
        callStartedAt,
        callEndedAt,
    } = useDialerStore();

    const { data: contacts } = useContacts();
    const { trigger: createActivity } = useCreateActivity();
    const { trigger: createCallLog } = useCreateCallLog();
    const { data: activeProfile } = useActiveProfile();

    const [isMuted, setIsMuted] = useState(false);
    const [isSpeakerOn, setIsSpeakerOn] = useState(true);
    const [isOnHold, setIsOnHold] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [durationDisplay, setDurationDisplay] = useState("00:00");
    const [showOutcomes, setShowOutcomes] = useState(false);
    const [showKeypad, setShowKeypad] = useState(false);
    const [showRecentCalls, setShowRecentCalls] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [sipStatus, setSipStatus] = useState<"connecting" | "connected" | "disconnected" | "error">("disconnected");
    const [lastError, setLastError] = useState<string | null>(null);
    const [recentCalls, setRecentCalls] = useState<Array<{ number: string; name?: string; time: Date; status: string }>>([]);

    // Find contact by number
    const contact = contacts?.find(c => c.phone === currentNumber);

    // Filter contacts for quick dial
    const filteredContacts = contacts?.filter(c =>
        c.phone && (
            c.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.phone.includes(searchQuery)
        )
    ).slice(0, 5);

    // Check SIP status periodically
    useEffect(() => {
        const checkStatus = () => {
            const sip = SipService.getInstance();
            if (sip.isRegistered) {
                setSipStatus("connected");
            } else if (sip.isConnected) {
                setSipStatus("connecting");
            } else {
                setSipStatus("disconnected");
            }
        };

        checkStatus();
        const interval = setInterval(checkStatus, 2000);
        return () => clearInterval(interval);
    }, []);

    // Format call duration
    useEffect(() => {
        if (!isInCall) return;

        const interval = setInterval(() => {
            const minutes = Math.floor(callDuration / 60);
            const seconds = callDuration % 60;
            setDurationDisplay(
                `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
            );
        }, 1000);

        return () => clearInterval(interval);
    }, [isInCall, callDuration]);

    // Listen for SIP events
    useEffect(() => {
        const handleCallFailed = (event: CustomEvent) => {
            const { cause, message, reason } = event.detail;
            const statusCode = message || 0;
            const friendlyMessage = reason || sipErrorMessages[statusCode] || cause || "Call failed";
            setLastError(friendlyMessage);
            toast.error(friendlyMessage);

            // Add to recent calls with failed status
            setRecentCalls(prev => [{
                number: currentNumber,
                name: contact?.first_name,
                time: new Date(),
                status: "failed"
            }, ...prev.slice(0, 9)]);
        };

        window.addEventListener("sip:call:failed", handleCallFailed as EventListener);
        return () => window.removeEventListener("sip:call:failed", handleCallFailed as EventListener);
    }, [currentNumber, contact]);

    const handleKeyPress = (key: string) => {
        setCurrentNumber(currentNumber + key);
        if (isInCall) {
            SipService.getInstance().sendDTMF(key);
        }
    };

    const handleCall = useCallback(() => {
        if (currentNumber.length > 0) {
            setLastError(null);
            startCall();
            SipService.getInstance().call(currentNumber);
            setShowOutcomes(false);
        }
    }, [currentNumber, startCall]);

    const handleHangup = () => {
        SipService.getInstance().hangup();
        setShowOutcomes(true);
        setIsOnHold(false);
        setIsMuted(false);
    };

    const handleHold = () => {
        // JsSIP doesn't have built-in hold, this is a placeholder
        setIsOnHold(!isOnHold);
        toast.info(isOnHold ? "Call resumed" : "Call on hold");
    };

    const handleQuickDial = (phone: string, name?: string) => {
        setCurrentNumber(phone);
        setSearchQuery("");
        toast.info(`Dialing ${name || phone}`);
    };

    const handleOutcome = async (outcome: typeof callOutcomes[0]) => {
        try {
            // Add to recent calls
            setRecentCalls(prev => [{
                number: currentNumber,
                name: contact?.first_name,
                time: new Date(),
                status: outcome.value
            }, ...prev.slice(0, 9)]);

            // Persist call log to database
            if (activeProfile?.organization_id) {
                const statusMap: Record<string, "completed" | "missed" | "failed" | "no_answer" | "busy"> = {
                    "answered": "completed",
                    "no-answer": "no_answer",
                    "dnd": "busy",
                    "failed": "failed",
                };

                const finalStartedAt = callStartedAt || new Date().toISOString();
                const finalEndedAt = callEndedAt || new Date().toISOString();

                await createCallLog({
                    organization_id: activeProfile.organization_id,
                    user_id: activeProfile.id,
                    contact_id: contact?.id,
                    phone_number: currentNumber,
                    direction: "outbound",
                    status: statusMap[outcome.value] || "completed",
                    duration_seconds: callDuration,
                    outcome: outcome.value,
                    started_at: finalStartedAt,
                    ended_at: finalEndedAt,
                });
            }

            // Log activity
            if (contact) {
                await createActivity({
                    organization_id: contact.organization_id,
                    contact_id: contact.id,
                    type: "call",
                    title: `Call to ${contact.first_name}: ${outcome.label}`,
                    description: `Duration: ${durationDisplay}. Result: ${outcome.label}`,
                    metadata: {
                        duration: callDuration,
                        outcome: outcome.value,
                        number: currentNumber
                    }
                });
            }

            toast.success(`Call logged as ${outcome.label}`);
            updateQueueStatus(currentNumber, outcome.value as Parameters<typeof updateQueueStatus>[1]);
            setShowOutcomes(false);
            endCall();

            if (autoDialerActive) {
                const next = nextAutoDialNumber();
                if (next) {
                    toast.info(`Next: ${next.name} (${next.number})`);
                    setTimeout(() => handleCall(), 2000);
                } else {
                    toast.success("Auto-dialer complete!");
                }
            }
        } catch (error) {
            console.error("Failed to log call outcome:", error);
            toast.error("Failed to log call");
        }
    };


    if (!isOpen) {
        return (
            <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className={cn(
                    "fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all",
                    sipStatus === "connected"
                        ? "bg-gradient-to-br from-green-500 to-green-600"
                        : "bg-gradient-to-br from-primary to-primary/80",
                    "text-white hover:shadow-xl"
                )}
                onClick={openDialer}
            >
                <Phone className="h-6 w-6" />
                {sipStatus === "connected" && (
                    <span className="absolute -top-1 -right-1 h-3 w-3 bg-green-400 rounded-full border-2 border-white animate-pulse" />
                )}
            </motion.button>
        );
    }

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 100, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 100, scale: 0.9 }}
                className="fixed bottom-6 right-6 z-50 w-[340px] max-h-[80vh] rounded-2xl bg-gradient-to-b from-card to-card/95 border border-border/50 shadow-2xl overflow-hidden overflow-y-auto backdrop-blur-sm"
            >
                {/* Header */}
                <div className="flex items-center justify-between bg-gradient-to-r from-primary/10 to-primary/5 px-4 py-3 border-b border-border/50">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                            <Phone className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                            <span className="font-semibold text-sm">
                                {autoDialerActive ? "Auto-Dialer" : "Dialer"}
                            </span>
                            <div className="flex items-center gap-2">
                                <StatusBadge sipStatus={sipStatus} />
                                {isInCall && (
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {durationDisplay}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-full"
                            onClick={() => setIsMinimized(!isMinimized)}
                        >
                            {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-full"
                            onClick={closeDialer}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {!isMinimized && (
                    <div className="p-4 space-y-4">
                        {/* Error Display */}
                        {lastError && !isInCall && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20"
                            >
                                <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                                <p className="text-xs text-red-500">{lastError}</p>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5 ml-auto"
                                    onClick={() => setLastError(null)}
                                >
                                    <X className="h-3 w-3" />
                                </Button>
                            </motion.div>
                        )}

                        {/* Contact Info */}
                        {contact && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                            >
                                <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                                    <User className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <p className="font-semibold">{contact.first_name} {contact.last_name}</p>
                                    <p className="text-xs text-muted-foreground">{contact.company || "No Company"}</p>
                                </div>
                            </motion.div>
                        )}

                        {/* Number Display */}
                        <div className="relative">
                            <Input
                                id="dialer-number"
                                name="dialer-number"
                                value={currentNumber}
                                onChange={(e) => setCurrentNumber(e.target.value)}
                                placeholder="Enter number..."
                                className="text-center text-2xl font-mono tracking-widest h-14 bg-muted/30 border-muted"
                            />
                            {currentNumber && !isInCall && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full"
                                    onClick={() => setCurrentNumber("")}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            )}
                        </div>

                        {/* Quick Search (when not in call) */}
                        {!isInCall && !showOutcomes && (
                            <div className="space-y-2">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="contact-search"
                                        name="contact-search"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search contacts..."
                                        className="pl-9 h-9 text-sm"
                                    />
                                </div>
                                {searchQuery && filteredContacts && filteredContacts.length > 0 && (
                                    <div className="space-y-1 max-h-32 overflow-y-auto">
                                        {filteredContacts.map((c) => (
                                            <button
                                                key={c.id}
                                                onClick={() => handleQuickDial(c.phone!, `${c.first_name} ${c.last_name}`)}
                                                className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors text-left"
                                            >
                                                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                                                    <User className="h-3 w-3" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium truncate">{c.first_name} {c.last_name}</p>
                                                    <p className="text-xs text-muted-foreground">{c.phone}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Call Status */}
                        {isInCall && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-center py-2"
                            >
                                <motion.div
                                    animate={{ opacity: [1, 0.5, 1] }}
                                    transition={{ repeat: Infinity, duration: 1.5 }}
                                    className={cn(
                                        "text-sm font-medium flex items-center justify-center gap-2",
                                        callStatus === "active" ? "text-green-500" : "text-yellow-500"
                                    )}
                                >
                                    {callStatus === "connecting" && "Connecting..."}
                                    {callStatus === "ringing" && "Ringing..."}
                                    {callStatus === "active" && <><CheckCircle2 className="h-4 w-4" /> Connected</>}
                                    {isOnHold && " (On Hold)"}
                                </motion.div>
                            </motion.div>
                        )}

                        {/* Outcome Selection */}
                        {showOutcomes && !isInCall && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-3"
                            >
                                <p className="text-xs font-medium text-center text-muted-foreground">Select Call Outcome</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {callOutcomes.map((outcome) => (
                                        <Button
                                            key={outcome.value}
                                            size="sm"
                                            className={cn("text-white font-medium", outcome.color)}
                                            onClick={() => handleOutcome(outcome)}
                                        >
                                            {outcome.label}
                                        </Button>
                                    ))}
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full"
                                    onClick={() => {
                                        setShowOutcomes(false);
                                        endCall();
                                    }}
                                >
                                    Skip Logging
                                </Button>
                            </motion.div>
                        )}

                        {/* Dialpad */}
                        {(!isInCall || showKeypad) && !showOutcomes && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="grid grid-cols-3 gap-2"
                            >
                                {dialpadKeys.flat().map((key) => (
                                    <Button
                                        key={key}
                                        variant="outline"
                                        className="h-14 text-lg font-semibold flex flex-col gap-0 hover:bg-primary/10 transition-all"
                                        onClick={() => handleKeyPress(key)}
                                    >
                                        <span>{key}</span>
                                        {dialpadLetters[key] && (
                                            <span className="text-[10px] text-muted-foreground font-normal">
                                                {dialpadLetters[key]}
                                            </span>
                                        )}
                                    </Button>
                                ))}
                            </motion.div>
                        )}

                        {/* In-Call Controls */}
                        {isInCall && !showKeypad && (
                            <div className="grid grid-cols-4 gap-2">
                                <Button
                                    variant={isMuted ? "destructive" : "outline"}
                                    size="icon"
                                    className="h-12 w-full rounded-xl flex flex-col gap-1"
                                    onClick={() => {
                                        const newMuted = !isMuted;
                                        setIsMuted(newMuted);
                                        SipService.getInstance().mute(newMuted);
                                    }}
                                >
                                    {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                                    <span className="text-[10px]">Mute</span>
                                </Button>
                                <Button
                                    variant={isOnHold ? "secondary" : "outline"}
                                    size="icon"
                                    className="h-12 w-full rounded-xl flex flex-col gap-1"
                                    onClick={handleHold}
                                >
                                    {isOnHold ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                                    <span className="text-[10px]">{isOnHold ? "Resume" : "Hold"}</span>
                                </Button>
                                <Button
                                    variant={isSpeakerOn ? "outline" : "secondary"}
                                    size="icon"
                                    className="h-12 w-full rounded-xl flex flex-col gap-1"
                                    onClick={() => {
                                        setIsSpeakerOn(!isSpeakerOn);
                                        const audioEl = document.getElementById("sip-remote-audio") as HTMLAudioElement;
                                        if (audioEl) audioEl.muted = isSpeakerOn; // Toggle mute (opposite of speaker state)
                                        toast.info(isSpeakerOn ? "Speaker off" : "Speaker on");
                                    }}
                                >
                                    {isSpeakerOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                                    <span className="text-[10px]">Speaker</span>
                                </Button>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-12 w-full rounded-xl flex flex-col gap-1"
                                    onClick={() => setShowKeypad(!showKeypad)}
                                >
                                    <Hash className="h-4 w-4" />
                                    <span className="text-[10px]">Keypad</span>
                                </Button>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-12 w-full rounded-xl flex flex-col gap-1"
                                    onClick={() => toast.info("Transfer feature coming soon")}
                                >
                                    <PhoneForwarded className="h-4 w-4" />
                                    <span className="text-[10px]">Transfer</span>
                                </Button>
                            </div>
                        )}

                        {/* Show keypad toggle when in call */}
                        {isInCall && showKeypad && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="w-full"
                                onClick={() => setShowKeypad(false)}
                            >
                                Hide Keypad
                            </Button>
                        )}

                        {/* Call / Hangup Button */}
                        <div className="flex justify-center gap-2">
                            {isInCall ? (
                                <Button
                                    variant="destructive"
                                    className="flex-1 h-12 rounded-full"
                                    onClick={handleHangup}
                                >
                                    <PhoneOff className="h-5 w-5 mr-2" />
                                    End Call
                                </Button>
                            ) : !showOutcomes && (
                                <>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-12 w-12 rounded-full"
                                        onClick={() => setShowRecentCalls(!showRecentCalls)}
                                    >
                                        <History className="h-5 w-5" />
                                    </Button>
                                    <Button
                                        className="flex-1 h-12 rounded-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                                        onClick={handleCall}
                                        disabled={!currentNumber || sipStatus !== "connected"}
                                    >
                                        <Phone className="h-5 w-5 mr-2" />
                                        {sipStatus !== "connected" ? "Connecting..." : "Call"}
                                    </Button>
                                </>
                            )}
                        </div>

                        {/* Recent Calls */}
                        {showRecentCalls && !isInCall && recentCalls.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                className="space-y-1 max-h-40 overflow-y-auto border-t pt-3"
                            >
                                <p className="text-xs font-medium text-muted-foreground mb-2">Recent Calls</p>
                                {recentCalls.map((call, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setCurrentNumber(call.number)}
                                        className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors text-left"
                                    >
                                        <div className={cn(
                                            "h-2 w-2 rounded-full",
                                            call.status === "answered" && "bg-green-500",
                                            call.status === "no-answer" && "bg-yellow-500",
                                            call.status === "failed" && "bg-red-500",
                                            call.status === "dnd" && "bg-orange-500"
                                        )} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{call.name || call.number}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {call.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </div>
                )}
            </motion.div>
        </AnimatePresence>
    );
}
