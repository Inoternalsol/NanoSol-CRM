/**
 * Unit Tests for JanusUA Guards & Robustness
 */

import { JanusUA } from "../lib/janus/janus-ua";

// Mock WebSocket global
class MockWebSocket {
    public onopen: (() => void) | null = null;
    public onerror: ((err: any) => void) | null = null;
    public onclose: (() => void) | null = null;
    public onmessage: ((msg: any) => void) | null = null;
    public readyState: number = 1;
    public send = jest.fn();
    public close = jest.fn();
}

beforeAll(() => {
    (global as any).WebSocket = MockWebSocket;
    (global as any).window = {};
    (global as any).navigator = {
        mediaDevices: {
            getUserMedia: jest.fn().mockResolvedValue({
                getTracks: () => [{ stop: jest.fn() }]
            }),
            addEventListener: jest.fn()
        }
    };
});

describe("JanusUA Guards and Try-Catch Robustness", () => {
    let ua: JanusUA;

    beforeEach(() => {
        ua = new JanusUA({
            uri: "sip:1001@localhost",
            janus_url: "ws://localhost:8188",
        });
    });

    afterEach(() => {
        ua.stop();
    });

    it("should fail to call() and throw a readable error if activeHandleId is null", async () => {
        await expect(ua.call("sip:1002@localhost")).rejects.toThrow(
            "SIP not registered yet. Please wait for registration to complete before placing a call."
        );
    });

    it("should execute hangup() without throwing when client is not attached", async () => {
        // Should not throw even if client.sendMessage fails or throws "Not attached"
        await expect(ua.hangup()).resolves.not.toThrow();
    });

    it("should execute decline() without throwing when client is not attached", async () => {
        await expect(ua.decline()).resolves.not.toThrow();
    });

    it("should not throw or fail DTMF send when peerconnection is active but activeHandleId is null", async () => {
        // Mock peerConnection
        (ua as any).pc = {
            sendDTMF: jest.fn(),
            close: jest.fn()
        };
        await expect(ua.sendDTMF("1")).resolves.not.toThrow();
    });
});
