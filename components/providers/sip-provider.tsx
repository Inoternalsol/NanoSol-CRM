"use client";

import { useEffect } from "react";
import { SipService } from "@/lib/services/sip-service";
import { createClient } from "@/lib/supabase/client";
import { useDialerStore } from "@/lib/stores";

export function SipProvider({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        const initSip = async () => {
            const sipService = SipService.getInstance();

            // Don't reinitialize if already connected and registered
            if (sipService.isConnected() && sipService.isRegistered()) {
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

            // Fetch all active SIP Profiles using the profile.id
            const { data: sipProfiles, error } = await supabase
                .from("sip_profiles")
                .select("*")
                .eq("user_id", userProfile.id)
                .eq("is_active", true);

            if (error) {
                console.error("[SIP] Error fetching SIP profiles:", error);
            }

            if (sipProfiles && sipProfiles.length > 0) {
                sipProfiles.forEach(sipProfile => {
                    const wsUrl = sipProfile.ws_server
                        ? sipProfile.ws_server
                        : sipProfile.outbound_proxy
                            ? `wss://${sipProfile.outbound_proxy}`
                            : `wss://${sipProfile.sip_domain}`;

                    console.log(`[SIP] Connecting account ${sipProfile.name} to ${wsUrl} as ${sipProfile.sip_username}@${sipProfile.sip_domain}`);

                    sipService.connect({
                        uri: `sip:${sipProfile.sip_username}@${sipProfile.sip_domain}`,
                        password: sipProfile.sip_password_encrypted || "",
                        ws_servers: wsUrl,
                        display_name: sipProfile.display_name || sipProfile.sip_username,
                    }, sipProfile.id);

                    // If this is the default account, set it in the store
                    if (sipProfile.is_default) {
                        useDialerStore.getState().setSelectedSipAccountId(sipProfile.id);
                        sipService.activeUAId = sipProfile.id;
                    }
                });

                // If no default was set, use the first one
                if (!sipService.activeUAId && sipProfiles.length > 0) {
                    useDialerStore.getState().setSelectedSipAccountId(sipProfiles[0].id);
                    sipService.activeUAId = sipProfiles[0].id;
                }
            } else {
                console.log("[SIP] No valid SIP profiles configured, using demo mode");
                const sipUsername = (user.email || "user").replace("@", "_");
                sipService.connect({
                    uri: `sip:${sipUsername}@demo.local`,
                    ws_servers: "wss://demo.local/ws",
                    display_name: user.email || "User",
                }, "demo");
                useDialerStore.getState().setSelectedSipAccountId("demo");
                sipService.activeUAId = "demo";
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
