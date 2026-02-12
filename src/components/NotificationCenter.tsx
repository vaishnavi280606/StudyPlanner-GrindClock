import { useState, useEffect, useRef } from 'react';
import { Bell, Check, X, Loader2, Inbox, MessageSquare, Phone, UserPlus, Users, Calendar, Star, CheckCircle, XCircle, Ban } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { fetchPendingFriendRequests, updateFriendRequestStatus, fetchNotifications, subscribeToNotifications, submitMentorReview } from '../utils/supabase-queries';
import { ReviewPopup } from './ReviewPopup';
import { supabase } from '../utils/supabase';

interface NotificationCenterProps {
    isDarkMode: boolean;
    onNotificationClick?: (notification: any) => void;
}

export function NotificationCenter({ isDarkMode, onNotificationClick }: NotificationCenterProps) {
    const [showReviewPopup, setShowReviewPopup] = useState(false);
    const [reviewPopupData, setReviewPopupData] = useState<any>(null);
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [friendRequests, setFriendRequests] = useState<any[]>([]);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        console.log('[NotificationCenter] Mounted/User Changed. User:', user?.id);
        if (user) {
            loadData();

            // Subscribe to new notifications
            const sub = subscribeToNotifications(user.id, (newNotif) => {
                console.log('[NotificationCenter] Realtime update received:', newNotif);

                // Optimistically add to list (msg content/type is enough for badge)
                setNotifications(prev => {
                    if (prev.find(n => n.id === newNotif.id)) return prev;
                    const notifWithDefaults = { ...newNotif, is_read: false };
                    return [notifWithDefaults, ...prev];
                });

                // Auto-open the notification panel when a new notification arrives
                setIsOpen(true);

                // Fetch full details in background to get sender profiles
                refreshNotifications();
            });

            // Refresh every 60 seconds as fallback
            const interval = setInterval(loadData, 60000);

            return () => {
                console.log('[NotificationCenter] Unsubscribing/Cleaning up');
                sub.unsubscribe();
                clearInterval(interval);
            };
        }
    }, [user]);

    // Listen for notifications-read events from other components (e.g. ChatBox)
    useEffect(() => {
        const handler = () => { refreshNotifications(); };
        window.addEventListener('notifications-read', handler);
        return () => window.removeEventListener('notifications-read', handler);
    }, [user]);

    const toggleNotifications = () => {
        console.log('[NotificationCenter] Toggling notifications. Current state:', isOpen);
        setIsOpen(!isOpen);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const loadData = async () => {
        if (!user) return;
        setLoading(true);

        const [requests, notifs] = await Promise.all([
            fetchPendingFriendRequests(user.id),
            fetchNotifications(user.id)
        ]);

        setFriendRequests(requests);
        setNotifications(notifs);
        setLoading(false);
    };

    const refreshNotifications = async () => {
        if (!user) return;
        const notifs = await fetchNotifications(user.id);
        setNotifications(notifs);
    };

    const handleAction = async (requestId: string, status: 'accepted' | 'rejected') => {
        setProcessingId(requestId);
        const { error } = await updateFriendRequestStatus(requestId, status);
        if (!error) {
            setFriendRequests(prev => prev.filter(req => req.id !== requestId));
        }
        setProcessingId(null);
    };

    const markAsRead = async (notificationId: string) => {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', notificationId);

        if (!error) {
            setNotifications(prev => prev.filter(n => n.id !== notificationId));
            window.dispatchEvent(new CustomEvent('notifications-read'));
        }
    };

    const markAllAsRead = async () => {
        if (!user) return;
        const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
        if (unreadIds.length === 0) return;
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', user.id)
            .eq('is_read', false);
        if (!error) {
            setNotifications([]);
            window.dispatchEvent(new CustomEvent('notifications-read'));
        }
    };

    const unreadNotifications = (notifications || []).filter(n => !n.is_read);
    const totalCount = (friendRequests || []).length + unreadNotifications.length;
    // Show only unread notifications excluding call_ended
    const displayNotifications = (notifications || []).filter(n => !n.is_read && n.type !== 'call_ended').slice(0, 20);

    console.log('[DEBUG-NOTIF] [NotificationCenter] Rendering:', {
        totalCount,
        friendRequestsCount: (friendRequests || []).length,
        unreadNotificationsCount: unreadNotifications.length,
        isOpen,
        hasUser: !!user
    });

    // Handler for notification click
    const handleNotificationClick = (notif: any) => {
        console.log('[NotificationCenter] Notification clicked:', notif);
        // If it's a session_completed notification and requires review, show popup
        if (notif.type === 'session_completed' && notif.metadata?.requiresReview) {
            console.log('[NotificationCenter] Detected session_completed notification with requiresReview:', notif);
            setReviewPopupData({
                mentorId: notif.metadata.mentorId,
                sessionId: notif.metadata.sessionId,
                topic: notif.metadata.topic,
                mentorName: notif.senderName,
                notificationId: notif.id
            });
            setShowReviewPopup(true);
        } else {
            if (onNotificationClick) onNotificationClick(notif);
        }
    };

    const handleSubmitReview = async (rating: number, review: string) => {
        if (!reviewPopupData || !user) {
            console.warn('[NotificationCenter] Review popup data or user missing:', { reviewPopupData, user });
            return;
        }
        console.log('[NotificationCenter] Submitting review:', {
            mentorId: reviewPopupData.mentorId,
            studentId: user.id,
            sessionId: reviewPopupData.sessionId,
            rating,
            review
        });
        await submitMentorReview(
            reviewPopupData.mentorId,
            user.id,
            reviewPopupData.sessionId,
            rating,
            review
        );
        // Mark notification as read
        await markAsRead(reviewPopupData.notificationId);
        setShowReviewPopup(false);
        setReviewPopupData(null);
        // Optionally, refresh notifications
        refreshNotifications();
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Review Popup (rendered once, outside loops) */}
            <ReviewPopup
                isOpen={showReviewPopup}
                onClose={() => { setShowReviewPopup(false); setReviewPopupData(null); }}
                onSubmit={handleSubmitReview}
                mentorName={reviewPopupData?.mentorName}
            />
            <button
                onClick={toggleNotifications}
                className={`p-2 rounded-lg transition-all ${isDarkMode
                    ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                title="Notifications"
            >
                <Bell size={20} className={totalCount > 0 ? 'animate-wiggle' : ''} />
                {totalCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[20px] h-5 flex items-center justify-center px-1 rounded-full bg-amber-500 text-white text-[10px] font-bold leading-none shadow-lg">
                        {totalCount > 99 ? '99+' : totalCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className={`absolute right-0 mt-2 w-80 rounded-2xl shadow-2xl border overflow-hidden z-[100] animate-fade-in ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'
                    }`}>
                    <div className="p-4 border-b border-slate-800/50 bg-gradient-to-r from-amber-500/10 to-transparent flex justify-between items-center">
                        <h3 className={`font-bold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            <Inbox size={18} className="text-amber-500" />
                            Notifications
                        </h3>
                    </div>

                    <div className="max-h-96 overflow-y-auto scrollbar-hide">
                        {loading && friendRequests.length === 0 && notifications.length === 0 ? (
                            <div className="p-8 text-center">
                                <Loader2 className="w-8 h-8 text-amber-500 animate-spin mx-auto mb-2" />
                                <p className="text-sm text-slate-500">Loading...</p>
                            </div>
                        ) : (friendRequests.length > 0 || displayNotifications.length > 0) ? (
                            <div className="divide-y divide-slate-800/30">
                                {/* Friend Requests */}
                                {friendRequests.map(req => (
                                    <div key={req.id} className="p-4 hover:bg-slate-800/30 transition-all">
                                        <div className="flex items-start gap-3">
                                            <div className="relative">
                                                <img
                                                    src={req.avatarUrl}
                                                    alt=""
                                                    className="w-10 h-10 rounded-full object-cover"
                                                />
                                                <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-0.5 border-2 border-slate-900">
                                                    <UserPlus size={8} className="text-white" />
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm font-bold truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                                    {req.name}
                                                </p>
                                                <p className="text-xs text-slate-500 truncate mb-3">
                                                    wants to be your friend
                                                </p>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleAction(req.id, 'accepted')}
                                                        disabled={processingId === req.id}
                                                        className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-bold hover:bg-amber-600 transition-all disabled:opacity-50"
                                                    >
                                                        {processingId === req.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                                                        Accept
                                                    </button>
                                                    <button
                                                        onClick={() => handleAction(req.id, 'rejected')}
                                                        disabled={processingId === req.id}
                                                        className={`flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50 ${isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                            }`}
                                                    >
                                                        <X size={14} />
                                                        Ignore
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {/* Incoming Call Notifications (unread only) */}
                                {displayNotifications.filter(n => !n.is_read && n.type === 'call').map(notif => (
                                    <div
                                        key={notif.id}
                                        className={`p-4 border-l-4 border-green-500 bg-green-500/5 hover:bg-green-500/10 transition-all`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="relative">
                                                <img
                                                    src={notif.senderAvatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix'}
                                                    alt=""
                                                    className="w-12 h-12 rounded-full object-cover border-2 border-green-500"
                                                />
                                                <div className="absolute -bottom-1 -right-1 bg-green-500 p-1 rounded-full border-2 border-slate-900 animate-pulse">
                                                    <Phone size={12} className="text-white" />
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`font-bold truncate mb-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                                    {notif.senderName}
                                                </p>
                                                <p className="text-green-500 text-sm font-medium mb-3 flex items-center gap-1 animate-pulse">
                                                    <Phone size={14} />
                                                    Incoming call...
                                                </p>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => {
                                                            markAsRead(notif.id);
                                                            if (onNotificationClick) onNotificationClick(notif);
                                                            setIsOpen(false);
                                                        }}
                                                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-green-500 text-white rounded-lg text-xs font-bold hover:bg-green-600 transition-all"
                                                    >
                                                        <Phone size={14} />
                                                        Answer
                                                    </button>
                                                    <button
                                                        onClick={() => markAsRead(notif.id)}
                                                        className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs font-bold transition-all ${isDarkMode ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-red-100 text-red-600 hover:bg-red-200'
                                                            }`}
                                                    >
                                                        <X size={14} />
                                                        Decline
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {/* All Notifications (excluding active calls) */}
                                {displayNotifications.filter(n => n.type !== 'call').map(notif => (
                                    <div
                                        key={notif.id}
                                        className={`p-4 transition-all cursor-pointer ${!notif.is_read
                                            ? (isDarkMode ? 'bg-amber-500/10 hover:bg-amber-500/15' : 'bg-amber-50 hover:bg-amber-100/80')
                                            : (isDarkMode ? 'hover:bg-slate-800/30 opacity-70' : 'hover:bg-slate-50 opacity-70')}`}
                                        onClick={() => {
                                            if (!notif.is_read) markAsRead(notif.id);
                                            handleNotificationClick(notif);
                                            setIsOpen(false);
                                        }}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="relative">
                                                <img
                                                    src={notif.senderAvatar}
                                                    alt=""
                                                    className="w-10 h-10 rounded-full object-cover"
                                                />
                                                <div className={`absolute -bottom-1 -right-1 rounded-full p-0.5 border-2 border-slate-900 ${
                                                    notif.type === 'message' ? 'bg-green-500' :
                                                    notif.type === 'group_added' ? 'bg-purple-500' :
                                                    notif.type === 'session_accepted' ? 'bg-green-500' :
                                                    notif.type === 'session_rejected' ? 'bg-red-500' :
                                                    notif.type === 'session_completed' ? 'bg-blue-500' :
                                                    notif.type === 'session_cancelled' ? 'bg-slate-500' :
                                                    notif.type === 'session_request' ? 'bg-amber-500' :
                                                    notif.type === 'new_review' ? 'bg-yellow-500' :
                                                    'bg-amber-500'
                                                    }`}>
                                                    {notif.type === 'message' ? (
                                                        <MessageSquare size={8} className="text-white" />
                                                    ) : notif.type === 'group_added' ? (
                                                        <Users size={8} className="text-white" />
                                                    ) : notif.type === 'session_accepted' ? (
                                                        <CheckCircle size={8} className="text-white" />
                                                    ) : notif.type === 'session_rejected' ? (
                                                        <XCircle size={8} className="text-white" />
                                                    ) : notif.type === 'session_completed' ? (
                                                        <Check size={8} className="text-white" />
                                                    ) : notif.type === 'session_cancelled' ? (
                                                        <Ban size={8} className="text-white" />
                                                    ) : notif.type === 'session_request' ? (
                                                        <Calendar size={8} className="text-white" />
                                                    ) : notif.type === 'new_review' ? (
                                                        <Star size={8} className="text-white" />
                                                    ) : (
                                                        <Phone size={8} className="text-white" />
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start gap-2">
                                                    <p className={`text-sm font-bold truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                                        {notif.senderName}
                                                    </p>
                                                    <div className="flex items-center gap-1.5">
                                                        {!notif.is_read && (
                                                            <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0"></span>
                                                        )}
                                                        <span className="text-[10px] text-slate-500 whitespace-nowrap">
                                                            {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                </div>
                                                <p className={`text-xs mt-1 line-clamp-2 ${!notif.is_read ? (isDarkMode ? 'text-slate-300' : 'text-slate-700') : 'text-slate-500'}`}>
                                                    {notif.type === 'group_added' && notif.metadata ? (
                                                        <>
                                                            Added you to <span className="font-bold text-amber-500">{notif.metadata.groupName}</span>
                                                        </>
                                                    ) : notif.type === 'message' ? (
                                                        <span className="flex items-center gap-1">
                                                            <MessageSquare size={10} className="flex-shrink-0" />
                                                            {notif.content || 'Sent you a message'}
                                                        </span>
                                                    ) : notif.type === 'session_accepted' ? (
                                                        <span className="flex items-center gap-1 text-green-500">
                                                            <CheckCircle size={10} className="flex-shrink-0" />
                                                            {notif.content || 'Session accepted!'}
                                                        </span>
                                                    ) : notif.type === 'session_rejected' ? (
                                                        <span className="flex items-center gap-1 text-red-400">
                                                            <XCircle size={10} className="flex-shrink-0" />
                                                            {notif.content || 'Session declined'}
                                                        </span>
                                                    ) : notif.type === 'session_completed' ? (
                                                        <span className="flex items-center gap-1 text-blue-400">
                                                            <Check size={10} className="flex-shrink-0" />
                                                            {notif.content || 'Session completed'}
                                                        </span>
                                                    ) : notif.type === 'session_cancelled' ? (
                                                        <span className="flex items-center gap-1 text-slate-400">
                                                            <Ban size={10} className="flex-shrink-0" />
                                                            {notif.content || 'Session cancelled'}
                                                        </span>
                                                    ) : notif.type === 'session_request' ? (
                                                        <span className="flex items-center gap-1 text-amber-400">
                                                            <Calendar size={10} className="flex-shrink-0" />
                                                            {notif.content || 'New session request'}
                                                        </span>
                                                    ) : notif.type === 'new_review' ? (
                                                        <span className="flex items-center gap-1 text-yellow-400">
                                                            <Star size={10} className="flex-shrink-0" />
                                                            {notif.content || 'You received a new review!'}
                                                        </span>
                                                    ) : notif.type === 'friend_request' ? (
                                                        'Wants to be your friend'
                                                    ) : (notif.metadata?.message || notif.content || 'New notification')}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-8 text-center">
                                <div className="w-12 h-12 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <Bell className="text-slate-600" size={24} />
                                </div>
                                <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                    No new notifications
                                </p>
                                <p className="text-xs text-slate-500 mt-1">
                                    You're all caught up!
                                </p>
                            </div>
                        )}
                    </div>

                    {totalCount > 0 && (
                        <div className="p-3 bg-slate-800/30 text-center border-t border-slate-800/50">
                            <button onClick={markAllAsRead} className="text-xs font-bold text-amber-500 hover:text-amber-400 transition-all">
                                Mark all as read
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
