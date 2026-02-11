/**
 * Structured Logger for Production-Grade Observability
 * 
 * Features:
 * - Multiple log levels (debug, info, warn, error)
 * - Performance tracking
 * - Contextual metadata
 * - Console formatting with colors
 * - Future: Can be extended to send to external services (Sentry, LogRocket, etc.)
 */

export enum LogLevel {
    DEBUG = 'DEBUG',
    INFO = 'INFO',
    WARN = 'WARN',
    ERROR = 'ERROR',
    PERFORMANCE = 'PERFORMANCE',
}

interface LogEntry {
    level: LogLevel;
    message: string;
    timestamp: string;
    context?: Record<string, any>;
    error?: Error;
    duration?: number;
}

class Logger {
    private isDevelopment = import.meta.env.DEV;
    private logHistory: LogEntry[] = [];
    private maxHistorySize = 100;

    /**
     * Log debug information (only in development)
     */
    debug(message: string, context?: Record<string, any>): void {
        if (!this.isDevelopment) return;

        this.log({
            level: LogLevel.DEBUG,
            message,
            timestamp: new Date().toISOString(),
            context,
        });
    }

    /**
     * Log general information
     */
    info(message: string, context?: Record<string, any>): void {
        this.log({
            level: LogLevel.INFO,
            message,
            timestamp: new Date().toISOString(),
            context,
        });
    }

    /**
     * Log warnings
     */
    warn(message: string, context?: Record<string, any>): void {
        this.log({
            level: LogLevel.WARN,
            message,
            timestamp: new Date().toISOString(),
            context,
        });
    }

    /**
     * Log errors
     */
    error(message: string, error?: Error, context?: Record<string, any>): void {
        this.log({
            level: LogLevel.ERROR,
            message,
            timestamp: new Date().toISOString(),
            context,
            error,
        });

        // In production, send to error tracking service
        if (!this.isDevelopment && error) {
            this.sendToErrorTracking(message, error, context);
        }
    }

    /**
     * Log performance metrics
     */
    performance(operation: string, duration: number, context?: Record<string, any>): void {
        this.log({
            level: LogLevel.PERFORMANCE,
            message: `${operation} completed`,
            timestamp: new Date().toISOString(),
            duration,
            context,
        });

        // Warn if operation is slow
        if (duration > 1000) {
            this.warn(`Slow operation detected: ${operation}`, { duration, ...context });
        }
    }

    /**
     * Measure and log performance of an async operation
     */
    async measureAsync<T>(
        operation: string,
        fn: () => Promise<T>,
        context?: Record<string, any>
    ): Promise<T> {
        const startTime = performance.now();

        try {
            const result = await fn();
            const duration = performance.now() - startTime;
            this.performance(operation, duration, context);
            return result;
        } catch (error) {
            const duration = performance.now() - startTime;
            this.error(`${operation} failed`, error as Error, { duration, ...context });
            throw error;
        }
    }

    /**
     * Measure and log performance of a sync operation
     */
    measure<T>(
        operation: string,
        fn: () => T,
        context?: Record<string, any>
    ): T {
        const startTime = performance.now();

        try {
            const result = fn();
            const duration = performance.now() - startTime;
            this.performance(operation, duration, context);
            return result;
        } catch (error) {
            const duration = performance.now() - startTime;
            this.error(`${operation} failed`, error as Error, { duration, ...context });
            throw error;
        }
    }

    /**
     * Internal logging method
     */
    private log(entry: LogEntry): void {
        // Add to history
        this.logHistory.push(entry);
        if (this.logHistory.length > this.maxHistorySize) {
            this.logHistory.shift();
        }

        // Console output with formatting
        const timestamp = new Date(entry.timestamp).toLocaleTimeString();
        const prefix = `[${timestamp}] [${entry.level}]`;

        switch (entry.level) {
            case LogLevel.DEBUG:
                console.debug(prefix, entry.message, entry.context || '');
                break;
            case LogLevel.INFO:
                console.info(prefix, entry.message, entry.context || '');
                break;
            case LogLevel.WARN:
                console.warn(prefix, entry.message, entry.context || '');
                break;
            case LogLevel.ERROR:
                console.error(prefix, entry.message, entry.error || '', entry.context || '');
                if (entry.error?.stack) {
                    console.error(entry.error.stack);
                }
                break;
            case LogLevel.PERFORMANCE:
                const durationStr = entry.duration ? `${entry.duration.toFixed(2)}ms` : '';
                console.log(
                    `%c${prefix} ${entry.message} ${durationStr}`,
                    'color: #10b981; font-weight: bold',
                    entry.context || ''
                );
                break;
        }
    }

    /**
     * Get recent log history
     */
    getHistory(level?: LogLevel): LogEntry[] {
        if (level) {
            return this.logHistory.filter(entry => entry.level === level);
        }
        return [...this.logHistory];
    }

    /**
     * Clear log history
     */
    clearHistory(): void {
        this.logHistory = [];
    }

    /**
     * Send error to external tracking service
     * TODO: Integrate with Sentry, LogRocket, or similar
     */
    private sendToErrorTracking(
        message: string,
        error: Error,
        context?: Record<string, any>
    ): void {
        // Placeholder for external error tracking
        // Example: Sentry.captureException(error, { extra: context });
        console.log('📤 Would send to error tracking:', { message, error, context });
    }
}

// Export singleton instance
export const logger = new Logger();

// Convenience exports
export const logDebug = logger.debug.bind(logger);
export const logInfo = logger.info.bind(logger);
export const logWarn = logger.warn.bind(logger);
export const logError = logger.error.bind(logger);
export const logPerformance = logger.performance.bind(logger);
export const measureAsync = logger.measureAsync.bind(logger);
export const measure = logger.measure.bind(logger);
