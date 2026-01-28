"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, X, Send, Sparkles, Maximize2, Minimize2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useActiveProfile } from "@/hooks/use-data";

type Message = {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
};

export function AIAssistant() {
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<Message[]>([
        {
            id: "1",
            role: "assistant",
            content: "Hi! I'm your CRM Copilot. I can help you summarize calls, draft emails, or look up contact info. How can I help you today?",
            timestamp: new Date(),
        },
    ]);
    const [isTyping, setIsTyping] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const { data: profile } = useActiveProfile();

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg: Message = {
            id: crypto.randomUUID(),
            role: "user",
            content: input,
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMsg]);
        setInput("");
        setIsTyping(true);

        // Simulate AI response
        setTimeout(() => {
            const aiMsg: Message = {
                id: crypto.randomUUID(),
                role: "assistant",
                content: generateAIResponse(input),
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, aiMsg]);
            setIsTyping(false);
        }, 1500);
    };

    const generateAIResponse = (query: string): string => {
        const q = query.toLowerCase();
        if (q.includes("hi") || q.includes("hello")) return `Hello ${profile?.full_name?.split(' ')[0] || 'there'}! How can I assist your sales efforts today?`;
        if (q.includes("report") || q.includes("stat")) return "I can generate a summary of your recent call volume. Your team made 124 calls today with a 45% connect rate. Would you like a detailed breakdown?";
        if (q.includes("contact")) return "I see you're looking for contact info. You can find all records in the Contacts tab, but I can pull up specific details if you give me a name.";
        if (q.includes("deal")) return "Your current pipeline value is $1.2M. You have 3 deals in the 'Negotiation' stage that need follow-up.";
        return "That's a great question. As your CRM Copilot, I'm still learning the specifics of your data, but I can help you with general automation and drafting. Want to try drafting an email?";
    };

    return (
        <div className="fixed bottom-6 right-24 z-50">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className={cn(
                            "absolute bottom-20 right-0 w-[380px] shadow-2xl transition-all",
                            isMinimized ? "h-14 overflow-hidden" : "h-[500px]"
                        )}
                    >
                        <Card className="h-full border-primary/20 flex flex-col">
                            <CardHeader className="p-4 bg-primary text-primary-foreground flex flex-row items-center justify-between space-y-0">
                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                    <Sparkles className="h-4 w-4" />
                                    CRM Copilot
                                </CardTitle>
                                <div className="flex items-center gap-1">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-primary-foreground hover:bg-white/10"
                                        onClick={() => setIsMinimized(!isMinimized)}
                                    >
                                        {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-primary-foreground hover:bg-white/10"
                                        onClick={() => setIsOpen(false)}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardHeader>
                            {!isMinimized && (
                                <>
                                    <CardContent className="flex-1 overflow-hidden p-0 bg-muted/30">
                                        <ScrollArea className="h-full p-4">
                                            <div ref={scrollRef} className="space-y-4">
                                                {messages.map((msg) => (
                                                    <div
                                                        key={msg.id}
                                                        className={cn(
                                                            "flex flex-col max-w-[85%] gap-1",
                                                            msg.role === "user" ? "ml-auto items-end" : "items-start"
                                                        )}
                                                    >
                                                        <div
                                                            className={cn(
                                                                "p-3 rounded-2xl text-sm shadow-sm",
                                                                msg.role === "user"
                                                                    ? "bg-primary text-primary-foreground rounded-tr-none"
                                                                    : "bg-card text-card-foreground rounded-tl-none border"
                                                            )}
                                                        >
                                                            {msg.content}
                                                        </div>
                                                        <span className="text-[10px] text-muted-foreground px-1">
                                                            {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                ))}
                                                {isTyping && (
                                                    <div className="flex items-center gap-2 text-muted-foreground">
                                                        <div className="bg-card border p-2 rounded-2xl rounded-tl-none">
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </ScrollArea>
                                    </CardContent>
                                    <CardFooter className="p-4 bg-background border-t">
                                        <form
                                            onSubmit={(e) => {
                                                e.preventDefault();
                                                handleSend();
                                            }}
                                            className="flex w-full items-center space-x-2"
                                        >
                                            <Input
                                                placeholder="Ask Copilot..."
                                                value={input}
                                                onChange={(e) => setInput(e.target.value)}
                                                className="flex-1"
                                                disabled={isTyping}
                                            />
                                            <Button type="submit" size="icon" disabled={!input.trim() || isTyping}>
                                                <Send className="h-4 w-4" />
                                            </Button>
                                        </form>
                                    </CardFooter>
                                </>
                            )}
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                    setIsOpen(!isOpen);
                    setIsMinimized(false);
                }}
                className={cn(
                    "h-14 w-14 rounded-full shadow-lg flex items-center justify-center transition-all",
                    isOpen ? "bg-destructive text-destructive-foreground rotate-90" : "bg-primary text-primary-foreground"
                )}
            >
                {isOpen ? <X className="h-6 w-6" /> : <Bot className="h-6 w-6" />}
            </motion.button>
        </div>
    );
}
