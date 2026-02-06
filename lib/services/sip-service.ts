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
    private ua: JsSIP.UA | null = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private session: any | null = null;
    private _isConnected: boolean = false;
    private _isRegistered: boolean = false;
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

    public get isConnected() { return this._isConnected; }
    public get isRegistered() { return this._isRegistered; }
    public get hasUA() { return !!this.ua; }
    public get remoteStream() { return this._remoteStream; }

    public async connect(config: SipConfig) {
        if (typeof window === "undefined") return;
        if (this.ua && this._isConnected) return;

        try {
            const wsServer = Array.isArray(config.ws_servers) ? config.ws_servers[0] : config.ws_servers;
            const socket = new JsSIP.WebSocketInterface(wsServer);

            this.ua = new JsSIP.UA({
                uri: config.uri,
                password: config.password,
                display_name: config.display_name,
                sockets: [socket],
                register: true,
            });

            this.setupEventHandlers();
            this.ua.start();
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
        this._remoteStream = null;
    }

    public call(target: string) {
        if (!this.ua || !this._isRegistered) {
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
            ended: () => useDialerStore.getState().endCall(),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            confirmed: (e: any) => {
                useDialerStore.getState().setCallStatus("active");
                this.session = e.session;
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
            this.session = this.ua.call(target, options);
        } catch (e) {
            console.error("Call error:", e);
            this.simulateCall();
        }
    }

    public answer() {
        if (this.session) {
            this.session.answer({ mediaConstraints: { audio: true, video: false } });
        }
    }

    public hangup() {
        if (typeof document !== "undefined") {
            const remoteAudio = document.getElementById("sip-remote-audio") as HTMLAudioElement;
            if (remoteAudio) {
                remoteAudio.pause();
                remoteAudio.srcObject = null;
            }
        }
        this._remoteStream = null;

        if (this.session) {
            try {
                this._isHangingUp = true;
                const s = this.session;
                this.session = null;
                s.terminate();
            } catch {
                this._isHangingUp = false;
            }
        }
        useDialerStore.getState().endCall();
    }

    public sendDTMF(tone: string) {
        if (this.session) this.session.sendDTMF(tone);
    }

    public mute(isMuted: boolean) {
        if (this.session) {
            if (isMuted) this.session.mute();
            else this.session.unmute();
        }
    }

    private setupEventHandlers() {
        if (!this.ua) return;
        this.ua.on('connected', () => { this._isConnected = true; });
        this.ua.on('disconnected', () => { this._isConnected = false; });
        this.ua.on('registered', () => { this._isRegistered = true; });
        this.ua.on('unregistered', () => { this._isRegistered = false; });
        this.ua.on('registrationFailed', () => { this._isRegistered = false; });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.ua.on('newRTCSession', (data: { session: any }) => {
            const session = data.session;
            if (session.direction === 'incoming') {
                this.session = session;
                const store = useDialerStore.getState();
                store.setCurrentNumber(session.remote_identity.uri.user);
                store.openDialer();
                store.setCallStatus("ringing");
                session.on('ended', () => { store.endCall(); this.session = null; });
                session.on('failed', () => { store.endCall(); this.session = null; });
                session.on('accepted', () => { store.setCallStatus("active"); });
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

    private enableDemoMode() {
        this._isConnected = true;
        this._isRegistered = true;
    }
}
