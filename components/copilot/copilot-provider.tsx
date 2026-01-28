"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
}

interface CopilotContextType {
    messages: Message[];
    isLoading: boolean;
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    sendMessage: (message: string, context?: Record<string, unknown>) => Promise<void>;
    clearMessages: () => void;
}

const CopilotContext = createContext<CopilotContextType | null>(null);

export function useCopilot() {
    const context = useContext(CopilotContext);
    if (!context) {
        throw new Error("useCopilot must be used within a CopilotProvider");
    }
    return context;
}

interface CopilotProviderProps {
    children: ReactNode;
}

export function CopilotProvider({ children }: CopilotProviderProps) {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: "welcome",
            role: "assistant",
            content: "Hi! I'm your AI Copilot. How can I help you today?",
            timestamp: new Date(),
        },
    ]);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    const sendMessage = useCallback(async (message: string, context?: Record<string, unknown>) => {
        // Add user message
        const userMessage: Message = {
            id: crypto.randomUUID(),
            role: "user",
            content: message,
            timestamp: new Date(),
        };
        setMessages((prev) => [...prev, userMessage]);
        setIsLoading(true);

        try {
            const response = await fetch("/api/copilot", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message, context }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to get response");
            }

            // Add assistant response
            const assistantMessage: Message = {
                id: crypto.randomUUID(),
                role: "assistant",
                content: data.response,
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, assistantMessage]);
        } catch (error) {
            console.error("Copilot error:", error);
            // Add error message
            const errorMessage: Message = {
                id: crypto.randomUUID(),
                role: "assistant",
                content: "Sorry, I encountered an error. Please try again.",
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const clearMessages = useCallback(() => {
        setMessages([
            {
                id: "welcome",
                role: "assistant",
                content: "Hi! I'm your AI Copilot. How can I help you today?",
                timestamp: new Date(),
            },
        ]);
    }, []);

    return (
        <CopilotContext.Provider
            value={{
                messages,
                isLoading,
                isOpen,
                setIsOpen,
                sendMessage,
                clearMessages,
            }}
        >
            {children}
        </CopilotContext.Provider>
    );
}
