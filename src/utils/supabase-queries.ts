import { supabase as supabaseClient } from './supabase';
export const supabase = supabaseClient;
import { Mentor, Friend, UserProfile } from '../types';

export const fetchMentors = async (): Promise<Mentor[]> => {
    const { data, error } = await supabase
        .from('mentors')
        .select('*');

    if (error) {
        console.error('Error fetching mentors:', error);
        return [];
    }

    return data.map(m => ({
        id: m.id,
        name: m.name,
        avatarUrl: m.avatar_url || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop',
        domain: m.expertise || [],
        bio: m.bio || '',
        skills: [],
        languages: ['English'],
        rating: m.rating || 0,
        totalReviews: 0,
        isVerified: false,
        pricePerHour: m.price_per_hour,
        availability: m.availability || ''
    }));
};

/* Helper: compute study streak (consecutive days) from study_sessions rows.
   Uses start_time (matching Dashboard's calculateStreak) with created_at fallback.
   Uses date.getTime() for comparison (local timezone, same as Dashboard). */
const computeStreak = (sessions: { start_time?: string; created_at: string }[]): number => {
    if (!sessions || sessions.length === 0) return 0;
    const sessionDates = new Set<number>();
    sessions.forEach(s => {
        const d = new Date(s.start_time || s.created_at);
        d.setHours(0, 0, 0, 0);
        sessionDates.add(d.getTime());
    });
    let streak = 0;
    const check = new Date();
    check.setHours(0, 0, 0, 0);
    // Check today
    if (sessionDates.has(check.getTime())) {
        streak = 1;
        check.setDate(check.getDate() - 1);
    } else {
        check.setDate(check.getDate() - 1);
        if (!sessionDates.has(check.getTime())) return 0;
        streak = 1;
        check.setDate(check.getDate() - 1);
    }
    while (sessionDates.has(check.getTime())) {
        streak++;
        check.setDate(check.getDate() - 1);
    }
    return streak;
};

export const fetchFriends = async (userId: string): Promise<Friend[]> => {
    // Fetch accepted friendships
    const { data, error } = await supabase
        .from('friends')
        .select(`
            friend_id,
            user_id,
            status,
            friend_profile:user_profiles!friends_friend_id_fkey (
                user_id,
                full_name,
                avatar_url,
                username,
                role
            ),
            user_profile:user_profiles!friends_user_id_fkey (
                user_id,
                full_name,
                avatar_url,
                username,
                role
            )
        `)
        .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
        .eq('status', 'accepted');

    if (error) {
        console.error('Error fetching friends:', error);
        return [];
    }

    // Build friend list
    const friendsList = data.map(f => {
        const isUserSender = f.user_id === userId;
        const profile: any = isUserSender ? f.friend_profile : f.user_profile;
        return {
            id: isUserSender ? f.friend_id : f.user_id,
            name: profile?.full_name || 'Unknown User',
            username: profile?.username || 'unknown',
            status: 'offline' as const,
            studyStreak: 0,
            avatarUrl: profile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.full_name || 'U')}&background=random`,
            role: profile?.role || 'student',
        };
    });

    // Always compute streaks from study_sessions (same algorithm as Dashboard's calculateStreak)
    const friendIds = friendsList.map(f => f.id);
    if (friendIds.length > 0) {
        // Compute streaks from study_sessions for ALL friends (ignore stale study_streak column)
        const zeroIds = friendIds;
        if (zeroIds.length > 0) {
            try {
                const ninetyDaysAgo = new Date();
                ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
                const { data: sessionRows, error: sessErr } = await supabase
                    .from('study_sessions')
                    .select('user_id, start_time, created_at')
                    .in('user_id', zeroIds)
                    .gte('created_at', ninetyDaysAgo.toISOString())
                    .order('start_time', { ascending: false });

                if (!sessErr && sessionRows && sessionRows.length > 0) {
                    const grouped: Record<string, { created_at: string }[]> = {};
                    sessionRows.forEach(row => {
                        if (!grouped[row.user_id]) grouped[row.user_id] = [];
                        grouped[row.user_id].push(row);
                    });
                    friendsList.forEach(f => {
                        if (grouped[f.id]) {
                            f.studyStreak = computeStreak(grouped[f.id]);
                        }
                    });
                }
            } catch (err) {
                console.warn('[fetchFriends] Could not compute streaks from study_sessions (RLS may be blocking). Run fix-friend-streaks.sql to fix.', err);
            }
        }
    }

    return friendsList;
};

export const searchUsers = async (query: string, currentUserId: string): Promise<UserProfile[]> => {
    const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .neq('user_id', currentUserId)
        .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
        .limit(10);

    if (error) {
        console.error('Error searching users:', error);
        return [];
    }

    return data.map(p => ({
        id: p.id,
        userId: p.user_id,
        fullName: p.full_name,
        avatarUrl: p.avatar_url,
        role: p.role,
        username: p.username,
        createdAt: new Date(p.created_at),
        updatedAt: new Date(p.updated_at)
    }));
};

export const sendFriendRequest = async (userId: string, friendId: string) => {
    // Let's use a simpler approach: fetch all relationships for the user and check in JS.
    const { data: allRels, error: fetchError } = await supabase
        .from('friends')
        .select('user_id, friend_id')
        .or(`user_id.eq.${userId},friend_id.eq.${userId}`);

    if (fetchError) {
        console.error('Error checking existing friend request:', fetchError);
        return { error: fetchError };
    }

    const alreadyExists = allRels?.some(r =>
        (r.user_id === userId && r.friend_id === friendId) ||
        (r.user_id === friendId && r.friend_id === userId)
    );

    if (alreadyExists) {
        return { error: { message: 'A friend request or friendship already exists.' } };
    }

    const { error } = await supabase
        .from('friends')
        .insert({
            user_id: userId,
            friend_id: friendId,
            status: 'pending'
        });

    if (!error) {
        // Create notification for the receiver
        await createNotification(friendId, userId, 'friend_request', 'wants to be your friend');
    }

    return { error };
};

export const fetchPendingFriendRequests = async (userId: string): Promise<any[]> => {
    const { data, error } = await supabase
        .from('friends')
        .select(`
            id,
            user_id,
            friend_id,
            status,
            sender_profile:user_profiles!friends_user_id_fkey (
                full_name,
                avatar_url,
                username
            )
        `)
        .eq('friend_id', userId)
        .eq('status', 'pending');

    if (error) {
        console.error('Error fetching pending friend requests:', error);
        return [];
    }

    console.log('Pending requests raw data:', data);

    // If join failed but rows exist, log it
    if (data && data.length > 0 && !data[0].sender_profile) {
        console.warn('Friend request rows found, but sender_profile join failed. Check foreign key constraints.');
    }

    return data.map(req => {
        const profile: any = Array.isArray(req.sender_profile) ? req.sender_profile[0] : req.sender_profile;
        return {
            id: req.id,
            userId: req.user_id,
            name: profile?.full_name || 'Unknown User',
            username: profile?.username || 'unknown',
            avatarUrl: profile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.full_name || 'U')}&background=random`,
            status: req.status
        };
    });
};

export const updateFriendRequestStatus = async (requestId: string, status: 'accepted' | 'rejected') => {
    const { error } = await supabase
        .from('friends')
        .update({ status })
        .eq('id', requestId);

    return { error };
};

export const sendMessage = async (senderId: string, receiverId: string, content: string) => {
    const { error } = await supabase
        .from('messages')
        .insert({
            sender_id: senderId,
            receiver_id: receiverId,
            content
        });

    if (!error) {
        // Create notification for receiver so it shows in NotificationCenter
        await createNotification(receiverId, senderId, 'message', content.length > 80 ? content.substring(0, 80) + '...' : content);
    }

    return { error };
};

export const fetchMessages = async (userId: string, friendId: string) => {
    const { data, error } = await supabase
        .from('messages')
        .select(`
            *,
            sender:user_profiles!messages_sender_id_fkey (
                full_name,
                username,
                avatar_url
            )
        `)
        .or(`and(sender_id.eq.${userId},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${userId})`)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error fetching messages:', error);
        // Fallback: try without join in case FK doesn't exist
        const { data: fallbackData, error: fallbackError } = await supabase
            .from('messages')
            .select('*')
            .or(`and(sender_id.eq.${userId},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${userId})`)
            .order('created_at', { ascending: true });
        if (fallbackError) {
            console.error('Error fetching messages (fallback):', fallbackError);
            return [];
        }
        return fallbackData || [];
    }

    return (data || []).map((msg: any) => ({
        ...msg,
        senderName: msg.sender?.full_name || null,
        senderUsername: msg.sender?.username || null,
        senderAvatar: msg.sender?.avatar_url || null,
    }));
};

export const subscribeToMessages = (userId: string, onMessage: (message: any) => void) => {
    return supabase
        .channel('public:messages')
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `receiver_id=eq.${userId}`
        }, (payload) => {
            onMessage(payload.new);
        })
        .subscribe();
};

export const createNotification = async (
    userId: string,
    senderId: string,
    type: 'friend_request' | 'message' | 'call' | 'call_ended' | 'group_added' | 'session_request' | 'session_accepted' | 'session_rejected' | 'session_completed' | 'session_cancelled' | 'session_reminder' | 'new_review',
    content: string,
    metadata?: Record<string, any>
) => {
    const insertData: any = {
        user_id: userId,
        sender_id: senderId,
        type,
        content
    };
    if (metadata) insertData.metadata = metadata;

    const { error } = await supabase
        .from('notifications')
        .insert(insertData);

    return { error };
};

export const fetchNotifications = async (userId: string) => {
    // Fetch notifications without FK joins (FK may point to auth.users, not user_profiles)
    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching notifications:', error);
        return [];
    }

    if (!data || data.length === 0) return [];

    // Batch-fetch sender profiles
    const senderIds = [...new Set(data.map(n => n.sender_id).filter(Boolean))];
    const { data: profiles } = await supabase
        .from('user_profiles')
        .select('user_id, full_name, avatar_url, username')
        .in('user_id', senderIds);

    const profileMap = new Map<string, any>();
    if (profiles) profiles.forEach(p => profileMap.set(p.user_id, p));

    return data.map(notif => {
        const sender = profileMap.get(notif.sender_id);
        return {
            ...notif,
            senderName: sender?.full_name || 'Unknown User',
            senderAvatar: sender?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(sender?.full_name || 'U')}&background=random`,
            senderUsername: sender?.username || 'unknown'
        };
    });
};

export const subscribeToNotifications = (userId: string, onNotification: (notification: any) => void) => {
    return supabase
        .channel(`public:notifications:${userId}`)
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`
        }, (payload) => {
            onNotification(payload.new);
        })
        .subscribe();
};

export const fetchUnreadCounts = async (userId: string) => {
    const { data, error } = await supabase
        .from('notifications')
        .select('sender_id, type')
        .eq('user_id', userId)
        .eq('is_read', false);

    if (error) {
        console.error('Error fetching unread counts:', error);
        return {};
    }

    const counts: Record<string, number> = {};
    data.forEach(notif => {
        if (notif.type === 'message') {
            counts[notif.sender_id] = (counts[notif.sender_id] || 0) + 1;
        }
    });

    return counts;
};

export const markNotificationsAsRead = async (userId: string, senderId: string, type?: string, groupId?: string) => {
    let query = supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId);

    if (senderId) {
        query = query.eq('sender_id', senderId);
    }

    if (groupId) {
        // Assume group_id is in metadata for notifications
        query = query.filter('metadata->>group_id', 'eq', groupId);
    }

    if (type) {
        query = query.eq('type', type);
    }

    const { error } = await query;
    return { error };
};

// Group Functions

export const createGroup = async (name: string, avatarUrl: string, creatorId: string) => {
    const { data, error } = await supabase
        .from('groups')
        .insert({
            name,
            avatar_url: avatarUrl,
            created_by: creatorId
        })
        .select()
        .single();

    if (error) return { error };

    // Add creator as admin
    const { error: memberError } = await supabase
        .from('group_members')
        .insert({
            group_id: data.id,
            user_id: creatorId,
            role: 'admin'
        });

    return { data, error: memberError };
};

export const fetchUserGroups = async (userId: string) => {
    // This query is being replaced by the better approach below
    await supabase
        .from('groups')
        .select(`
            *,
            members:group_members(count)
        `)
        .eq('group_members.user_id', userId);

    // Better approach: query group_members then join groups
    const { data: memberData, error: memberError } = await supabase
        .from('group_members')
        .select(`
            group:groups (
                id,
                name,
                avatar_url,
                created_by,
                created_at
            )
        `)
        .eq('user_id', userId);

    if (memberError) {
        console.error('Error fetching user groups:', memberError);
        return [];
    }

    return memberData.map((m: any) => {
        const g = m.group;
        return {
            id: g.id,
            name: g.name,
            avatarUrl: g.avatar_url || '',
            createdBy: g.created_by,
            createdAt: g.created_at,
        };
    });
};

export const addGroupMember = async (groupId: string, userId: string) => {
    const { error } = await supabase
        .from('group_members')
        .insert({
            group_id: groupId,
            user_id: userId,
            role: 'member'
        });

    return { error };
};

export const fetchGroupMembers = async (groupId: string) => {
    const { data, error } = await supabase
        .from('group_members')
        .select(`
            user_id,
            role,
            joined_at,
            profile:user_profiles (
                full_name,
                avatar_url,
                username
            )
        `)
        .eq('group_id', groupId);

    if (error) {
        console.error('Error fetching group members:', error);
        return [];
    }

    return data.map((m: any) => ({
        groupId,
        userId: m.user_id,
        role: m.role,
        joinedAt: new Date(m.joined_at),
        profile: m.profile ? {
            id: m.profile.id,
            userId: m.profile.user_id,
            fullName: m.profile.full_name,
            avatarUrl: m.profile.avatar_url,
            username: m.profile.username,
            role: m.profile.role,
            createdAt: new Date(m.profile.created_at),
            updatedAt: new Date(m.profile.updated_at)
        } : undefined
    }));
};

export const removeGroupMember = async (groupId: string, userId: string) => {
    const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', userId);

    return { error };
};

export const updateGroupMemberRole = async (groupId: string, userId: string, role: 'admin' | 'member') => {
    const { error } = await supabase
        .from('group_members')
        .update({ role })
        .eq('group_id', groupId)
        .eq('user_id', userId);

    return { error };
};

export const sendGroupMessage = async (groupId: string, senderId: string, content: string) => {
    const { error } = await supabase
        .from('messages')
        .insert({
            sender_id: senderId,
            group_id: groupId,
            content
        });

    return { error };
};

export const fetchGroupMessages = async (groupId: string) => {
    const { data, error } = await supabase
        .from('messages')
        .select(`
            *,
            sender_profile:user_profiles!messages_sender_id_fkey (
                full_name,
                avatar_url
            )
        `)
        .eq('group_id', groupId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error fetching group messages:', error);
        return [];
    }

    return data.map((msg: any) => ({
        ...msg,
        senderName: msg.sender_profile?.full_name,
        senderAvatar: msg.sender_profile?.avatar_url
    }));
};

export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
    const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

    if (error) {
        if (error.code !== 'PGRST116') { // Ignore "no rows found" error
            console.error('Error fetching user profile:', error);
        }
        return null;
    }

    return {
        id: data.id,
        userId: data.user_id,
        fullName: data.full_name,
        avatarUrl: data.avatar_url,
        role: data.role,
        profession: data.profession,
        experience: data.experience,
        class: data.class,
        course: data.course,
        age: data.age,
        phoneNumber: data.phone_number,
        username: data.username,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
    };
};

export const fetchUpcomingSessions = async (userId: string, role: 'student' | 'mentor') => {
    const { data, error } = await supabase
        .from('session_requests')
        .select(`
            *,
            mentor_profile:user_profiles!session_requests_mentor_id_fkey (
                full_name,
                avatar_url
            ),
            student_profile:user_profiles!session_requests_student_id_fkey (
                full_name,
                avatar_url
            )
        `)
        .eq(role === 'student' ? 'student_id' : 'mentor_id', userId)
        .eq('status', 'accepted')
        .order('preferred_date', { ascending: true });

    if (error) {
        console.error('Error fetching upcoming sessions:', error);
        return [];
    }

    return data.map(session => ({
        ...session,
        mentorId: session.mentor_id,
        studentId: session.student_id,
        preferredDate: session.preferred_date,
        preferredTime: session.preferred_time,
        mentorResponse: session.mentor_response,
        meetingLink: session.meeting_link,
        studentMessage: session.student_message,
        mentorProfile: {
            fullName: session.mentor_profile?.full_name,
            avatarUrl: session.mentor_profile?.avatar_url
        },
        studentProfile: {
            fullName: session.student_profile?.full_name,
            avatarUrl: session.student_profile?.avatar_url
        }
    }));
};

export const fetchMentorsFromProfiles = async (): Promise<Mentor[]> => {
    const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('role', 'mentor');

    if (error) {
        console.error('Error fetching mentors from profiles:', error);
        return [];
    }

    return data.map(m => ({
        id: m.user_id,
        name: m.full_name || 'Anonymous Mentor',
        username: m.username,
        avatarUrl: m.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.full_name || 'M')}&background=random`,
        domain: m.profession ? [m.profession] : [],
        experienceYears: parseInt(m.experience || '0'),
        bio: m.experience || '',
        skills: [],
        languages: ['English'],
        rating: m.rating || 0,
        totalReviews: m.total_reviews || 0,
        isVerified: true
    }));
};

export const fetchMentorProfile = async (userId: string): Promise<Mentor | null> => {
    const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .eq('role', 'mentor')
        .single();

    if (error || !data) {
        console.error('Error fetching mentor profile:', error);
        return null;
    }

    // Fetch aggregated review stats
    const { data: reviewData } = await supabase
        .from('mentor_reviews')
        .select('rating')
        .eq('mentor_id', userId);

    const reviews = reviewData || [];
    const totalReviews = reviews.length;
    const avgRating = totalReviews > 0
        ? reviews.reduce((sum: number, r: any) => sum + (r.rating || 0), 0) / totalReviews
        : 0;

    return {
        id: data.user_id,
        name: data.full_name || 'Anonymous Mentor',
        username: data.username,
        avatarUrl: data.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.full_name || 'M')}&background=random`,
        domain: data.profession ? [data.profession] : [],
        experienceYears: parseInt(data.experience || '0'),
        bio: data.experience || '',
        skills: [],
        languages: ['English'],
        rating: avgRating,
        totalReviews,
        isVerified: true
    };
};

export const createMentorOffering = async (offering: any) => {
    const { data, error } = await supabase
        .from('mentorship_offerings')
        .insert(offering)
        .select()
        .single();

    return { data, error };
};

export const deleteMentorOffering = async (offeringId: string) => {
    const { error } = await supabase
        .from('mentorship_offerings')
        .delete()
        .eq('id', offeringId);

    if (error) console.error('Error deleting offering:', error);
};

export const updateMentorOffering = async (offeringId: string, updates: Record<string, any>) => {
    const { data, error } = await supabase
        .from('mentorship_offerings')
        .update(updates)
        .eq('id', offeringId)
        .select()
        .single();

    if (error) console.error('Error updating offering:', error);
    return { data, error };
};

export const acceptSessionRequest = async (requestId: string, responseText: string, meetingLink: string) => {
    // Fetch the request first to get student_id and mentor_id for notification
    const { data: reqData } = await supabase
        .from('session_requests')
        .select('student_id, mentor_id, topic')
        .eq('id', requestId)
        .single();

    const { error } = await supabase
        .from('session_requests')
        .update({
            status: 'accepted',
            mentor_response: responseText,
            meeting_link: meetingLink,
        })
        .eq('id', requestId);

    if (error) {
        console.error('Error accepting session request:', error);
    } else if (reqData) {
        // Notify the student that their session was accepted
        await createNotification(
            reqData.student_id,
            reqData.mentor_id,
            'session_accepted',
            `Your session request "${reqData.topic}" has been accepted!${meetingLink ? ' Meeting link provided.' : ''}`,
            { sessionId: requestId, topic: reqData.topic }
        );
    }
};

export const rejectSessionRequest = async (requestId: string, responseText: string) => {
    const { data: reqData } = await supabase
        .from('session_requests')
        .select('student_id, mentor_id, topic')
        .eq('id', requestId)
        .single();

    const { error } = await supabase
        .from('session_requests')
        .update({
            status: 'rejected',
            mentor_response: responseText,
        })
        .eq('id', requestId);

    if (error) {
        console.error('Error rejecting session request:', error);
    } else if (reqData) {
        await createNotification(
            reqData.student_id,
            reqData.mentor_id,
            'session_rejected',
            `Your session request "${reqData.topic}" was declined.${responseText ? ' Reason: ' + responseText : ''}`,
            { sessionId: requestId, topic: reqData.topic }
        );
    }
};

export const updateSessionMeetingLink = async (requestId: string, meetingLink: string) => {
    const { error } = await supabase
        .from('session_requests')
        .update({ meeting_link: meetingLink })
        .eq('id', requestId);

    if (error) console.error('Error updating meeting link:', error);
};

export const subscribeToMentorReviews = (mentorId: string, callback: (review: any) => void) => {
    const channel = supabase
        .channel(`mentor-reviews-${mentorId}-${Date.now()}`)
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'mentor_reviews',
            filter: `mentor_id=eq.${mentorId}`,
        }, (payload: any) => {
            callback(payload.new);
        })
        .subscribe();

    return {
        unsubscribe: () => {
            supabase.removeChannel(channel);
        }
    };
};

export const fetchMentorOfferings = async (mentorId: string): Promise<any[]> => {
    const { data, error } = await supabase
        .from('mentorship_offerings')
        .select('*')
        .eq('mentor_id', mentorId);

    if (error) {
        console.error('Error fetching mentor offerings:', error);
        return [];
    }

    return data || [];
};

export const fetchAllMentorOfferings = async (mentorIds: string[]): Promise<Map<string, any[]>> => {
    const offeringsMap = new Map<string, any[]>();
    if (mentorIds.length === 0) return offeringsMap;

    const { data, error } = await supabase
        .from('mentorship_offerings')
        .select('*')
        .in('mentor_id', mentorIds)
        .eq('is_active', true);

    if (error) {
        console.error('Error fetching all mentor offerings:', error);
        return offeringsMap;
    }

    (data || []).forEach((o: any) => {
        const mentorOfferings = offeringsMap.get(o.mentor_id) || [];
        mentorOfferings.push(o);
        offeringsMap.set(o.mentor_id, mentorOfferings);
    });

    return offeringsMap;
};

export const fetchMentorReviews = async (mentorId: string): Promise<any[]> => {
    // Try with FK join first, fall back to plain query + manual profile lookup
    let data: any[] | null = null;
    let error: any = null;

    const result = await supabase
        .from('mentor_reviews')
        .select(`
            *,
            student_profile:user_profiles!mentor_reviews_student_id_fkey (
                full_name,
                avatar_url,
                username
            )
        `)
        .eq('mentor_id', mentorId)
        .order('created_at', { ascending: false });

    data = result.data;
    error = result.error;

    // If FK join failed, fetch reviews without join then manually fetch student profiles
    if (error) {
        console.warn('FK join failed for mentor_reviews, falling back to manual lookup:', error.message);
        const plainResult = await supabase
            .from('mentor_reviews')
            .select('*')
            .eq('mentor_id', mentorId)
            .order('created_at', { ascending: false });

        if (plainResult.error) {
            console.error('Error fetching mentor reviews:', plainResult.error);
            return [];
        }

        data = plainResult.data || [];

        // Manually fetch student profiles
        const studentIds = [...new Set(data.map((r: any) => r.student_id).filter(Boolean))];
        if (studentIds.length > 0) {
            const { data: profiles } = await supabase
                .from('user_profiles')
                .select('user_id, full_name, avatar_url, username')
                .in('user_id', studentIds);
            const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
            return data.map((r: any) => {
                const profile = profileMap.get(r.student_id);
                return {
                    ...r,
                    studentName: profile?.full_name,
                    studentAvatarUrl: profile?.avatar_url,
                    studentUsername: profile?.username,
                    reviewText: r.review_text,
                    createdAt: new Date(r.created_at),
                    studentId: r.student_id,
                    student: {
                        fullName: profile?.full_name,
                        avatarUrl: profile?.avatar_url,
                        username: profile?.username
                    }
                };
            });
        }

        return data;
    }

    return (data || []).map(r => ({
        ...r,
        studentName: r.student_profile?.full_name,
        studentAvatarUrl: r.student_profile?.avatar_url,
        studentUsername: r.student_profile?.username,
        reviewText: r.review_text,
        createdAt: new Date(r.created_at),
        studentId: r.student_id,
        student: {
            fullName: r.student_profile?.full_name,
            avatarUrl: r.student_profile?.avatar_url,
            username: r.student_profile?.username
        }
    }));
};

export const fetchAllMentorReviews = async (mentorIds: string[], limitPerMentor: number = 3) => {
    const reviewsMap = new Map<string, any[]>();
    if (mentorIds.length === 0) return reviewsMap;

    // Try FK join first, fall back to manual lookup
    let data: any[] | null = null;
    let error: any = null;

    const result = await supabase
        .from('mentor_reviews')
        .select(`
            *,
            student_profile:user_profiles!mentor_reviews_student_id_fkey (
                full_name,
                avatar_url,
                username
            )
        `)
        .in('mentor_id', mentorIds)
        .order('created_at', { ascending: false });

    data = result.data;
    error = result.error;

    if (error) {
        console.warn('FK join failed for fetchAllMentorReviews, falling back:', error.message);
        const plainResult = await supabase
            .from('mentor_reviews')
            .select('*')
            .in('mentor_id', mentorIds)
            .order('created_at', { ascending: false });

        if (plainResult.error) {
            console.error('Error fetching all mentor reviews:', plainResult.error);
            return reviewsMap;
        }

        data = plainResult.data || [];

        // Manual student profile lookup
        const studentIds = [...new Set(data.map((r: any) => r.student_id).filter(Boolean))];
        let profileMap = new Map<string, any>();
        if (studentIds.length > 0) {
            const { data: profiles } = await supabase
                .from('user_profiles')
                .select('user_id, full_name, avatar_url, username')
                .in('user_id', studentIds);
            profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
        }

        data.forEach((r: any) => {
            const mentorReviews = reviewsMap.get(r.mentor_id) || [];
            if (mentorReviews.length < limitPerMentor) {
                const profile = profileMap.get(r.student_id);
                mentorReviews.push({
                    ...r,
                    studentName: profile?.full_name,
                    studentAvatarUrl: profile?.avatar_url,
                    studentUsername: profile?.username,
                });
                reviewsMap.set(r.mentor_id, mentorReviews);
            }
        });

        return reviewsMap;
    }

    (data || []).forEach(r => {
        const mentorReviews = reviewsMap.get(r.mentor_id) || [];
        if (mentorReviews.length < limitPerMentor) {
            mentorReviews.push({
                ...r,
                studentName: r.student_profile?.full_name,
                studentAvatarUrl: r.student_profile?.avatar_url,
                studentUsername: r.student_profile?.username
            });
            reviewsMap.set(r.mentor_id, mentorReviews);
        }
    });

    return reviewsMap;
};

export const createSessionRequest = async (request: any) => {
    const { data, error } = await supabase
        .from('session_requests')
        .insert(request)
        .select()
        .single();

    if (!error && data) {
        // Create notification for mentor
        await createNotification(
            request.mentor_id,
            request.student_id,
            'session_request',
            `New session request for: ${request.topic}`,
            { sessionId: data.id, topic: request.topic }
        );
    }

    return { data, error };
};

export const fetchSessionRequests = async (userId: string, role: 'student' | 'mentor'): Promise<any[]> => {
    // First fetch session requests without profile joins (FK hints can fail if FKs point to auth.users)
    const { data, error } = await supabase
        .from('session_requests')
        .select('*')
        .eq(role === 'student' ? 'student_id' : 'mentor_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching session requests:', error);
        return [];
    }

    if (!data || data.length === 0) return [];

    // Fetch reviews for these sessions
    const sessionIds = data.map(s => s.id);
    const { data: reviews } = await supabase
        .from('mentor_reviews')
        .select('*')
        .in('session_id', sessionIds);

    const reviewMap = new Map<string, any>();
    if (reviews) {
        reviews.forEach(r => reviewMap.set(r.session_id, r));
    }

    // Collect unique mentor and student IDs to batch-fetch profiles
    const mentorIds = [...new Set(data.map(s => s.mentor_id).filter(Boolean))];
    const studentIds = [...new Set(data.map(s => s.student_id).filter(Boolean))];
    const allUserIds = [...new Set([...mentorIds, ...studentIds])];

    // Batch fetch all needed profiles
    const { data: profiles } = await supabase
        .from('user_profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', allUserIds);

    const profileMap = new Map<string, { full_name: string; avatar_url: string }>();
    if (profiles) {
        profiles.forEach(p => profileMap.set(p.user_id, p));
    }

    return data.map(s => {
        const mentorProfile = profileMap.get(s.mentor_id);
        const studentProfile = profileMap.get(s.student_id);
        const review = reviewMap.get(s.id);
        return {
            ...s,
            mentorId: s.mentor_id,
            studentId: s.student_id,
            preferredDate: s.preferred_date,
            preferredTime: s.preferred_time,
            mentorResponse: s.mentor_response,
            meetingLink: s.meeting_link,
            studentMessage: s.student_message,
            mentorProfile: {
                fullName: mentorProfile?.full_name,
                avatarUrl: mentorProfile?.avatar_url
            },
            studentProfile: {
                fullName: studentProfile?.full_name,
                avatarUrl: studentProfile?.avatar_url
            },
            review: review ? {
                id: review.id,
                rating: review.rating,
                reviewText: review.review_text,
                createdAt: new Date(review.created_at),
                studentId: review.student_id
            } : null
        };
    });
};

export const subscribeToSessionRequests = (userId: string, role: 'student' | 'mentor', onChange: () => void) => {
    return supabase
        .channel(`public:session_requests:${userId}`)
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'session_requests',
            filter: `${role === 'student' ? 'student_id' : 'mentor_id'}=eq.${userId}`
        }, () => {
            onChange();
        })
        .subscribe();
};

export const completeSessionRequest = async (requestId: string) => {
    const { data: reqData } = await supabase
        .from('session_requests')
        .select('student_id, mentor_id, topic')
        .eq('id', requestId)
        .single();

    const { error } = await supabase
        .from('session_requests')
        .update({ status: 'completed' })
        .eq('id', requestId);

    if (!error && reqData) {
        // Notify the student that their session is completed, prompting a review
        await createNotification(
            reqData.student_id,
            reqData.mentor_id,
            'session_completed',
            `Your session "${reqData.topic}" is marked as completed. Leave a review!`,
            { requiresReview: true, mentorId: reqData.mentor_id, sessionId: requestId, topic: reqData.topic }
        );
    }

    return { error };
};

export const cancelSessionRequest = async (requestId: string, role?: 'student' | 'mentor') => {
    const { data: reqData } = await supabase
        .from('session_requests')
        .select('student_id, mentor_id, topic')
        .eq('id', requestId)
        .single();

    const { error } = await supabase
        .from('session_requests')
        .update({ status: 'cancelled' })
        .eq('id', requestId);

    if (!error && reqData) {
        // Notify both parties about cancellation
        await createNotification(
            reqData.student_id,
            reqData.mentor_id,
            'session_cancelled',
            `Session "${reqData.topic}" has been cancelled.`,
            { sessionId: requestId, topic: reqData.topic }
        );
        await createNotification(
            reqData.mentor_id,
            reqData.student_id,
            'session_cancelled',
            `Session "${reqData.topic}" has been cancelled by the ${role || 'other party'}.`,
            { sessionId: requestId, topic: reqData.topic }
        );
    }

    return { error };
};

export const deleteSessionRequest = async (requestId: string) => {
    const { error } = await supabase
        .from('session_requests')
        .delete()
        .eq('id', requestId);

    return { error };
};

export const submitMentorReview = async (mentorId: string, studentId: string, requestId: string, rating: number, reviewText: string) => {
    const { error } = await supabase
        .from('mentor_reviews')
        .insert({
            mentor_id: mentorId,
            student_id: studentId,
            session_id: requestId,
            rating,
            review_text: reviewText
        });

    if (!error) {
        // Notify the mentor about the new review
        await createNotification(
            mentorId,
            studentId,
            'new_review',
            `You received a new ${rating}-star review! "${reviewText.length > 60 ? reviewText.substring(0, 60) + '...' : reviewText}"`
        );
    }

    return { error };
};

// Time utility functions
export const getTimeUntilSession = (date: string, time: string): string => {
    const sessionDate = new Date(`${date}T${time}`);
    const now = new Date();
    const diffMs = sessionDate.getTime() - now.getTime();

    if (diffMs < 0) return 'Started';

    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffHrs > 0) return `${diffHrs}h ${diffMins}m`;
    return `${diffMins}m`;
};

export const isSessionIn30Minutes = (date: string, time: string): boolean => {
    const sessionDate = new Date(`${date}T${time}`);
    const now = new Date();
    const diffMins = (sessionDate.getTime() - now.getTime()) / (1000 * 60);
    return diffMins > 0 && diffMins <= 30;
};

export const hasSessionStarted = (date: string, time: string): boolean => {
    const sessionDate = new Date(`${date}T${time}`);
    const now = new Date();
    return now >= sessionDate;
};

export const isSessionStartingNow = (date: string, time: string): boolean => {
    const sessionDate = new Date(`${date}T${time}`);
    const now = new Date();
    const diffMins = Math.abs((sessionDate.getTime() - now.getTime()) / (1000 * 60));
    return diffMins <= 5; // Within 5 minutes
};

export const isSessionSoon = (date: string, time: string): boolean => {
    const sessionDate = new Date(`${date}T${time}`);
    const now = new Date();
    const diffMins = (sessionDate.getTime() - now.getTime()) / (1000 * 60);
    return diffMins > 0 && diffMins <= 60; // Within 1 hour
};

export const isSessionIn10Minutes = (date: string, time: string): boolean => {
    const sessionDate = new Date(`${date}T${time}`);
    const now = new Date();
    const diffMins = (sessionDate.getTime() - now.getTime()) / (1000 * 60);
    return diffMins > 0 && diffMins <= 10;
};

export const isSessionWithin30Minutes = (date: string, time: string): boolean => {
    return isSessionIn30Minutes(date, time);
};

export const sendSessionReminderNotification = async (
    sessionId: string,
    mentorId: string,
    studentId: string,
    topic: string,
    minutesLeft: number
) => {
    const message = `Reminder: Your session "${topic}" starts in ${minutesLeft} minutes.`;

    // Notify both mentor and student
    await Promise.all([
        createNotification(mentorId, studentId, 'session_reminder', message, { sessionId, topic, minutesLeft }),
        createNotification(studentId, mentorId, 'session_reminder', message, { sessionId, topic, minutesLeft })
    ]);
};

export const fetchCallHistory = async (userId: string, friendId: string) => {
    const { data, error } = await supabase
        .from('call_history')
        .select('*')
        .or(`and(caller_id.eq.${userId},receiver_id.eq.${friendId}),and(caller_id.eq.${friendId},receiver_id.eq.${userId})`)
        .order('call_time', { ascending: false });

    if (error) {
        console.error('Error fetching call history:', error);
        return [];
    }
    return data;
};

export const getTotalTalkTime = async (userId: string, friendId: string) => {
    const { data, error } = await supabase.rpc('get_total_talk_time', {
        user1_id: userId,
        user2_id: friendId
    });

    if (error) {
        console.error('Error calling get_total_talk_time:', error);
        // Fallback to manual calculation if RPC fails
        const history = await fetchCallHistory(userId, friendId);
        return history.reduce((total: number, call: any) => total + (call.duration_seconds || 0), 0);
    }

    return data || 0;
};

export const clearChatHistory = async (userId: string, friendId: string, isGroup: boolean) => {
    let query = supabase.from('messages').delete();

    if (isGroup) {
        query = query.eq('group_id', friendId);
    } else {
        query = query.or(`and(sender_id.eq.${userId},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${userId})`);
    }

    const { error } = await query;
    return { error };
};
