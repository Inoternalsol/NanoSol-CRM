"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Command, Bot, Zap, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const STEPS = [
    {
        title: "Welcome to NanoSol CRM",
        description: "The next-generation elite SaaS platform designed to hyper-accelerate your sales workflow.",
        icon: <Zap className="w-12 h-12 text-primary" />,
    },
    {
        title: "Lightning Fast Navigation",
        description: "Press Cmd + K (or Ctrl + K) anywhere to instantly open the global command palette and navigate blazingly fast.",
        icon: <Command className="w-12 h-12 text-primary" />,
    },
    {
        title: "AI Copilot Integrated",
        description: "Your AI assistant is always ready in the bottom right corner. Ask it to summarize deals, draft emails, or analyze contacts.",
        icon: <Bot className="w-12 h-12 text-primary" />,
    },
    {
        title: "You're All Set!",
        description: "Your workspace is ready. Dive in and experience the power of Deep Ocean aesthetics.",
        icon: <CheckCircle2 className="w-12 h-12 text-green-500" />,
    }
];

export function GuidedTour() {
    const [isVisible, setIsVisible] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);

    useEffect(() => {
        const hasCompleted = localStorage.getItem("nanosol_onboarding_completed");
        if (!hasCompleted) {
            // Slight delay so the dashboard can load first
            const timer = setTimeout(() => setIsVisible(true), 1500);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleNext = () => {
        if (currentStep < STEPS.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            handleComplete();
        }
    };

    const handleComplete = () => {
        localStorage.setItem("nanosol_onboarding_completed", "true");
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <AnimatePresence>
            {isVisible && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-md">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-lg p-8 mx-4 overflow-hidden border rounded-3xl bg-card/40 backdrop-blur-xl border-white/10 shadow-2xl"
                    >
                        {/* Background Glow */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl -z-10 translate-x-1/2 -translate-y-1/2" />
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl -z-10 -translate-x-1/2 translate-y-1/2" />

                        <button
                            onClick={handleComplete}
                            className="absolute top-6 right-6 text-muted-foreground hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="flex flex-col items-center text-center mt-4">
                            <motion.div
                                key={currentStep}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3 }}
                                className="mb-6 p-4 rounded-full bg-white/5 border border-white/10"
                            >
                                {STEPS[currentStep].icon}
                            </motion.div>
                            
                            <motion.h2 
                                key={`h2-${currentStep}`}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="text-2xl font-semibold mb-3 tracking-tight"
                            >
                                {STEPS[currentStep].title}
                            </motion.h2>

                            <motion.p 
                                key={`p-${currentStep}`}
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="text-muted-foreground mb-8 leading-relaxed"
                            >
                                {STEPS[currentStep].description}
                            </motion.p>
                        </div>

                        <div className="flex items-center justify-between w-full mt-4">
                            {/* Step Indicators */}
                            <div className="flex gap-2">
                                {STEPS.map((_, i) => (
                                    <div 
                                        key={i} 
                                        className={`h-1.5 rounded-full transition-all duration-300 ${i === currentStep ? 'w-6 bg-primary' : 'w-2 bg-white/20'}`} 
                                    />
                                ))}
                            </div>

                            <Button 
                                onClick={handleNext}
                                className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 rounded-full px-6"
                            >
                                {currentStep === STEPS.length - 1 ? "Get Started" : "Next"}
                                {currentStep < STEPS.length - 1 && <ArrowRight className="w-4 h-4" />}
                            </Button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
