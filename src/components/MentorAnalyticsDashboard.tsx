/**
 * Mentor Analytics Dashboard
 * 
 * Comprehensive analytics for mentors showing:
 * - Sessions completed
 * - Average rating
 * - Response time
 * - Student satisfaction
 * - Earnings (if paid)
 * - Popular topics
 */

import React, { useState, useEffect } from 'react';
import { BarChart3, Star, Clock, TrendingUp, DollarSign, Users, Award, Calendar } from 'lucide-react';
import { supabase } from '../utils/supabase';
import { logger, measureAsync } from '../utils/logger';
import { ChartSkeleton, StatsCardSkeleton } from './LoadingSkeleton';

interface MentorStats {
    totalSessions: number;
    completedSessions: number;
    cancelledSessions: number;
    averageRating: number;
    totalReviews: number;
    responseTimeMinutes: number;
    repeatStudents: number;
    totalEarnings: number;
    popularTopics: Array<{ topic: string; count: number }>;
    ratingDistribution: Array<{ rating: number; count: number }>;
    monthlyTrend: Array<{ month: string; sessions: number; rating: number }>;
}

interface Props {
    mentorId: string;
}

export const MentorAnalyticsDashboard: React.FC<Props> = ({ mentorId }) => {
    const [stats, setStats] = useState<MentorStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year' | 'all'>('month');

    useEffect(() => {
        loadAnalytics();
    }, [mentorId, timeRange]);

    const loadAnalytics = async () => {
        setLoading(true);

        try {
            const data = await measureAsync('Load mentor analytics', async () => {
                // Calculate date range
                const now = new Date();
                let startDate = new Date();

                switch (timeRange) {
                    case 'week':
                        startDate.setDate(now.getDate() - 7);
                        break;
                    case 'month':
                        startDate.setMonth(now.getMonth() - 1);
                        break;
                    case 'year':
                        startDate.setFullYear(now.getFullYear() - 1);
                        break;
                    case 'all':
                        startDate = new Date('2020-01-01');
                        break;
                }

                // Fetch session data
                const { data: sessions, error: sessionsError } = await supabase
                    .from('session_requests')
                    .select('*')
                    .eq('mentor_id', mentorId)
                    .gte('created_at', startDate.toISOString());

                if (sessionsError) throw sessionsError;

                // Fetch reviews
                const { data: reviews, error: reviewsError } = await supabase
                    .from('session_reviews')
                    .select('*')
                    .eq('mentor_id', mentorId)
                    .gte('created_at', startDate.toISOString());

                if (reviewsError) throw reviewsError;

                // Fetch mentor profile for current stats
                const { data: profile, error: profileError } = await supabase
                    .from('mentor_profiles')
                    .select('*')
                    .eq('user_id', mentorId)
                    .single();

                if (profileError) throw profileError;

                // Calculate stats
                const completedSessions = sessions?.filter(s => s.status === 'completed').length || 0;
                const cancelledSessions = sessions?.filter(s => s.status === 'cancelled').length || 0;

                const averageRating = reviews && reviews.length > 0
                    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
                    : 0;

                // Calculate response time (average time to accept requests)
                const acceptedSessions = sessions?.filter(s => s.status === 'accepted' || s.status === 'completed') || [];
                const responseTimes = acceptedSessions
                    .filter(s => s.updated_at && s.created_at)
                    .map(s => {
                        const created = new Date(s.created_at).getTime();
                        const updated = new Date(s.updated_at).getTime();
                        return (updated - created) / (1000 * 60); // Convert to minutes
                    });

                const avgResponseTime = responseTimes.length > 0
                    ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
                    : 0;

                // Calculate repeat students
                const studentCounts = new Map<string, number>();
                sessions?.forEach(s => {
                    studentCounts.set(s.student_id, (studentCounts.get(s.student_id) || 0) + 1);
                });
                const repeatStudents = Array.from(studentCounts.values()).filter(count => count > 1).length;

                // Popular topics
                const topicCounts = new Map<string, number>();
                sessions?.forEach(s => {
                    if (s.topic) {
                        topicCounts.set(s.topic, (topicCounts.get(s.topic) || 0) + 1);
                    }
                });
                const popularTopics = Array.from(topicCounts.entries())
                    .map(([topic, count]) => ({ topic, count }))
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 5);

                // Rating distribution
                const ratingCounts = new Map<number, number>();
                reviews?.forEach(r => {
                    ratingCounts.set(r.rating, (ratingCounts.get(r.rating) || 0) + 1);
                });
                const ratingDistribution = [5, 4, 3, 2, 1].map(rating => ({
                    rating,
                    count: ratingCounts.get(rating) || 0,
                }));

                // Monthly trend (last 6 months)
                const monthlyData = new Map<string, { sessions: number; ratings: number[]; }>();
                const last6Months = Array.from({ length: 6 }, (_, i) => {
                    const date = new Date();
                    date.setMonth(date.getMonth() - i);
                    return date.toISOString().slice(0, 7); // YYYY-MM
                }).reverse();

                last6Months.forEach(month => {
                    monthlyData.set(month, { sessions: 0, ratings: [] });
                });

                sessions?.forEach(s => {
                    const month = s.created_at.slice(0, 7);
                    if (monthlyData.has(month)) {
                        const data = monthlyData.get(month)!;
                        data.sessions++;
                    }
                });

                reviews?.forEach(r => {
                    const month = r.created_at.slice(0, 7);
                    if (monthlyData.has(month)) {
                        const data = monthlyData.get(month)!;
                        data.ratings.push(r.rating);
                    }
                });

                const monthlyTrend = last6Months.map(month => {
                    const data = monthlyData.get(month)!;
                    const avgRating = data.ratings.length > 0
                        ? data.ratings.reduce((sum, r) => sum + r, 0) / data.ratings.length
                        : 0;

                    return {
                        month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short' }),
                        sessions: data.sessions,
                        rating: avgRating,
                    };
                });

                return {
                    totalSessions: sessions?.length || 0,
                    completedSessions,
                    cancelledSessions,
                    averageRating,
                    totalReviews: reviews?.length || 0,
                    responseTimeMinutes: Math.round(avgResponseTime),
                    repeatStudents,
                    totalEarnings: 0, // TODO: Calculate from paid sessions
                    popularTopics,
                    ratingDistribution,
                    monthlyTrend,
                };
            });

            setStats(data);
        } catch (error) {
            logger.error('Failed to load mentor analytics', error as Error, { mentorId });
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatsCardSkeleton />
                    <StatsCardSkeleton />
                    <StatsCardSkeleton />
                    <StatsCardSkeleton />
                </div>
                <ChartSkeleton />
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                Failed to load analytics. Please try again.
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Analytics Dashboard
                </h2>

                {/* Time Range Selector */}
                <div className="flex gap-2">
                    {(['week', 'month', 'year', 'all'] as const).map(range => (
                        <button
                            key={range}
                            onClick={() => setTimeRange(range)}
                            className={`px-4 py-2 rounded-lg font-medium transition-all ${timeRange === range
                                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                                }`}
                        >
                            {range.charAt(0).toUpperCase() + range.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Total Sessions */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            Total Sessions
                        </h3>
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        {stats.totalSessions}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        {stats.completedSessions} completed • {stats.cancelledSessions} cancelled
                    </p>
                </div>

                {/* Average Rating */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            Average Rating
                        </h3>
                        <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
                            <Star className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2 mb-2">
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">
                            {stats.averageRating.toFixed(1)}
                        </p>
                        <div className="flex">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                    key={i}
                                    className={`w-4 h-4 ${i < Math.round(stats.averageRating)
                                            ? 'text-yellow-400 fill-yellow-400'
                                            : 'text-gray-300 dark:text-gray-600'
                                        }`}
                                />
                            ))}
                        </div>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        From {stats.totalReviews} reviews
                    </p>
                </div>

                {/* Response Time */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            Avg Response Time
                        </h3>
                        <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                            <Clock className="w-5 h-5 text-green-600 dark:text-green-400" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        {stats.responseTimeMinutes}m
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        {stats.responseTimeMinutes < 60 ? 'Excellent' : stats.responseTimeMinutes < 180 ? 'Good' : 'Needs improvement'}
                    </p>
                </div>

                {/* Repeat Students */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            Repeat Students
                        </h3>
                        <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                            <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        {stats.repeatStudents}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        High satisfaction rate
                    </p>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Monthly Trend */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                        Monthly Trend
                    </h3>
                    <div className="space-y-4">
                        {stats.monthlyTrend.map((month, index) => (
                            <div key={index}>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                        {month.month}
                                    </span>
                                    <span className="text-sm text-gray-900 dark:text-white">
                                        {month.sessions} sessions • {month.rating > 0 ? `${month.rating.toFixed(1)}⭐` : 'No ratings'}
                                    </span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                    <div
                                        className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full transition-all"
                                        style={{ width: `${(month.sessions / Math.max(...stats.monthlyTrend.map(m => m.sessions), 1)) * 100}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Popular Topics */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                        Popular Topics
                    </h3>
                    {stats.popularTopics.length > 0 ? (
                        <div className="space-y-4">
                            {stats.popularTopics.map((topic, index) => (
                                <div key={index}>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                            {topic.topic}
                                        </span>
                                        <span className="text-sm text-gray-600 dark:text-gray-400">
                                            {topic.count} sessions
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                        <div
                                            className="bg-gradient-to-r from-green-600 to-teal-600 h-2 rounded-full transition-all"
                                            style={{ width: `${(topic.count / Math.max(...stats.popularTopics.map(t => t.count), 1)) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                            No session data yet
                        </p>
                    )}
                </div>
            </div>

            {/* Rating Distribution */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                    Rating Distribution
                </h3>
                <div className="space-y-3">
                    {stats.ratingDistribution.map(({ rating, count }) => {
                        const maxCount = Math.max(...stats.ratingDistribution.map(r => r.count), 1);
                        const percentage = (count / maxCount) * 100;

                        return (
                            <div key={rating} className="flex items-center gap-4">
                                <div className="flex items-center gap-1 w-16">
                                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                                        {rating}
                                    </span>
                                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                                </div>
                                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                                    <div
                                        className="bg-gradient-to-r from-yellow-400 to-orange-500 h-3 rounded-full transition-all"
                                        style={{ width: `${percentage}%` }}
                                    />
                                </div>
                                <span className="text-sm text-gray-600 dark:text-gray-400 w-12 text-right">
                                    {count}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
