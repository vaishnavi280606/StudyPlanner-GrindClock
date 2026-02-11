/**
 * Reusable Loading Skeleton Components
 * 
 * Provides skeleton loaders for various UI elements
 * Improves perceived performance during data loading
 */

import React from 'react';

interface SkeletonProps {
    className?: string;
}

/**
 * Base skeleton component with shimmer animation
 */
export const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => {
    return (
        <div
            className={`animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 bg-[length:200%_100%] rounded ${className}`}
            style={{
                animation: 'shimmer 2s infinite',
            }}
        />
    );
};

/**
 * Mentor Card Skeleton
 */
export const MentorCardSkeleton: React.FC = () => {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
            {/* Avatar and Name */}
            <div className="flex items-start gap-4 mb-4">
                <Skeleton className="w-16 h-16 rounded-full flex-shrink-0" />
                <div className="flex-1">
                    <Skeleton className="h-6 w-32 mb-2" />
                    <Skeleton className="h-4 w-24" />
                </div>
            </div>

            {/* Bio */}
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-5/6 mb-4" />

            {/* Skills */}
            <div className="flex gap-2 mb-4">
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-14 rounded-full" />
            </div>

            {/* Rating and Button */}
            <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-10 w-28 rounded-lg" />
            </div>
        </div>
    );
};

/**
 * Session Request Skeleton
 */
export const SessionRequestSkeleton: React.FC = () => {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
            <div className="flex items-start gap-3 mb-3">
                <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" />
                <div className="flex-1">
                    <Skeleton className="h-5 w-32 mb-2" />
                    <Skeleton className="h-4 w-48" />
                </div>
            </div>
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-4/5 mb-3" />
            <div className="flex gap-2">
                <Skeleton className="h-9 w-24 rounded-lg" />
                <Skeleton className="h-9 w-24 rounded-lg" />
            </div>
        </div>
    );
};

/**
 * Chat Message Skeleton
 */
export const ChatMessageSkeleton: React.FC = () => {
    return (
        <div className="flex gap-3 mb-4">
            <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
            <div className="flex-1">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-16 w-full rounded-lg" />
            </div>
        </div>
    );
};

/**
 * Analytics Chart Skeleton
 */
export const ChartSkeleton: React.FC = () => {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
            <Skeleton className="h-6 w-48 mb-6" />
            <div className="space-y-4">
                <div className="flex items-end gap-2 h-48">
                    <Skeleton className="flex-1 h-32" />
                    <Skeleton className="flex-1 h-40" />
                    <Skeleton className="flex-1 h-24" />
                    <Skeleton className="flex-1 h-36" />
                    <Skeleton className="flex-1 h-28" />
                    <Skeleton className="flex-1 h-44" />
                </div>
            </div>
        </div>
    );
};

/**
 * Stats Card Skeleton
 */
export const StatsCardSkeleton: React.FC = () => {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="w-10 h-10 rounded-lg" />
            </div>
            <Skeleton className="h-8 w-24 mb-2" />
            <Skeleton className="h-4 w-40" />
        </div>
    );
};

/**
 * Table Row Skeleton
 */
export const TableRowSkeleton: React.FC<{ columns?: number }> = ({ columns = 4 }) => {
    return (
        <tr className="border-b border-gray-200 dark:border-gray-700">
            {Array.from({ length: columns }).map((_, i) => (
                <td key={i} className="px-4 py-3">
                    <Skeleton className="h-4 w-full" />
                </td>
            ))}
        </tr>
    );
};

/**
 * List Skeleton
 */
export const ListSkeleton: React.FC<{ items?: number; itemHeight?: string }> = ({
    items = 5,
    itemHeight = 'h-16',
}) => {
    return (
        <div className="space-y-3">
            {Array.from({ length: items }).map((_, i) => (
                <Skeleton key={i} className={`w-full ${itemHeight} rounded-lg`} />
            ))}
        </div>
    );
};

/**
 * Page Skeleton (Full page loading)
 */
export const PageSkeleton: React.FC = () => {
    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <Skeleton className="h-10 w-64" />
                <Skeleton className="h-10 w-32 rounded-lg" />
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <StatsCardSkeleton />
                <StatsCardSkeleton />
                <StatsCardSkeleton />
            </div>

            {/* Content */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ChartSkeleton />
                <div className="space-y-4">
                    <ListSkeleton items={4} />
                </div>
            </div>
        </div>
    );
};

/**
 * Add shimmer animation to global styles
 * Add this to your index.css:
 * 
 * @keyframes shimmer {
 *   0% {
 *     background-position: -200% 0;
 *   }
 *   100% {
 *     background-position: 200% 0;
 *   }
 * }
 */
