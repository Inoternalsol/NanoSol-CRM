import { createBrowserClient } from "@supabase/ssr";

let supabase: ReturnType<typeof createBrowserClient>;

export function createClient() {
    if (typeof window === 'undefined') {
        return createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
    }

    if (!supabase) {
        supabase = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                auth: {
                    // Custom lock implementation to prevent "Lock broken by another request with the 'steal' option"
                    // Providing a no-op lock disables the cross-tab locking mechanism which is prone to 
                    // AbortError in multi-tab environments under Next.js 15.
                    lock: async (_name, _acquireTimeout, fn) => {
                        return await fn();
                    },
                },
            }
        );
    }

    return supabase;
}
