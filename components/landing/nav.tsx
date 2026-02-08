"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LandingNav() {
    return (
        <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                            <Sparkles className="h-5 w-5 text-primary-foreground" />
                        </div>
                        <span className="text-xl font-bold">NanoSol CRM</span>
                    </div>
                    <div className="hidden md:flex items-center gap-8">
                        <Link
                            href="#features"
                            className="text-sm text-muted-foreground hover:text-foreground transition"
                        >
                            Features
                        </Link>
                        <Link
                            href="#pricing"
                            className="text-sm text-muted-foreground hover:text-foreground transition"
                        >
                            Pricing
                        </Link>
                        <Link
                            href="#testimonials"
                            className="text-sm text-muted-foreground hover:text-foreground transition"
                        >
                            Testimonials
                        </Link>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" asChild>
                            <Link href="/login">Sign in</Link>
                        </Button>
                        <Button asChild>
                            <Link href="/signup">Get Started</Link>
                        </Button>
                    </div>
                </div>
            </div>
        </nav>
    );
}
