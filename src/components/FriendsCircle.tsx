import { useEffect, useState, useCallback } from 'react';
import { Users, Zap, Trophy, MessageCircle, UserPlus, Video, Search, Loader2, X, Check, UserCheck, Plus, LayoutGrid, GraduationCap, Phone } from 'lucide-react';
import { ChatBox } from './ChatBox';
import { Friend, UserProfile, Group } from '../types';
import { fetchFriends, searchUsers, sendFriendRequest, fetchUnreadCounts, subscribeToNotifications, fetchUserGroups, createGroup, fetchSessionRequests } from '../utils/supabase-queries';
import { useAuth } from '../contexts/AuthContext';

interface FriendsCircleProps {
    isDarkMode: boolean;
    onStartVideoCall: (name: string, avatar?: string, friendId?: string) => void;
    onStartChat?: (friend: any) => void;
}

export function FriendsCircle({ isDarkMode, onStartVideoCall, onStartChat }: FriendsCircleProps) {
    const [selectedChat, setSelectedChat] = useState<any | null>(null);

    const openChat = (friend: any) => {
        // Immediately clear unread count for this friend
        setUnreadCounts(prev => {
            const next = { ...prev };
            delete next[friend.id];
            return next;
        });
        setSelectedChat(friend);
    };
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'friends' | 'groups' | 'mentors'>('friends');
    const [friends, setFriends] = useState<Friend[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [mentorSessions, setMentorSessions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddFriend, setShowAddFriend] = useState(false);
    const [showCreateGroup, setShowCreateGroup] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
    const [searching, setSearching] = useState(false);
    const [requestSent, setRequestSent] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
    const [activeCalls, setActiveCalls] = useState<string[]>([]);

    // Incoming call sound — plays real audio file, falls back to Web Audio API
    const playIncomingCallSound = useCallback(() => {
        const masterEnabled = localStorage.getItem('grind_clock_sound_enabled');
        if (masterEnabled === 'false') return;
        const callEnabled = localStorage.getItem('grind_clock_incoming_call_sound');
        if (callEnabled === 'false') return;
        const vol = parseFloat(localStorage.getItem('grind_clock_sound_volume') || '0.7');
        try {
            const a = new Audio('https://cdn.pixabay.com/audio/2022/10/30/audio_f3f8e5a830.mp3');
            a.volume = vol;
            a.play().catch(() => {
                // Web Audio API fallback
                try {
                    const ctx = new AudioContext();
                    const playPulse = (offset: number) => {
                        const osc = ctx.createOscillator();
                        const gain = ctx.createGain();
                        osc.connect(gain); gain.connect(ctx.destination);
                        osc.frequency.setValueAtTime(440, ctx.currentTime + offset);
                        osc.frequency.setValueAtTime(520, ctx.currentTime + offset + 0.15);
                        osc.frequency.setValueAtTime(440, ctx.currentTime + offset + 0.30);
                        gain.gain.setValueAtTime(vol * 0.4, ctx.currentTime + offset);
                        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.5);
                        osc.start(ctx.currentTime + offset); osc.stop(ctx.currentTime + offset + 0.5);
                    };
                    playPulse(0); playPulse(0.7); playPulse(1.4);
                } catch (_) {}
            });
        } catch (_) {}
    }, []);

    // Create Group State
    const [newGroupName, setNewGroupName] = useState('');
    const [creatingGroup, setCreatingGroup] = useState(false);

    useEffect(() => {
        if (user) {
            loadData();
            loadUnreadCounts();

            // Subscribe to notifications for real-time updates
            const sub = subscribeToNotifications(user.id, (notif) => {
                if (notif.type === 'message') {
                    loadUnreadCounts();
                } else if (notif.type === 'call') {
                    setActiveCalls(prev => [...prev, notif.sender_id]);
                    playIncomingCallSound();
                    // Auto-remove call indicator after 30 seconds
                    setTimeout(() => {
                        setActiveCalls(prev => prev.filter(id => id !== notif.sender_id));
                    }, 30000);
                }
            });

            return () => {
                sub.unsubscribe();
            };
        }
    }, [user]);

    // Immediately clear unread count when switching chats via sidebar
    useEffect(() => {
        if (selectedChat) {
            setUnreadCounts(prev => {
                const next = { ...prev };
                delete next[selectedChat.id];
                return next;
            });
        }
    }, [selectedChat?.id]);

    // Listen for notifications-read events from other components (e.g. ChatBox, NotificationCenter)
    useEffect(() => {
        const handler = async () => {
            if (!user) return;
            const counts = await fetchUnreadCounts(user.id);
            setUnreadCounts(counts);
        };
        window.addEventListener('notifications-read', handler);
        return () => window.removeEventListener('notifications-read', handler);
    }, [user]);

    const loadData = async () => {
        setLoading(true);
        const [friendsData, groupsData] = await Promise.all([
            fetchFriends(user!.id),
            fetchUserGroups(user!.id)
        ]);
        setFriends(friendsData);
        setGroups(groupsData);

        // Load mentor sessions (accepted/upcoming sessions with mentors)
        try {
            const sessions = await fetchSessionRequests(user!.id, 'student');
            const activeMentorSessions = sessions.filter(
                (s: any) => s.status === 'accepted' || s.status === 'pending'
            );
            setMentorSessions(activeMentorSessions);
        } catch (err) {
            console.error('Error loading mentor sessions:', err);
        }

        setLoading(false);
    };

    const loadUnreadCounts = async () => {
        if (!user) return;
        const counts = await fetchUnreadCounts(user.id);
        setUnreadCounts(counts);
    };

    const handleSearch = async () => {
        if (!searchQuery.trim() || !user) return;
        setSearching(true);
        setError(null);
        try {
            const results = await searchUsers(searchQuery, user.id);
            setSearchResults(results);
            if (results.length === 0) {
                setError('No users found matching your search.');
            }
        } catch (err) {
            console.error('Search error:', err);
            setError('Failed to search users. Please check your database permissions.');
        } finally {
            setSearching(false);
        }
    };

    const handleSendRequest = async (friendId: string) => {
        if (!user) return;
        setError(null);
        const { error: reqError } = await sendFriendRequest(user.id, friendId);
        if (!reqError) {
            setRequestSent(prev => [...prev, friendId]);
        } else {
            console.error('Friend request error details:', reqError);
            setError(reqError.message || 'Failed to send friend request. Please try again.');
        }
    };

    const handleCreateGroup = async () => {
        if (!newGroupName.trim() || !user) return;
        setCreatingGroup(true);
        setError('');

        try {
            const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(newGroupName)}&background=random`;
            const { data, error } = await createGroup(newGroupName, avatarUrl, user.id);

            if (error) {
                console.error('Error creating group:', error);
                setError('Failed to create group.');
            } else if (data) {
                setGroups(prev => [...prev, data]);
                setShowCreateGroup(false);
                setNewGroupName('');
            } else {
                setError('Failed to create group. No data returned.');
            }
        } catch (err) {
            console.error('Unexpected error creating group:', err);
            setError('An unexpected error occurred.');
        } finally {
            setCreatingGroup(false);
        }
    };

    const onlineFriends = friends.filter(f => f.status !== 'offline');
    const studyingFriends = friends.filter(f => f.status === 'studying');

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-12 h-12 text-amber-500 animate-spin mb-4" />
                <p className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>Loading friends...</p>
            </div>
        );
    }

    /* ─── If a chat is selected, render ChatBox full-width ─── */
    if (selectedChat) {
        return (
            <div className="h-[calc(100vh-200px)] min-h-[400px] sticky top-0">
                <ChatBox
                    key={selectedChat.id}
                    friend={selectedChat}
                    friends={friends as any[]}
                    groups={groups as any[]}
                    onClose={() => { setSelectedChat(null); }}
                    onSelectFriend={(f: any) => setSelectedChat(f)}
                    onStartVideoCall={onStartVideoCall}
                    isDarkMode={isDarkMode}
                    unreadCounts={unreadCounts}
                />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Friends Circle</h2>
                    <p className={`${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Study together and stay motivated</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowCreateGroup(true)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${isDarkMode ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'}`}
                    >
                        <Plus size={20} />
                        New Group
                    </button>
                    <button
                        onClick={() => setShowAddFriend(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all"
                    >
                        <UserPlus size={20} />
                        Add Friend
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 border-b border-slate-700/50">
                <button
                    onClick={() => setActiveTab('friends')}
                    className={`pb-4 px-2 font-bold transition-all relative ${activeTab === 'friends' ? 'text-amber-500' : 'text-slate-500 hover:text-slate-400'}`}
                >
                    <span className="flex items-center gap-1.5">
                        <Users size={16} />
                        Friends
                    </span>
                    {activeTab === 'friends' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-amber-500 rounded-full" />}
                </button>
                <button
                    onClick={() => setActiveTab('groups')}
                    className={`pb-4 px-2 font-bold transition-all relative ${activeTab === 'groups' ? 'text-amber-500' : 'text-slate-500 hover:text-slate-400'}`}
                >
                    <span className="flex items-center gap-1.5">
                        <LayoutGrid size={16} />
                        Groups
                    </span>
                    {activeTab === 'groups' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-amber-500 rounded-full" />}
                </button>
                <button
                    onClick={() => setActiveTab('mentors')}
                    className={`pb-4 px-2 font-bold transition-all relative ${activeTab === 'mentors' ? 'text-amber-500' : 'text-slate-500 hover:text-slate-400'}`}
                >
                    <span className="flex items-center gap-1.5">
                        <GraduationCap size={16} />
                        Mentors
                        {mentorSessions.length > 0 && (
                            <span className="px-1.5 py-0.5 bg-amber-500 text-white text-[10px] font-bold rounded-full">
                                {mentorSessions.length}
                            </span>
                        )}
                    </span>
                    {activeTab === 'mentors' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-amber-500 rounded-full" />}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main List */}
                <div className="lg:col-span-2 space-y-4">
                    <div className={`rounded-2xl p-6 shadow-md border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                        <h3 className={`text-xl font-bold mb-4 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            {activeTab === 'friends' ? <Users size={20} className="text-amber-500" /> : activeTab === 'groups' ? <LayoutGrid size={20} className="text-amber-500" /> : <GraduationCap size={20} className="text-amber-500" />}
                            {activeTab === 'friends' ? 'Your Friends' : activeTab === 'groups' ? 'Your Groups' : 'Mentor Sessions'}
                        </h3>
                        <div className="space-y-4">
                            {activeTab === 'friends' ? (
                                friends.length > 0 ? (
                                    friends.map(friend => (
                                        <div
                                            key={friend.id}
                                            onClick={() => openChat(friend)}
                                            className={`flex items-center justify-between p-4 rounded-xl transition-all cursor-pointer ${isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-50'
                                                }`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="relative">
                                                    <img
                                                        src={friend.avatarUrl}
                                                        alt={friend.name}
                                                        className={`w-12 h-12 rounded-full object-cover border-2 ${
                                                            activeCalls.includes(friend.id)
                                                                ? 'border-green-500 ring-2 ring-green-400/50 ring-offset-2 ring-offset-transparent animate-pulse'
                                                                : unreadCounts[friend.id] > 0
                                                                    ? 'border-amber-500/40'
                                                                    : 'border-amber-500/20'
                                                        }`}
                                                    />
                                                    <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 ${isDarkMode ? 'border-slate-800' : 'border-white'
                                                        } ${friend.status === 'studying' ? 'bg-blue-500' :
                                                            friend.status === 'online' ? 'bg-green-500' : 'bg-slate-400'
                                                        }`} />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h4 className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{friend.name}</h4>
                                                        {friend.role === 'mentor' && (
                                                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${isDarkMode ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'bg-purple-50 text-purple-600 border border-purple-200'}`}>
                                                                Mentor
                                                            </span>
                                                        )}
                                                        {unreadCounts[friend.id] > 0 && (
                                                            <div className="flex items-center gap-1.5 bg-amber-500/10 text-amber-500 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-500/20 animate-pulse">
                                                                <span className="relative flex h-2 w-2">
                                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                                                                </span>
                                                                {unreadCounts[friend.id]} New
                                                            </div>
                                                        )}
                                                    </div>
                                                    <p className={`text-xs ${activeCalls.includes(friend.id) ? 'text-green-500 font-bold' : isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                                        {activeCalls.includes(friend.id) ? (
                                                            <span className="flex items-center gap-1.5 animate-pulse">
                                                                <Phone size={12} className="animate-bounce" />
                                                                <span>Incoming Call...</span>
                                                            </span>
                                                        ) :
                                                            friend.status === 'studying' ? `@${(friend as any).username || 'unknown'} · Studying ${friend.currentSubject}` :
                                                                friend.status === 'online' ? `@${(friend as any).username || 'unknown'} · Active now` : `@${(friend as any).username || 'unknown'} · Last seen recently`}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                {/* Only show streaks for student friends, not mentors */}
                                                {friend.role !== 'mentor' && (
                                                <div className="text-right">
                                                    <div className="flex items-center gap-1 text-amber-500 font-bold">
                                                        <Zap size={14} fill="currentColor" />
                                                        <span>{friend.studyStreak}</span>
                                                    </div>
                                                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Streak</p>
                                                </div>
                                                )}
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); openChat(friend); }}
                                                        className={`p-2 rounded-lg transition-all ${isDarkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                            }`}
                                                        title="Send Message"
                                                    >
                                                        <MessageCircle size={18} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); onStartVideoCall(friend.name, friend.avatarUrl, friend.id); }}
                                                        className={`p-2 rounded-lg transition-all ${isDarkMode ? 'bg-slate-700 text-blue-400 hover:bg-slate-600' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                                                            }`}
                                                        title="Start Video Call"
                                                    >
                                                        <Video size={18} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8">
                                        <p className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>No friends yet. Add some to start studying together!</p>
                                    </div>
                                )
                            ) : activeTab === 'groups' ? (
                                // Groups List
                                groups.length > 0 ? (
                                    groups.map(group => (
                                        <div
                                            key={group.id}
                                            onClick={() => openChat({ ...group, isGroup: true })}
                                            className={`flex items-center justify-between p-4 rounded-xl transition-all cursor-pointer ${isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-50'}`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <img
                                                    src={group.avatarUrl}
                                                    alt={group.name}
                                                    className="w-12 h-12 rounded-xl object-cover border-2 border-amber-500/20"
                                                />
                                                <div>
                                                    <h4 className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{group.name}</h4>
                                                    <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                                        {/* We could show member count here if we fetched it */}
                                                        Group Chat
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); openChat({ ...group, isGroup: true }); }}
                                                    className={`p-2 rounded-lg transition-all ${isDarkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                                    title="Open Group Chat"
                                                >
                                                    <MessageCircle size={18} />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onStartVideoCall(group.name, group.avatarUrl, group.id); }}
                                                    className={`p-2 rounded-lg transition-all ${isDarkMode ? 'bg-slate-700 text-blue-400 hover:bg-slate-600' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}
                                                    title="Start Video Call"
                                                >
                                                    <Video size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8">
                                        <p className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>No groups yet. Create one to chat with multiple friends!</p>
                                    </div>
                                )
                            ) : (
                                // Mentors Tab - Active mentor sessions
                                mentorSessions.length > 0 ? (
                                    mentorSessions.map((session: any) => (
                                        <div
                                            key={session.id}
                                            onClick={() => openChat({
                                                id: session.mentorId,
                                                name: session.mentorProfile?.fullName || 'Mentor',
                                                avatarUrl: session.mentorProfile?.avatarUrl || `https://ui-avatars.com/api/?name=Mentor&background=random`,
                                                status: 'online',
                                                isMentor: true
                                            })}
                                            className={`flex items-center justify-between p-4 rounded-xl transition-all cursor-pointer ${isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-50'}`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="relative">
                                                    <img
                                                        src={session.mentorProfile?.avatarUrl || `https://ui-avatars.com/api/?name=Mentor&background=random`}
                                                        alt={session.mentorProfile?.fullName || 'Mentor'}
                                                        className="w-12 h-12 rounded-full object-cover border-2 border-purple-500/30"
                                                    />
                                                    <div className={`absolute -top-1 -right-1 p-0.5 rounded-full ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>
                                                        <GraduationCap size={14} className="text-purple-500" />
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h4 className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                                            {session.mentorProfile?.fullName || 'Mentor'}
                                                        </h4>
                                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                                            session.status === 'accepted'
                                                                ? 'bg-green-500/10 text-green-500 border border-green-500/20'
                                                                : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                                        }`}>
                                                            {session.status === 'accepted' ? 'Active' : 'Pending'}
                                                        </span>
                                                    </div>
                                                    <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                                        {session.topic}
                                                    </p>
                                                    {session.preferredDate && (
                                                        <p className={`text-[10px] mt-0.5 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                                            📅 {session.preferredDate} {session.preferredTime && `at ${session.preferredTime}`}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        openChat({
                                                            id: session.mentorId,
                                                            name: session.mentorProfile?.fullName || 'Mentor',
                                                            avatarUrl: session.mentorProfile?.avatarUrl || `https://ui-avatars.com/api/?name=Mentor&background=random`,
                                                            status: 'online',
                                                            isMentor: true
                                                        });
                                                    }}
                                                    className={`p-2 rounded-lg transition-all ${isDarkMode ? 'bg-slate-700 text-purple-400 hover:bg-slate-600' : 'bg-purple-50 text-purple-600 hover:bg-purple-100'}`}
                                                    title="Chat with Mentor"
                                                >
                                                    <MessageCircle size={18} />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onStartVideoCall(
                                                            session.mentorProfile?.fullName || 'Mentor',
                                                            session.mentorProfile?.avatarUrl || `https://ui-avatars.com/api/?name=Mentor&background=random`,
                                                            session.mentorId
                                                        );
                                                    }}
                                                    className={`p-2 rounded-lg transition-all ${isDarkMode ? 'bg-slate-700 text-blue-400 hover:bg-slate-600' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}
                                                    title="Video Call Mentor"
                                                >
                                                    <Video size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8">
                                        <GraduationCap className={`mx-auto mb-2 ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`} size={40} />
                                        <p className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>No active mentor sessions</p>
                                        <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>Book a session with a mentor to see them here</p>
                                    </div>
                                )
                            )}
                        </div>
                    </div>
                </div>

                {/* Sidebar Stats */}
                <div className="space-y-6">
                    <div className={`rounded-2xl p-6 shadow-md border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                        <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            <Trophy size={20} className="text-amber-500" />
                            Leaderboard
                        </h3>
                            <div className="space-y-4">
                                {friends.length > 0 ? (
                                    [...friends].sort((a, b) => b.studyStreak - a.studyStreak).map((friend, idx) => (
                                        <div key={friend.id} className="flex items-center gap-3">
                                            <span className={`w-6 text-sm font-bold ${idx === 0 ? 'text-amber-500' : idx === 1 ? 'text-slate-400' : idx === 2 ? 'text-orange-400' : 'text-slate-500'}`}>
                                                #{idx + 1}
                                            </span>
                                            <img src={friend.avatarUrl} alt="" className="w-8 h-8 rounded-full" />
                                            <span className={`flex-1 text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                                {friend.name}
                                            </span>
                                            <span className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                                {friend.studyStreak}
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>No data available</p>
                                )}
                            </div>
                        </div>

                        <div className={`rounded-2xl p-6 shadow-md border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                            <h3 className={`text-lg font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Activity</h3>
                            <div className="space-y-4">
                                <div className="flex gap-3">
                                    <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5" />
                                    <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                        <span className="font-bold text-amber-500">{onlineFriends.length}</span> friends are online
                                    </p>
                                </div>
                                <div className="flex gap-3">
                                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5" />
                                    <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                        <span className="font-bold text-blue-500">{studyingFriends.length}</span> friends are currently grinding
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            {/* Add Friend Modal */}
            {showAddFriend && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className={`w-full max-w-md rounded-3xl shadow-2xl border overflow-hidden animate-fade-in ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'
                        }`}>
                        <div className="p-6 border-b border-slate-800/50 flex items-center justify-between bg-gradient-to-r from-amber-500/10 to-transparent">
                            <h3 className={`text-xl font-bold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                <UserPlus className="text-amber-500" />
                                Add New Friend
                            </h3>
                            <button
                                onClick={() => {
                                    setShowAddFriend(false);
                                    setSearchQuery('');
                                    setSearchResults([]);
                                }}
                                className={`p-2 rounded-full transition-all ${isDarkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
                                    }`}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {error && (
                                <div className={`p-3 rounded-xl text-sm font-medium animate-fade-in ${isDarkMode ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-red-50 text-red-600 border border-red-100'
                                    }`}>
                                    {error}
                                </div>
                            )}
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                <input
                                    type="text"
                                    placeholder="Search by username or name..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                    className={`w-full pl-10 pr-4 py-3 rounded-xl border transition-all ${isDarkMode
                                        ? 'bg-slate-800 border-slate-700 text-white focus:border-amber-500'
                                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-500'
                                        }`}
                                />
                                <button
                                    onClick={handleSearch}
                                    disabled={searching}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-amber-500 text-white rounded-lg text-sm font-bold hover:bg-amber-600 transition-all disabled:opacity-50"
                                >
                                    {searching ? <Loader2 size={16} className="animate-spin" /> : 'Search'}
                                </button>
                            </div>

                            <div className="space-y-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                                {searchResults.length > 0 ? (
                                    searchResults.map(result => (
                                        <div
                                            key={result.id}
                                            className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${isDarkMode ? 'bg-slate-800/50 border-slate-700 hover:bg-slate-800' : 'bg-slate-50 border-slate-100 hover:bg-white'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <img
                                                    src={result.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(result.fullName || '')}&background=random`}
                                                    alt=""
                                                    className="w-10 h-10 rounded-full object-cover"
                                                />
                                                <div>
                                                    <h4 className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{result.fullName}</h4>
                                                    <p className="text-xs text-slate-500">@{result.username}</p>
                                                </div>
                                            </div>
                                            {requestSent.includes(result.userId!) ? (
                                                <div className="flex items-center gap-1 text-green-500 text-xs font-bold px-3 py-1.5 bg-green-500/10 rounded-lg">
                                                    <Check size={14} />
                                                    Sent
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => handleSendRequest(result.userId!)}
                                                    className="p-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-all shadow-sm"
                                                    title="Send Friend Request"
                                                >
                                                    <UserPlus size={18} />
                                                </button>
                                            )}
                                        </div>
                                    ))
                                ) : searchQuery && !searching ? (
                                    <div className="text-center py-8">
                                        <p className="text-slate-500 text-sm">No users found matching "{searchQuery}"</p>
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <UserCheck className="w-12 h-12 text-slate-700 mx-auto mb-2 opacity-20" />
                                        <p className="text-slate-500 text-sm">Search for friends to connect</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Group Modal */}
            {showCreateGroup && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className={`w-full max-w-md rounded-3xl shadow-2xl border overflow-hidden animate-fade-in ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                        <div className="p-6 border-b border-slate-800/50 flex items-center justify-between bg-gradient-to-r from-amber-500/10 to-transparent">
                            <h3 className={`text-xl font-bold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                <Plus className="text-amber-500" />
                                Create New Group
                            </h3>
                            <button
                                onClick={() => setShowCreateGroup(false)}
                                className={`p-2 rounded-full transition-all ${isDarkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-6">
                            <div>
                                <label className={`block text-sm font-bold mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Group Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Study Squad"
                                    value={newGroupName}
                                    onChange={(e) => setNewGroupName(e.target.value)}
                                    className={`w-full px-4 py-3 rounded-xl border transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white focus:border-amber-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-500'}`}
                                />
                            </div>
                            <button
                                onClick={handleCreateGroup}
                                disabled={creatingGroup || !newGroupName.trim()}
                                className="w-full py-3 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {creatingGroup ? <Loader2 size={20} className="animate-spin" /> : 'Create Group'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
