/**
 * Structured Logging Utility
 * 
 * Provides consistent, structured logging across the application.
 * In production, these could be sent to a logging service like Datadog or Logtail.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
    level: LogLevel;
    message: string;
    timestamp: string;
    context?: Record<string, unknown>;
    error?: {
        name: string;
        message: string;
        stack?: string;
    };
}

interface LoggerOptions {
    minLevel?: LogLevel;
    service?: string;
}

const LOG_LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};

class Logger {
    private minLevel: number;
    private service: string;

    constructor(options: LoggerOptions = {}) {
        this.minLevel = LOG_LEVELS[options.minLevel || (process.env.NODE_ENV === "production" ? "info" : "debug")];
        this.service = options.service || "nanosol-crm";
    }

    private shouldLog(level: LogLevel): boolean {
        return LOG_LEVELS[level] >= this.minLevel;
    }

    private formatEntry(level: LogLevel, message: string, context?: Record<string, unknown>, error?: Error): LogEntry {
        const entry: LogEntry = {
            level,
            message,
            timestamp: new Date().toISOString(),
        };

        if (context) {
            entry.context = context;
        }

        if (error) {
            entry.error = {
                name: error.name,
                message: error.message,
                stack: error.stack,
            };
        }

        return entry;
    }

    private log(level: LogLevel, message: string, context?: Record<string, unknown>, error?: Error): void {
        if (!this.shouldLog(level)) return;

        const entry = this.formatEntry(level, message, context, error);

        // In production, format as JSON for log aggregation
        if (process.env.NODE_ENV === "production") {
            const output = JSON.stringify({ ...entry, service: this.service });

            switch (level) {
                case "error":
                    console.error(output);
                    break;
                case "warn":
                    console.warn(output);
                    break;
                default:
                    console.log(output);
            }
        } else {
            // In development, use colorful console output
            const prefix = this.getPrefix(level);
            console.log(prefix, message, context || "", error || "");
        }

        // TODO: Send to external logging service
        // this.sendToService(entry);
    }

    private getPrefix(level: LogLevel): string {
        const prefixes: Record<LogLevel, string> = {
            debug: "🔍 [DEBUG]",
            info: "ℹ️  [INFO]",
            warn: "⚠️  [WARN]",
            error: "❌ [ERROR]",
        };
        return prefixes[level];
    }

    debug(message: string, context?: Record<string, unknown>): void {
        this.log("debug", message, context);
    }

    info(message: string, context?: Record<string, unknown>): void {
        this.log("info", message, context);
    }

    warn(message: string, context?: Record<string, unknown>): void {
        this.log("warn", message, context);
    }

    error(message: string, error?: Error, context?: Record<string, unknown>): void {
        this.log("error", message, context, error);
    }

    /**
     * Log an API request
     */
    request(method: string, path: string, context?: Record<string, unknown>): void {
        this.info(`${method} ${path}`, { type: "request", ...context });
    }

    /**
     * Log an API response
     */
    response(method: string, path: string, status: number, durationMs: number): void {
        const level: LogLevel = status >= 500 ? "error" : status >= 400 ? "warn" : "info";
        this.log(level, `${method} ${path} ${status}`, { type: "response", status, durationMs });
    }

    /**
     * Log a database query
     */
    query(table: string, operation: string, durationMs?: number): void {
        this.debug(`DB: ${operation} on ${table}`, { type: "query", table, operation, durationMs });
    }
}

// Default logger instance
export const logger = new Logger();

// Create custom logger with options
export function createLogger(options: LoggerOptions): Logger {
    return new Logger(options);
}

/**
 * Middleware helper to log API requests
 */
export function withLogging<T>(
    handler: (request: Request) => Promise<T>,
    name: string
): (request: Request) => Promise<T> {
    return async (request: Request) => {
        const startTime = Date.now();
        const { method } = request;
        const url = new URL(request.url);

        logger.request(method, url.pathname);

        try {
            const result = await handler(request);
            const duration = Date.now() - startTime;

            if (result instanceof Response) {
                logger.response(method, url.pathname, result.status, duration);
            }

            return result;
        } catch (error) {
            const duration = Date.now() - startTime;
            logger.error(`Error in ${name}`, error instanceof Error ? error : new Error(String(error)), {
                method,
                path: url.pathname,
                durationMs: duration,
            });
            throw error;
        }
    };
}
