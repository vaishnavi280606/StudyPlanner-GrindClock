/**
 * Real-Time Utilities for Mentor-Student Platform
 * 
 * Provides real-time features using Supabase Realtime:
 * - Mentor status updates (available/in_session/offline)
 * - Typing indicators in chat
 * - Session request notifications
 * - Presence tracking
 */

import { supabase } from './supabase';
import { logger } from './logger';

/**
 * Subscribe to mentor status changes
 */
export function subscribeMentorStatus(
    onStatusChange: (mentorId: string, status: 'available' | 'in_session' | 'offline') => void
) {
    logger.info('Subscribing to mentor status updates');

    return supabase
        .channel('mentor-status-changes')
        .on(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'mentor_profiles',
                filter: 'deleted_at=is.null',
            },
            (payload) => {
                const mentorId = payload.new.user_id;
                const status = payload.new.status;
                logger.debug('Mentor status changed', { mentorId, status });
                onStatusChange(mentorId, status);
            }
        )
        .subscribe();
}

/**
 * Update mentor status
 */
export async function updateMentorStatus(
    mentorId: string,
    status: 'available' | 'in_session' | 'offline'
): Promise<void> {
    logger.info('Updating mentor status', { mentorId, status });

    const { error } = await supabase
        .from('mentor_profiles')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('user_id', mentorId);

    if (error) {
        logger.error('Failed to update mentor status', error, { mentorId, status });
        throw error;
    }
}

/**
 * Typing indicator channel
 */
interface TypingState {
    userId: string;
    userName: string;
    isTyping: boolean;
    chatId: string; // Can be friendId or groupId
}

export function subscribeTypingIndicators(
    chatId: string,
    onTypingChange: (state: TypingState) => void
) {
    logger.debug('Subscribing to typing indicators', { chatId });

    const channel = supabase.channel(`typing:${chatId}`);

    channel
        .on('broadcast', { event: 'typing' }, (payload) => {
            logger.debug('Typing indicator received', payload);
            onTypingChange(payload.payload as TypingState);
        })
        .subscribe();

    return channel;
}

/**
 * Broadcast typing status
 */
export async function broadcastTyping(
    chatId: string,
    userId: string,
    userName: string,
    isTyping: boolean
): Promise<void> {
    const channel = supabase.channel(`typing:${chatId}`);

    await channel.subscribe();

    await channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
            userId,
            userName,
            isTyping,
            chatId,
        },
    });
}

/**
 * Subscribe to session requests (for mentors)
 */
export function subscribeSessionRequests(
    mentorId: string,
    onNewRequest: (request: any) => void
) {
    logger.info('Subscribing to session requests', { mentorId });

    return supabase
        .channel(`session-requests:${mentorId}`)
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'session_requests',
                filter: `mentor_id=eq.${mentorId}`,
            },
            (payload) => {
                logger.info('New session request received', payload.new);
                onNewRequest(payload.new);
            }
        )
        .subscribe();
}

/**
 * Subscribe to session request updates (for students)
 */
export function subscribeSessionUpdates(
    studentId: string,
    onUpdate: (request: any) => void
) {
    logger.info('Subscribing to session updates', { studentId });

    return supabase
        .channel(`session-updates:${studentId}`)
        .on(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'session_requests',
                filter: `student_id=eq.${studentId}`,
            },
            (payload) => {
                logger.info('Session request updated', payload.new);
                onUpdate(payload.new);
            }
        )
        .subscribe();
}

/**
 * Presence tracking for online users
 */
export function trackUserPresence(userId: string, userName: string) {
    logger.info('Starting presence tracking', { userId, userName });

    const channel = supabase.channel('online-users', {
        config: {
            presence: {
                key: userId,
            },
        },
    });

    channel
        .on('presence', { event: 'sync' }, () => {
            const state = channel.presenceState();
            logger.debug('Presence synced', { onlineUsers: Object.keys(state).length });
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
            logger.debug('User joined', { userId: key, presences: newPresences });
        })
        .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
            logger.debug('User left', { userId: key, presences: leftPresences });
        })
        .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await channel.track({
                    userId,
                    userName,
                    onlineAt: new Date().toISOString(),
                });
            }
        });

    return channel;
}

/**
 * Get currently online users
 */
export function getOnlineUsers(channel: any): Array<{ userId: string; userName: string }> {
    const state = channel.presenceState();
    const users: Array<{ userId: string; userName: string }> = [];

    Object.keys(state).forEach((key) => {
        const presences = state[key];
        if (presences && presences.length > 0) {
            const presence = presences[0];
            users.push({
                userId: presence.userId,
                userName: presence.userName,
            });
        }
    });

    return users;
}

/**
 * Subscribe to new reviews (for mentors)
 */
export function subscribeToReviews(
    mentorId: string,
    onNewReview: (review: any) => void
) {
    logger.info('Subscribing to new reviews', { mentorId });

    return supabase
        .channel(`reviews:${mentorId}`)
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'session_reviews',
                filter: `mentor_id=eq.${mentorId}`,
            },
            (payload) => {
                logger.info('New review received', payload.new);
                onNewReview(payload.new);
            }
        )
        .subscribe();
}

/**
 * Cleanup: Unsubscribe from all channels
 */
export async function cleanupRealtimeSubscriptions(): Promise<void> {
    logger.info('Cleaning up realtime subscriptions');
    await supabase.removeAllChannels();
}
