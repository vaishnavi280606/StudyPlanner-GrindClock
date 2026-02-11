/**
 * Global Error Boundary Component
 * 
 * Catches React errors and displays a user-friendly fallback UI
 * Logs errors for debugging and monitoring
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { logger } from '../utils/logger';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        return {
            hasError: true,
            error,
        };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        // Log error
        logger.error('React Error Boundary caught an error', error, {
            componentStack: errorInfo.componentStack,
        });

        // Call custom error handler if provided
        this.props.onError?.(error, errorInfo);

        // Update state with error info
        this.setState({
            errorInfo,
        });
    }

    handleReset = (): void => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        });
    };

    handleGoHome = (): void => {
        this.handleReset();
        window.location.href = '/';
    };

    render(): ReactNode {
        if (this.state.hasError) {
            // Use custom fallback if provided
            if (this.props.fallback) {
                return this.props.fallback;
            }

            // Default error UI
            return (
                <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
                    <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8">
                        {/* Error Icon */}
                        <div className="flex justify-center mb-6">
                            <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                                <AlertTriangle className="w-10 h-10 text-red-600 dark:text-red-400" />
                            </div>
                        </div>

                        {/* Error Message */}
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-4">
                            Oops! Something went wrong
                        </h1>

                        <p className="text-gray-600 dark:text-gray-300 text-center mb-6">
                            We're sorry for the inconvenience. The application encountered an unexpected error.
                        </p>

                        {/* Error Details (Development Only) */}
                        {import.meta.env.DEV && this.state.error && (
                            <div className="mb-6 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
                                <p className="text-sm font-mono text-red-600 dark:text-red-400 mb-2">
                                    {this.state.error.message}
                                </p>
                                {this.state.errorInfo && (
                                    <details className="text-xs text-gray-600 dark:text-gray-400">
                                        <summary className="cursor-pointer hover:text-gray-900 dark:hover:text-gray-200">
                                            Component Stack
                                        </summary>
                                        <pre className="mt-2 overflow-auto max-h-40">
                                            {this.state.errorInfo.componentStack}
                                        </pre>
                                    </details>
                                )}
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-3">
                            <button
                                onClick={this.handleReset}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all font-medium"
                            >
                                <RefreshCw className="w-5 h-5" />
                                Try Again
                            </button>

                            <button
                                onClick={this.handleGoHome}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all font-medium"
                            >
                                <Home className="w-5 h-5" />
                                Go Home
                            </button>
                        </div>

                        {/* Help Text */}
                        <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-6">
                            If this problem persists, please contact support or try refreshing the page.
                        </p>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

/**
 * Functional wrapper for easier use
 */
export function withErrorBoundary<P extends object>(
    Component: React.ComponentType<P>,
    fallback?: ReactNode
): React.FC<P> {
    return (props: P) => (
        <ErrorBoundary fallback={fallback}>
            <Component {...props} />
        </ErrorBoundary>
    );
}
