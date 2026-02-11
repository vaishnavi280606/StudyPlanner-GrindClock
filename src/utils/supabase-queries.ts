import { supabase } from './supabase';
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

    return data.map(f => {
        // Determine which profile belongs to the friend (not the current user)
        const isUserSender = f.user_id === userId;
        const profile: any = isUserSender ? f.friend_profile : f.user_profile;

        return {
            id: isUserSender ? f.friend_id : f.user_id,
            name: profile?.full_name || 'Unknown User',
            username: profile?.username || 'unknown',
            status: 'offline',
            studyStreak: 0,
            avatarUrl: profile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.full_name || 'U')}&background=random`,
            role: profile?.role || 'student',
        };
    });
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

export const createNotification = async (userId: string, senderId: string, type: 'friend_request' | 'message' | 'call', content: string) => {
    const { error } = await supabase
        .from('notifications')
        .insert({
            user_id: userId,
            sender_id: senderId,
            type,
            content
        });

    return { error };
};

export const fetchNotifications = async (userId: string) => {
    const { data, error } = await supabase
        .from('notifications')
        .select(`
            *,
            sender_profile:user_profiles!notifications_sender_id_fkey (
                full_name,
                avatar_url,
                username
            )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching notifications:', error);
        return [];
    }

    return data.map(notif => ({
        ...notif,
        senderName: notif.sender_profile?.full_name || 'Unknown User',
        senderAvatar: notif.sender_profile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(notif.sender_profile?.full_name || 'U')}&background=random`,
        senderUsername: notif.sender_profile?.username || 'unknown'
    }));
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

    return memberData.map((m: any) => m.group);
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
        profile: m.profile
    }));
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
        rating: 4.5,
        totalReviews: 0,
        isVerified: true
    }));
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

export const fetchMentorReviews = async (mentorId: string): Promise<any[]> => {
    const { data, error } = await supabase
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

    if (error) {
        console.error('Error fetching mentor reviews:', error);
        return [];
    }

    return data.map(r => ({
        ...r,
        studentName: r.student_profile?.full_name,
        studentAvatarUrl: r.student_profile?.avatar_url,
        studentUsername: r.student_profile?.username
    }));
};

export const fetchAllMentorReviews = async (mentorIds: string[], limitPerMentor: number = 3) => {
    const reviewsMap = new Map<string, any[]>();

    // For simplicity, we fetch all reviews and filter in JS. 
    // In a real app, this would be optimized with a specialized query or RPC.
    const { data, error } = await supabase
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

    if (error) {
        console.error('Error fetching all mentor reviews:', error);
        return reviewsMap;
    }

    data.forEach(r => {
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
            'message', // Reuse message type or add session type
            `New session request for: ${request.topic}`
        );
    }

    return { data, error };
};

export const fetchSessionRequests = async (userId: string, role: 'student' | 'mentor'): Promise<any[]> => {
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
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching session requests:', error);
        return [];
    }

    return data.map(s => ({
        ...s,
        mentorProfile: {
            fullName: s.mentor_profile?.full_name,
            avatarUrl: s.mentor_profile?.avatar_url
        },
        studentProfile: {
            fullName: s.student_profile?.full_name,
            avatarUrl: s.student_profile?.avatar_url
        }
    }));
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
    const { error } = await supabase
        .from('session_requests')
        .update({ status: 'completed' })
        .eq('id', requestId);

    return { error };
};

export const cancelSessionRequest = async (requestId: string) => {
    const { error } = await supabase
        .from('session_requests')
        .update({ status: 'cancelled' })
        .eq('id', requestId);

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
            session_request_id: requestId, // Check schema if this is the correct column
            rating,
            review_text: reviewText
        });

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
