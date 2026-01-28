import { create } from "zustand";
import { persist } from "zustand/middleware";

// ===== UI Store =====
interface UIState {
    sidebarOpen: boolean;
    sidebarCollapsed: boolean;
    mobileSidebarOpen: boolean;
    theme: "light" | "dark" | "system";
    toggleSidebar: () => void;
    setSidebarCollapsed: (collapsed: boolean) => void;
    setMobileSidebarOpen: (open: boolean) => void;
    setTheme: (theme: "light" | "dark" | "system") => void;
}

export const useUIStore = create<UIState>()(
    persist(
        (set) => ({
            sidebarOpen: true,
            sidebarCollapsed: false,
            mobileSidebarOpen: false,
            theme: "system",
            toggleSidebar: () =>
                set((state) => ({ sidebarOpen: !state.sidebarOpen })),
            setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
            setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),
            setTheme: (theme) => set({ theme }),
        }),
        {
            name: "nanosol-ui-storage",
        }
    )
);

// ===== Dialer Store (for SIP Widget) =====
interface DialerState {
    isOpen: boolean;
    isInCall: boolean;
    currentNumber: string;
    callDuration: number;
    callStatus: "idle" | "connecting" | "ringing" | "active" | "ended";
    callStartedAt: string | null;
    callEndedAt: string | null;
    autoDialerQueue: { number: string; name: string; lastStatus?: string }[];
    autoDialerActive: boolean;
    callTimerInterval: ReturnType<typeof setInterval> | null;
    openDialer: () => void;
    closeDialer: () => void;
    setCurrentNumber: (number: string) => void;
    startCall: () => void;
    endCall: () => void;
    setCallStatus: (status: DialerState["callStatus"]) => void;
    incrementCallDuration: () => void;
    startCallTimer: () => void;
    stopCallTimer: () => void;
    setAutoDialerQueue: (queue: { number: string; name: string }[]) => void;
    updateQueueStatus: (number: string, status: "answered" | "no-answer" | "dnd" | "failed") => void;
    startAutoDialer: () => void;
    stopAutoDialer: () => void;
    nextAutoDialNumber: () => { number: string; name: string } | undefined;
}

export const useDialerStore = create<DialerState>((set, get) => ({
    isOpen: false,
    isInCall: false,
    currentNumber: "",
    callDuration: 0,
    callStatus: "idle",
    callStartedAt: null,
    callEndedAt: null,
    autoDialerQueue: [],
    autoDialerActive: false,
    callTimerInterval: null,
    openDialer: () => set({ isOpen: true }),
    closeDialer: () => set({ isOpen: false }),
    setCurrentNumber: (number) => set({ currentNumber: number }),
    startCall: () => set({
        isOpen: true,
        isInCall: true,
        callStatus: "connecting",
        callDuration: 0,
        callStartedAt: null,
        callEndedAt: null
    }),
    endCall: () => {
        get().stopCallTimer();
        set({ isInCall: false, callStatus: "ended", callEndedAt: new Date().toISOString() });
    },
    setCallStatus: (status) => {
        set({ callStatus: status });
        // Start timer when call becomes active
        if (status === "active") {
            set({ callStartedAt: new Date().toISOString() });
            get().startCallTimer();
        }
    },
    incrementCallDuration: () => set((state) => ({ callDuration: state.callDuration + 1 })),
    startCallTimer: () => {
        const currentInterval = get().callTimerInterval;
        if (currentInterval) clearInterval(currentInterval);
        const interval = setInterval(() => {
            get().incrementCallDuration();
        }, 1000);
        set({ callTimerInterval: interval });
    },
    stopCallTimer: () => {
        const interval = get().callTimerInterval;
        if (interval) {
            clearInterval(interval);
            set({ callTimerInterval: null });
        }
    },
    setAutoDialerQueue: (queue) => set({ autoDialerQueue: queue }),
    updateQueueStatus: (number, status) => set((state) => ({
        autoDialerQueue: state.autoDialerQueue.map(item =>
            item.number === number ? { ...item, lastStatus: status } : item
        )
    })),
    startAutoDialer: () => set({ autoDialerActive: true }),
    stopAutoDialer: () => set({ autoDialerActive: false }),
    nextAutoDialNumber: () => {
        const queue = get().autoDialerQueue;
        const pending = queue.filter(q => !q.lastStatus);
        if (pending.length === 0) return undefined;
        const next = pending[0];
        set({ currentNumber: next.number });
        return next;
    },
}));

// ===== Command Palette Store =====
interface CommandPaletteState {
    isOpen: boolean;
    open: () => void;
    close: () => void;
    toggle: () => void;
}

export const useCommandPaletteStore = create<CommandPaletteState>((set) => ({
    isOpen: false,
    open: () => set({ isOpen: true }),
    close: () => set({ isOpen: false }),
    toggle: () => set((state) => ({ isOpen: !state.isOpen })),
}));
