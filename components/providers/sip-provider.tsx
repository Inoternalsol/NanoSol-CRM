"use client";

import { useEffect } from "react";
import { SipService } from "@/lib/services/sip-service";
import { createClient } from "@/lib/supabase/client";

export function SipProvider({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        const initSip = async () => {
            const sipService = SipService.getInstance();

            // Don't reinitialize if already connected and registered
            if (sipService.isConnected && sipService.isRegistered) {
                console.log("[SIP] Already connected and registered, skipping init");
                return;
            }

            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                console.log("[SIP] No user logged in, using demo mode");
                sipService.connect({
                    uri: "sip:guest@demo.local",
                    ws_servers: "wss://demo.local/ws",
                    display_name: "Guest"
                });
                return;
            }

            // First get the profile to get the profile.id
            const { data: userProfile } = await supabase
                .from("profiles")
                .select("id")
                .eq("user_id", user.id)
                .single();

            if (!userProfile) {
                console.log("[SIP] No profile found, using demo mode");
                sipService.connect({
                    uri: `sip:${user.email?.replace("@", "_")}@demo.local`,
                    ws_servers: "wss://demo.local/ws",
                    display_name: user.email || "User"
                });
                return;
            }

            // Fetch SIP Profile using the profile.id
            const { data: sipProfile, error } = await supabase
                .from("sip_profiles")
                .select("*")
                .eq("user_id", userProfile.id)
                .maybeSingle();

            if (error) {
                console.error("[SIP] Error fetching SIP profile:", error);
            }

            if (sipProfile && sipProfile.is_active && sipProfile.sip_domain) {
                const wsUrl = sipProfile.ws_server
                    ? sipProfile.ws_server
                    : sipProfile.outbound_proxy
                        ? `wss://${sipProfile.outbound_proxy}`
                        : `wss://${sipProfile.sip_domain}`;

                console.log(`[SIP] Connecting to ${wsUrl} as ${sipProfile.sip_username}@${sipProfile.sip_domain}`);

                sipService.connect({
                    uri: `sip:${sipProfile.sip_username}@${sipProfile.sip_domain}`,
                    password: sipProfile.sip_password_encrypted || "",
                    ws_servers: wsUrl,
                    display_name: sipProfile.display_name || sipProfile.sip_username,
                });
            } else {
                console.log("[SIP] No valid SIP profile configured, using demo mode");
                const sipUsername = (user.email || "user").replace("@", "_");
                sipService.connect({
                    uri: `sip:${sipUsername}@demo.local`,
                    ws_servers: "wss://demo.local/ws",
                    display_name: user.email || "User",
                });
            }
        };

        // Initialize SIP Service after client-side hydration
        const timer = setTimeout(() => {
            initSip();
        }, 1000);

        return () => {
            clearTimeout(timer);
            // Don't disconnect on cleanup in development to prevent hot reload issues
            // SipService.getInstance().disconnect();
        };
    }, []);

    return <>{children}</>;
}
