"use client";

import JsSIP from "jssip";
import { useDialerStore } from "@/lib/stores";

export interface SipConfig {
    uri: string;
    password?: string;
    ws_servers: string | string[];
    display_name?: string;
}

// Declare global type for window storage
declare global {
    interface Window {
        __SIP_SERVICE__?: SipService;
    }
}

export class SipService {
    private uas: Map<string, JsSIP.UA> = new Map();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private sessions: Map<string, any> = new Map();
    private _activeUAId: string | null = null;
    private _isConnected: Map<string, boolean> = new Map();
    private _isRegistered: Map<string, boolean> = new Map();
    private _isHangingUp: boolean = false;
    private _remoteStream: MediaStream | null = null;

    private constructor() { }

    public static getInstance(): SipService {
        if (typeof window !== "undefined") {
            if (!window.__SIP_SERVICE__) {
                window.__SIP_SERVICE__ = new SipService();
            }
            return window.__SIP_SERVICE__;
        }
        return new SipService();
    }

    public get activeUAId() { return this._activeUAId; }
    public set activeUAId(id: string | null) { this._activeUAId = id; }

    public isConnected(id?: string) {
        const targetId = id || this._activeUAId;
        return targetId ? (this._isConnected.get(targetId) || false) : false;
    }

    public isRegistered(id?: string) {
        const targetId = id || this._activeUAId;
        return targetId ? (this._isRegistered.get(targetId) || false) : false;
    }

    public hasUA(id?: string) {
        const targetId = id || this._activeUAId;
        return targetId ? this.uas.has(targetId) : this.uas.size > 0;
    }

    public get remoteStream() { return this._remoteStream; }

    public async connect(config: SipConfig, id: string = "default") {
        if (typeof window === "undefined") return;

        // If already connected for this ID, don't re-connect
        if (this.uas.has(id) && this._isConnected.get(id)) return;

        try {
            console.log(`[SIP] Connecting account ${id}: ${config.uri}`);
            console.log(`[SIP] WebSocket servers:`, config.ws_servers);
            const wsServer = Array.isArray(config.ws_servers) ? config.ws_servers[0] : config.ws_servers;
            console.log(`[SIP] Using WebSocket server:`, wsServer);

            const socket = new JsSIP.WebSocketInterface(wsServer);

            // Add WebSocket event listeners for debugging
            socket.via_transport = "wss";

            const ua = new JsSIP.UA({
                uri: config.uri,
                password: config.password,
                display_name: config.display_name,
                sockets: [socket],
                register: true,
                session_timers: false,
                connection_recovery_min_interval: 2,
                connection_recovery_max_interval: 30,
            });

            this.uas.set(id, ua);
            this.setupEventHandlers(id);

            // Log UA events for debugging
            ua.on('connecting', () => {
                console.log(`[SIP] Account ${id} connecting...`);
            });

            ua.start();

            // Set as active if it's the first one or if none active
            if (!this._activeUAId) {
                this._activeUAId = id;
            }
        } catch (error) {
            console.error(`[SIP] Failed to initialize SIP UA for ${id}:`, error);
            console.error(`[SIP] Config was:`, {
                uri: config.uri,
                ws_servers: config.ws_servers,
                display_name: config.display_name
            });
            if (id === "default") this.enableDemoMode("default");
        }
    }

    public disconnect(id?: string) {
        if (id) {
            const ua = this.uas.get(id);
            if (ua) {
                ua.stop();
                this.uas.delete(id);
            }
            this._isConnected.delete(id);
            this._isRegistered.delete(id);
            this.sessions.delete(id);
            if (this._activeUAId === id) this._activeUAId = null;
        } else {
            // Disconnect all
            this.uas.forEach((ua) => ua.stop());
            this.uas.clear();
            this._isConnected.clear();
            this._isRegistered.clear();
            this.sessions.clear();
            this._activeUAId = null;
        }
        this._remoteStream = null;
    }

    public call(target: string, accountId?: string) {
        const id = accountId || this._activeUAId;
        const ua = id ? this.uas.get(id) : null;
        const registered = id ? this._isRegistered.get(id) : false;

        if (!ua || !registered) {
            console.warn(`[SIP] Cannot place call: Account ${id} not ready. Falling back to simulation.`);
            this.simulateCall();
            return;
        }

        let remoteAudio = document.getElementById("sip-remote-audio") as HTMLAudioElement;
        if (!remoteAudio) {
            remoteAudio = document.createElement("audio");
            remoteAudio.id = "sip-remote-audio";
            remoteAudio.autoplay = true;
            document.body.appendChild(remoteAudio);
        }

        const eventHandlers = {
            progress: () => useDialerStore.getState().setCallStatus("ringing"),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            failed: (e: any) => {
                if (this._isHangingUp) {
                    this._isHangingUp = false;
                    useDialerStore.getState().endCall();
                    return;
                }
                window.dispatchEvent(new CustomEvent("sip:call:failed", { detail: e }));
                useDialerStore.getState().endCall();
            },
            ended: () => {
                this.sessions.delete(id!);
                useDialerStore.getState().endCall();
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            confirmed: (e: any) => {
                useDialerStore.getState().setCallStatus("active");
                this.sessions.set(id!, e.session);
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            peerconnection: (e: any) => {
                const peerconnection = e.peerconnection as RTCPeerConnection;
                peerconnection.ontrack = (event: RTCTrackEvent) => {
                    if (event.track.kind === "audio" && remoteAudio) {
                        this._remoteStream = event.streams[0];
                        remoteAudio.srcObject = this._remoteStream;
                        remoteAudio.play().catch(() => { });
                    }
                };
            }
        };

        const options = {
            eventHandlers,
            mediaConstraints: { audio: true, video: false },
            rtcOfferConstraints: { offerToReceiveAudio: true, offerToReceiveVideo: false }
        };

        try {
            console.log(`[SIP] Placing call from account ${id} to ${target}`);
            const session = ua.call(target, options);
            this.sessions.set(id!, session);
        } catch (e) {
            console.error("Call error:", e);
            this.simulateCall();
        }
    }

    public answer(accountId?: string) {
        const id = accountId || this._activeUAId;
        const session = id ? this.sessions.get(id) : null;
        if (session) {
            session.answer({ mediaConstraints: { audio: true, video: false } });
        }
    }

    public hangup(accountId?: string) {
        const id = accountId || this._activeUAId;

        if (typeof document !== "undefined") {
            const remoteAudio = document.getElementById("sip-remote-audio") as HTMLAudioElement;
            if (remoteAudio) {
                remoteAudio.pause();
                remoteAudio.srcObject = null;
            }
        }
        this._remoteStream = null;

        const session = id ? this.sessions.get(id) : null;
        if (session) {
            try {
                this._isHangingUp = true;
                this.sessions.delete(id!);
                session.terminate();
            } catch {
                this._isHangingUp = false;
            }
        }
        useDialerStore.getState().endCall();
    }

    public sendDTMF(tone: string, accountId?: string) {
        const id = accountId || this._activeUAId;
        const session = id ? this.sessions.get(id) : null;
        if (session) session.sendDTMF(tone);
    }

    public mute(isMuted: boolean, accountId?: string) {
        const id = accountId || this._activeUAId;
        const session = id ? this.sessions.get(id) : null;
        if (session) {
            if (isMuted) session.mute();
            else session.unmute();
        }
    }

    private setupEventHandlers(id: string) {
        const ua = this.uas.get(id);
        if (!ua) return;

        ua.on('connected', () => {
            console.log(`[SIP] ✅ Account ${id} connected to WebSocket`);
            this._isConnected.set(id, true);
        });

        ua.on('disconnected', (data) => {
            console.log(`[SIP] ❌ Account ${id} disconnected from WebSocket`, data);
            console.log(`[SIP] Disconnect reason:`, data?.error || 'Unknown');
            this._isConnected.set(id, false);
        });

        ua.on('registered', (data) => {
            console.log(`[SIP] ✅ Account ${id} successfully registered`, data);
            this._isRegistered.set(id, true);
        });

        ua.on('unregistered', (data) => {
            console.log(`[SIP] Account ${id} unregistered`, data);
            this._isRegistered.set(id, false);
        });

        ua.on('registrationFailed', (data) => {
            console.error(`[SIP] ❌ Account ${id} registration failed:`, data);
            console.error(`[SIP] Response:`, data?.response);
            console.error(`[SIP] Cause:`, data?.cause);
            this._isRegistered.set(id, false);
        });

        ua.on('registrationExpiring', () => {
            console.log(`[SIP] Account ${id} registration expiring, will re-register...`);
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ua.on('newRTCSession', (data: { session: any }) => {
            const session = data.session;
            if (session.direction === 'incoming') {
                console.log(`[SIP] Incoming call on account ${id}`);
                this.sessions.set(id, session);
                this._activeUAId = id; // Switch to the account receiving the call

                const store = useDialerStore.getState();
                store.setCurrentNumber(session.remote_identity.uri.user);
                store.openDialer();
                store.setCallStatus("ringing");

                session.on('ended', () => {
                    store.endCall();
                    this.sessions.delete(id);
                });
                session.on('failed', () => {
                    store.endCall();
                    this.sessions.delete(id);
                });
                session.on('accepted', () => {
                    store.setCallStatus("active");
                });
            }
        });
    }

    private simulateCall() {
        const store = useDialerStore.getState();
        store.startCall();
        setTimeout(() => {
            if (store.callStatus === 'ended') return;
            store.setCallStatus("ringing");
            setTimeout(() => {
                if (store.callStatus === 'ended') return;
                store.setCallStatus("active");
            }, 2000);
        }, 1000);
    }

    public simulateIncomingCall(from: string) {
        const store = useDialerStore.getState();
        store.setCurrentNumber(from);
        store.openDialer();
        store.startCall();
        store.setCallStatus("ringing");
    }

    private enableDemoMode(id: string) {
        this._isConnected.set(id, true);
        this._isRegistered.set(id, true);
    }
}
