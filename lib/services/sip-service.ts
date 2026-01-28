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
    private ua: JsSIP.UA | null = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private session: any | null = null;
    private _isConnected: boolean = false;
    private _isRegistered: boolean = false;
    private _isHangingUp: boolean = false; // Track intentional hangups

    private constructor() {
        // Private constructor for singleton
    }

    public static getInstance(): SipService {
        // Use window to persist across hot reloads
        if (typeof window !== "undefined") {
            if (!window.__SIP_SERVICE__) {
                window.__SIP_SERVICE__ = new SipService();
            }
            return window.__SIP_SERVICE__;
        }
        // Fallback for SSR
        return new SipService();
    }

    public get isConnected() {
        return this._isConnected;
    }

    public get isRegistered() {
        return this._isRegistered;
    }

    public get hasUA() {
        return !!this.ua;
    }

    public async connect(config: SipConfig) {
        if (typeof window === "undefined") return;

        // Don't reconnect if already connected
        if (this.ua && this._isConnected) {
            console.log("[SIP] Already connected, skipping reconnect");
            return;
        }

        try {
            const wsServer = Array.isArray(config.ws_servers) ? config.ws_servers[0] : config.ws_servers;
            console.log(`[SIP] Creating UA for ${config.uri} via ${wsServer}`);

            const socket = new JsSIP.WebSocketInterface(wsServer);

            this.ua = new JsSIP.UA({
                uri: config.uri,
                password: config.password,
                display_name: config.display_name,
                sockets: [socket],
                register: true,
            });

            console.log("[SIP] UA created, setting up handlers...");
            this.setupEventHandlers();
            this.ua.start();
            console.log("[SIP] UA started, hasUA:", !!this.ua);
        } catch (error) {
            console.error("Failed to initialize SIP UA:", error);
            this.enableDemoMode();
        }
    }

    public disconnect() {
        if (this.ua) {
            this.ua.stop();
            this.ua = null;
        }
        this._isConnected = false;
        this._isRegistered = false;
    }

    public call(target: string) {
        if (!this.ua || !this._isRegistered) {
            console.warn("SIP UA not ready. Using demo mode.", {
                hasUA: !!this.ua,
                isRegistered: this._isRegistered,
                isConnected: this._isConnected
            });
            this.simulateCall(target);
            return;
        }

        // Create or get audio element for remote stream
        let remoteAudio = document.getElementById("sip-remote-audio") as HTMLAudioElement;
        if (!remoteAudio) {
            remoteAudio = document.createElement("audio");
            remoteAudio.id = "sip-remote-audio";
            remoteAudio.autoplay = true;
            document.body.appendChild(remoteAudio);
        }

        const eventHandlers = {
            progress: () => {
                console.log("[SIP] Call progress - ringing");
                useDialerStore.getState().setCallStatus("ringing");
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            failed: (e: any) => {
                // Don't show errors for user-initiated hangups
                if (this._isHangingUp) {
                    console.log("[SIP] Call ended by user");
                    this._isHangingUp = false;
                    useDialerStore.getState().endCall();
                    return;
                }

                const statusCode = e.message?.status_code;
                const reasonPhrase = e.message?.reason_phrase;

                // Log to console for debugging (not as error to avoid scaring users in dev tools)
                console.log("[SIP] Call failed:", {
                    cause: e.cause,
                    message: statusCode,
                    reason: reasonPhrase,
                    originator: e.originator,
                });

                // Emit custom event for UI to catch and display friendly message
                if (typeof window !== "undefined") {
                    window.dispatchEvent(new CustomEvent("sip:call:failed", {
                        detail: {
                            cause: e.cause,
                            message: statusCode,
                            reason: reasonPhrase,
                            originator: e.originator
                        }
                    }));
                }

                useDialerStore.getState().endCall();
            },
            ended: () => {
                console.log("[SIP] Call ended");
                useDialerStore.getState().endCall();
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            confirmed: (e: any) => {
                console.log("[SIP] Call confirmed/connected");
                useDialerStore.getState().setCallStatus("active");
                this.session = e.session;
            },
            // Handle peer connection for audio streams
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            peerconnection: (e: any) => {
                console.log("[SIP] RTCPeerConnection established");
                const peerconnection = e.peerconnection as RTCPeerConnection;

                // Handle incoming remote audio stream
                peerconnection.ontrack = (event: RTCTrackEvent) => {
                    console.log("[SIP] Remote track received:", event.track.kind);
                    if (event.track.kind === "audio" && remoteAudio) {
                        remoteAudio.srcObject = event.streams[0];
                        remoteAudio.play().catch(err => {
                            console.error("[SIP] Failed to play remote audio:", err);
                        });
                    }
                };
            }
        };

        const options = {
            eventHandlers: eventHandlers,
            mediaConstraints: { audio: true, video: false },
            rtcOfferConstraints: { offerToReceiveAudio: true, offerToReceiveVideo: false }
        };

        try {
            console.log(`[SIP] Calling ${target}...`);
            this.session = this.ua.call(target, options);
        } catch (e) {
            console.error("Call error:", e);
            this.simulateCall(target);
        }
    }

    public answer() {
        if (this.session) {
            this.session.answer({
                mediaConstraints: { audio: true, video: false }
            });
        }
    }

    public hangup() {
        console.log("[SIP] Hangup called, session exists:", !!this.session);

        // Stop the remote audio element
        if (typeof document !== "undefined") {
            const remoteAudio = document.getElementById("sip-remote-audio") as HTMLAudioElement;
            if (remoteAudio) {
                remoteAudio.pause();
                remoteAudio.srcObject = null;
                console.log("[SIP] Remote audio stopped");
            }
        }

        if (this.session) {
            try {
                // Set flag to suppress error events from the failed handler
                this._isHangingUp = true;
                console.log("[SIP] Terminating session...");
                // Store reference and clear before terminating
                const session = this.session;
                this.session = null;
                session.terminate();
                console.log("[SIP] Session terminated successfully");
            } catch (err) {
                // Session may already be ended, ignore errors
                console.log("[SIP] Session already ended or error during hangup:", err);
                this._isHangingUp = false;
            }
        } else {
            console.log("[SIP] No active session to terminate");
        }
        // Always end the call in UI
        useDialerStore.getState().endCall();
    }

    public sendDTMF(tone: string) {
        if (this.session) {
            this.session.sendDTMF(tone);
        }
    }

    public mute(isMuted: boolean) {
        if (this.session) {
            if (isMuted) {
                this.session.mute();
            } else {
                this.session.unmute();
            }
        }
    }

    private setupEventHandlers() {
        if (!this.ua) return;

        this.ua.on('connected', () => {
            this._isConnected = true;
            console.log('SIP WebSocket connected');
        });

        this.ua.on('disconnected', () => {
            this._isConnected = false;
            console.log('SIP WebSocket disconnected');
        });

        this.ua.on('registered', () => {
            this._isRegistered = true;
            console.log('SIP User Agent registered');
        });

        this.ua.on('unregistered', () => {
            this._isRegistered = false;
            console.log('SIP User Agent unregistered');
        });

        this.ua.on('registrationFailed', () => {
            this._isRegistered = false;
            console.warn('SIP Registration failed');
        });

        this.ua.on('newRTCSession', (data: any) => {
            const session = data.session;

            if (session.direction === 'incoming') {
                this.session = session;

                const { remote_identity } = session;
                const callerNumber = remote_identity.uri.user;

                const store = useDialerStore.getState();
                store.setCurrentNumber(callerNumber);
                store.openDialer();
                store.setCallStatus("ringing");

                session.on('ended', () => {
                    store.endCall();
                    this.session = null;
                });

                session.on('failed', () => {
                    store.endCall();
                    this.session = null;
                });

                session.on('accepted', () => {
                    store.setCallStatus("active");
                });
            }
        });
    }

    // Demo Mode Simulation
    private simulateCall(target: string) {
        const store = useDialerStore.getState();
        store.startCall();

        console.log(`[Demo] Calling ${target}...`);

        // Simulate ringing after 1s
        setTimeout(() => {
            if (store.callStatus === 'ended') return;
            store.setCallStatus("ringing");
            console.log("[Demo] Ringing...");

            // Simulate connected after 2s
            setTimeout(() => {
                if (store.callStatus === 'ended') return;
                store.setCallStatus("active");
                console.log("[Demo] Connected!");
            }, 2000);
        }, 1000);
    }

    public simulateIncomingCall(from: string) {
        const store = useDialerStore.getState();
        store.setCurrentNumber(from);
        store.openDialer();
        store.setCallStatus("ringing");
        // We set isInCall to true by using startCall, but we want status to be ringing initially
        store.startCall();
        store.setCallStatus("ringing");
    }

    private enableDemoMode() {
        console.log("SIP Service: Demo Mode Enabled");
        this._isConnected = true;
        this._isRegistered = true;
    }
}
