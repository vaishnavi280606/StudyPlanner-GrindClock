import React, { useState, useEffect } from 'react';
import {
  Calendar, Star, Clock, Loader2, MessageCircle, Video,
  CheckCircle, XCircle, Link2, Edit3, Copy,
  ChevronDown, ChevronUp, Send, AlertCircle, Timer,
  CheckCheck, Ban
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  fetchSessionRequests,
  fetchMentorReviews,
  subscribeToSessionRequests,
  subscribeToMentorReviews,
  acceptSessionRequest,
  rejectSessionRequest,
  updateSessionMeetingLink,
  completeSessionRequest,
  cancelSessionRequest,
} from '../utils/supabase-queries';

interface MentorSessionsPageProps {
  isDarkMode: boolean;
  onStartVideoCall?: (name: string, avatar?: string, friendId?: string) => void;
  onStartChat?: (friend: any) => void;
}

export const MentorSessionsPage: React.FC<MentorSessionsPageProps> = ({ isDarkMode, onStartVideoCall, onStartChat }) => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'accepted' | 'completed' | 'rejected' | 'cancelled'>('all');
  const dark = isDarkMode;

  // Accept/reject form state
  const [actionId, setActionId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'accept' | 'reject' | null>(null);
  const [responseText, setResponseText] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Meeting link edit state
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [editLinkValue, setEditLinkValue] = useState('');
  const [savingLink, setSavingLink] = useState(false);

  // Expand/collapse
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Complete/cancel confirm
  const [confirmAction, setConfirmAction] = useState<{ id: string; type: 'complete' | 'cancel' } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [sessionsData, reviewsData] = await Promise.all([
        fetchSessionRequests(user.id, 'mentor'),
        fetchMentorReviews(user.id)
      ]);
      setSessions(sessionsData);
      setReviews(reviewsData);
    } catch (err) {
      console.error('Error loading sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadData();
      const sub = subscribeToSessionRequests(user.id, 'mentor', loadData);
      const reviewSub = subscribeToMentorReviews(user.id, () => loadData());
      return () => { sub.unsubscribe(); reviewSub.unsubscribe(); };
    }
  }, [user]);

  const filteredSessions = filter === 'all' ? sessions : sessions.filter(s => s.status === filter);
  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum: number, r: any) => sum + (r.rating || 0), 0) / reviews.length).toFixed(1)
    : '0.0';

  const statusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'accepted': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'completed': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'rejected': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'cancelled': return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
      default: return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
    }
  };

  // Time until session helper
  const getTimeUntil = (dateStr: string, timeStr: string) => {
    try {
      const dt = new Date(`${dateStr}T${timeStr}`);
      const now = new Date();
      const diff = dt.getTime() - now.getTime();
      if (diff <= 0) return null;
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      if (hours > 48) return `${Math.floor(hours / 24)}d`;
      if (hours > 0) return `${hours}h ${mins}m`;
      return `${mins}m`;
    } catch { return null; }
  };

  const handleAccept = async () => {
    if (!actionId) return;
    setSubmitting(true);
    try {
      await acceptSessionRequest(actionId, responseText || 'Accepted!', meetingLink || '');
      setActionId(null); setActionType(null); setResponseText(''); setMeetingLink('');
      await loadData();
    } catch (err) { console.error('Error accepting:', err); }
    finally { setSubmitting(false); }
  };

  const handleReject = async () => {
    if (!actionId) return;
    setSubmitting(true);
    try {
      await rejectSessionRequest(actionId, responseText || 'Sorry, not available');
      setActionId(null); setActionType(null); setResponseText('');
      await loadData();
    } catch (err) { console.error('Error rejecting:', err); }
    finally { setSubmitting(false); }
  };

  const handleSaveMeetingLink = async () => {
    if (!editingLinkId) return;
    setSavingLink(true);
    try {
      await updateSessionMeetingLink(editingLinkId, editLinkValue);
      setEditingLinkId(null); setEditLinkValue('');
      await loadData();
    } catch (err) { console.error('Error updating link:', err); }
    finally { setSavingLink(false); }
  };

  const copyToClipboard = (text: string) => { navigator.clipboard.writeText(text).catch(() => { }); };

  const handleCompleteSession = async (id: string) => {
    setActionLoading(true);
    try {
      await completeSessionRequest(id);
      setConfirmAction(null);
      await loadData();
    } catch (err) { console.error('Error completing session:', err); }
    finally { setActionLoading(false); }
  };

  const handleCancelSession = async (id: string) => {
    setActionLoading(true);
    try {
      await cancelSessionRequest(id);
      setConfirmAction(null);
      await loadData();
    } catch (err) { console.error('Error cancelling session:', err); }
    finally { setActionLoading(false); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 sm:px-6 lg:px-8">
      {/* Confirm Complete/Cancel Dialog */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className={`p-6 rounded-2xl shadow-2xl max-w-sm w-full mx-4 ${dark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200'}`}>
            <div className="text-center">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3 ${confirmAction.type === 'complete' ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                {confirmAction.type === 'complete' ? <CheckCheck size={28} className="text-green-500" /> : <Ban size={28} className="text-red-500" />}
              </div>
              <h4 className={`text-lg font-bold mb-1 ${dark ? 'text-white' : 'text-slate-900'}`}>
                {confirmAction.type === 'complete' ? 'Mark as Complete?' : 'Cancel Session?'}
              </h4>
              <p className={`text-sm mb-4 ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
                {confirmAction.type === 'complete' ? 'The student will be able to leave a review.' : 'The student will be notified of cancellation.'}
              </p>
              <div className="flex gap-2">
                <button onClick={() => setConfirmAction(null)} className={`flex-1 py-2.5 rounded-xl text-sm font-bold ${dark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>No, go back</button>
                <button
                  onClick={() => confirmAction.type === 'complete' ? handleCompleteSession(confirmAction.id) : handleCancelSession(confirmAction.id)}
                  disabled={actionLoading}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 flex items-center justify-center gap-1 ${confirmAction.type === 'complete' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}`}
                >
                  {actionLoading ? <Loader2 size={14} className="animate-spin" /> : null}
                  {confirmAction.type === 'complete' ? 'Complete' : 'Cancel it'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className={`text-3xl font-bold ${dark ? 'text-white' : 'text-slate-900'}`}>My Sessions</h2>
          <p className={dark ? 'text-slate-400' : 'text-slate-600'}>Manage session requests and upcoming meetings</p>
        </div>
        <div className="flex items-center gap-3">
          {sessions.filter(s => s.status === 'pending').length > 0 && (
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${dark ? 'bg-amber-500/10 border-amber-500/20' : 'bg-amber-50 border-amber-200'}`}>
              <AlertCircle size={16} className="text-amber-500" />
              <span className="text-sm font-bold text-amber-500">{sessions.filter(s => s.status === 'pending').length} pending</span>
            </div>
          )}
          <div className={`flex items-center gap-3 px-4 py-2 rounded-xl border ${dark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <Star size={18} className="text-amber-500" fill="currentColor" />
            <div>
              <p className={`text-lg font-bold ${dark ? 'text-white' : 'text-slate-900'}`}>{avgRating}</p>
              <p className={`text-[10px] ${dark ? 'text-slate-500' : 'text-slate-400'}`}>{reviews.length} reviews</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'pending', 'accepted', 'completed', 'rejected', 'cancelled'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all capitalize ${filter === f
                ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md'
                : dark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
          >
            {f} {f !== 'all' && `(${sessions.filter(s => s.status === f).length})`}
            {f === 'all' && ` (${sessions.length})`}
          </button>
        ))}
      </div>

      {/* Sessions List */}
      <div className="space-y-5">
        {filteredSessions.length === 0 ? (
          <div className={`text-center py-16 rounded-2xl border ${dark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}`}>
            <Calendar className={`mx-auto mb-3 ${dark ? 'text-slate-600' : 'text-slate-300'}`} size={48} />
            <p className={dark ? 'text-slate-400' : 'text-slate-600'}>No sessions found</p>
          </div>
        ) : (
          filteredSessions.map((session: any) => {
            const review = reviews.find((r: any) => r.session_id === session.id);
            const isExpanded = expandedId === session.id;
            const isAcceptingThis = actionId === session.id && actionType === 'accept';
            const isRejectingThis = actionId === session.id && actionType === 'reject';
            const isEditingLink = editingLinkId === session.id;
            const timeUntil = session.status === 'accepted' && session.preferredDate && session.preferredTime
              ? getTimeUntil(session.preferredDate, session.preferredTime)
              : null;

            return (
              <div key={session.id} className={`rounded-2xl border transition-all duration-300 shadow-sm hover:shadow-lg ${session.status === 'pending'
                  ? dark ? 'bg-slate-800 border-amber-500/30 ring-1 ring-amber-500/10 hover:ring-amber-500/30' : 'bg-white border-amber-200 ring-1 ring-amber-100 hover:shadow-amber-100'
                  : session.status === 'accepted'
                    ? dark ? 'bg-slate-800 border-green-500/20 hover:border-green-500/40' : 'bg-white border-green-200 hover:shadow-green-100'
                    : session.status === 'completed'
                      ? dark ? 'bg-slate-800 border-blue-500/20 hover:border-blue-500/40' : 'bg-white border-blue-200 hover:shadow-blue-100'
                      : dark ? 'bg-slate-800 border-slate-700 hover:border-slate-600' : 'bg-white border-slate-200 hover:border-slate-300'
                }`}>
                {/* Main Row */}
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <img
                        src={session.studentProfile?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(session.studentProfile?.fullName || 'S')}&background=random`}
                        alt=""
                        className="w-14 h-14 rounded-full object-cover border-2 border-amber-500/20 shrink-0 shadow-md"
                      />
                      <div className="min-w-0">
                        <h4 className={`font-bold truncate ${dark ? 'text-white' : 'text-slate-900'}`}>
                          {session.studentProfile?.fullName || 'Student'}
                        </h4>
                        <p className={`text-sm truncate ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
                          {session.topic}
                        </p>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          {session.preferredDate && (
                            <span className={`text-xs flex items-center gap-1 ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
                              <Calendar size={12} /> {session.preferredDate}
                            </span>
                          )}
                          {session.preferredTime && (
                            <span className={`text-xs flex items-center gap-1 ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
                              <Clock size={12} /> {session.preferredTime}
                            </span>
                          )}
                          {timeUntil && (
                            <span className="text-xs flex items-center gap-1 text-green-500 font-bold">
                              <Timer size={12} /> in {timeUntil}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      <span className={`text-[11px] px-2.5 py-1 rounded-full font-bold capitalize border ${statusColor(session.status)}`}>
                        {session.status}
                      </span>

                      {/* Accept / Reject buttons for pending */}
                      {session.status === 'pending' && (
                        <>
                          <button
                            onClick={() => { setActionId(session.id); setActionType('accept'); setResponseText(''); setMeetingLink(''); }}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-green-500 text-white hover:bg-green-600 transition-all flex items-center gap-1 shadow-sm"
                          >
                            <CheckCircle size={12} /> Accept
                          </button>
                          <button
                            onClick={() => { setActionId(session.id); setActionType('reject'); setResponseText(''); }}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-500 text-white hover:bg-red-600 transition-all flex items-center gap-1 shadow-sm"
                          >
                            <XCircle size={12} /> Reject
                          </button>
                        </>
                      )}

                      {session.status !== 'pending' && session.studentId && onStartChat && (
                        <button
                          onClick={() => onStartChat({ id: session.studentId, name: session.studentProfile?.fullName || 'Student', avatarUrl: session.studentProfile?.avatarUrl, status: 'online' })}
                          className={`p-2 rounded-lg transition-all ${dark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                          title="Chat"
                        >
                          <MessageCircle size={16} />
                        </button>
                      )}
                      {session.status === 'accepted' && session.studentId && onStartVideoCall && (
                        <button
                          onClick={() => onStartVideoCall(session.studentProfile?.fullName || 'Student', session.studentProfile?.avatarUrl, session.studentId)}
                          className="p-2 rounded-lg transition-all bg-blue-500 text-white hover:bg-blue-600 shadow-sm"
                          title="Start Video Call"
                        >
                          <Video size={16} />
                        </button>
                      )}
                      {/* Complete / Cancel for accepted sessions */}
                      {session.status === 'accepted' && (
                        <>
                          <button
                            onClick={() => setConfirmAction({ id: session.id, type: 'complete' })}
                            className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-green-500/10 text-green-500 hover:bg-green-500/20 transition-all flex items-center gap-1"
                            title="Mark Complete"
                          >
                            <CheckCheck size={12} /> Done
                          </button>
                          <button
                            onClick={() => setConfirmAction({ id: session.id, type: 'cancel' })}
                            className={`p-1.5 rounded-lg transition-all ${dark ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-red-50 text-red-400'}`}
                            title="Cancel Session"
                          >
                            <Ban size={14} />
                          </button>
                        </>
                      )}

                      <button
                        onClick={() => setExpandedId(isExpanded ? null : session.id)}
                        className={`p-1.5 rounded-lg transition-all ${dark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-400'}`}
                      >
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Meeting Link for accepted sessions */}
                  {session.status === 'accepted' && session.meetingLink && !isEditingLink && (
                    <div className={`mt-3 flex items-center gap-2 px-4 py-2 rounded-xl ${dark ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-200'}`}>
                      <Link2 size={14} className="text-blue-500 shrink-0" />
                      <a href={session.meetingLink} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 hover:underline truncate flex-1">
                        {session.meetingLink}
                      </a>
                      <button onClick={() => copyToClipboard(session.meetingLink)} className={`p-1 rounded ${dark ? 'hover:bg-slate-700' : 'hover:bg-blue-100'} transition-all`} title="Copy">
                        <Copy size={12} className="text-blue-400" />
                      </button>
                      <button onClick={() => { setEditingLinkId(session.id); setEditLinkValue(session.meetingLink || ''); }} className={`p-1 rounded ${dark ? 'hover:bg-slate-700' : 'hover:bg-blue-100'} transition-all`} title="Edit">
                        <Edit3 size={12} className="text-blue-400" />
                      </button>
                    </div>
                  )}
                  {session.status === 'accepted' && !session.meetingLink && !isEditingLink && (
                    <button
                      onClick={() => { setEditingLinkId(session.id); setEditLinkValue(''); }}
                      className={`mt-3 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border border-dashed ${dark ? 'border-slate-600 text-slate-400 hover:border-blue-500 hover:text-blue-400' : 'border-slate-300 text-slate-500 hover:border-blue-400 hover:text-blue-500'
                        }`}
                    >
                      <Link2 size={14} /> Add Meeting Link
                    </button>
                  )}
                  {isEditingLink && (
                    <div className="mt-3 flex items-center gap-2">
                      <div className="relative flex-1">
                        <Link2 size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${dark ? 'text-slate-500' : 'text-slate-400'}`} />
                        <input type="url" value={editLinkValue} onChange={e => setEditLinkValue(e.target.value)} placeholder="https://meet.google.com/... or Zoom link"
                          className={`w-full pl-9 pr-3 py-2 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${dark ? 'bg-slate-700 border-slate-600 text-white placeholder:text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'}`}
                        />
                      </div>
                      <button onClick={handleSaveMeetingLink} disabled={savingLink} className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 flex items-center gap-1">
                        {savingLink ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />} Save
                      </button>
                      <button onClick={() => setEditingLinkId(null)} className={`px-3 py-2 rounded-xl text-xs font-bold ${dark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-500'}`}>Cancel</button>
                    </div>
                  )}
                </div>

                {/* Accept Form */}
                {isAcceptingThis && (
                  <div className={`px-5 pb-5 border-t ${dark ? 'border-slate-700' : 'border-slate-200'}`}>
                    <div className="pt-4 space-y-3">
                      <h5 className={`text-sm font-bold flex items-center gap-2 ${dark ? 'text-green-400' : 'text-green-600'}`}>
                        <CheckCircle size={14} /> Accept Session Request
                      </h5>
                      <div>
                        <label className={`text-xs font-bold mb-1 block ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Response to student (optional)</label>
                        <input type="text" value={responseText} onChange={e => setResponseText(e.target.value)} placeholder="e.g. Looking forward to it!"
                          className={`w-full px-4 py-2 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-green-500/40 ${dark ? 'bg-slate-700 border-slate-600 text-white placeholder:text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'}`}
                        />
                      </div>
                      <div>
                        <label className={`text-xs font-bold mb-1 block ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Meeting Link (Google Meet / Zoom)</label>
                        <div className="relative">
                          <Link2 size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${dark ? 'text-slate-500' : 'text-slate-400'}`} />
                          <input type="url" value={meetingLink} onChange={e => setMeetingLink(e.target.value)} placeholder="https://meet.google.com/abc-defg-hij"
                            className={`w-full pl-9 pr-3 py-2 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-green-500/40 ${dark ? 'bg-slate-700 border-slate-600 text-white placeholder:text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'}`}
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={handleAccept} disabled={submitting} className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-green-500 text-white hover:bg-green-600 disabled:opacity-50 flex items-center justify-center gap-2">
                          {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                          {submitting ? 'Accepting...' : 'Accept & Send'}
                        </button>
                        <button onClick={() => { setActionId(null); setActionType(null); }} className={`px-5 py-2.5 rounded-xl text-sm font-bold ${dark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>Cancel</button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Reject Form */}
                {isRejectingThis && (
                  <div className={`px-5 pb-5 border-t ${dark ? 'border-slate-700' : 'border-slate-200'}`}>
                    <div className="pt-4 space-y-3">
                      <h5 className={`text-sm font-bold flex items-center gap-2 ${dark ? 'text-red-400' : 'text-red-600'}`}>
                        <XCircle size={14} /> Reject Session Request
                      </h5>
                      <div>
                        <label className={`text-xs font-bold mb-1 block ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Reason (optional)</label>
                        <input type="text" value={responseText} onChange={e => setResponseText(e.target.value)} placeholder="e.g. Unavailable at this time"
                          className={`w-full px-4 py-2 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-red-500/40 ${dark ? 'bg-slate-700 border-slate-600 text-white placeholder:text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'}`}
                        />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={handleReject} disabled={submitting} className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 flex items-center justify-center gap-2">
                          {submitting ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                          {submitting ? 'Rejecting...' : 'Reject Request'}
                        </button>
                        <button onClick={() => { setActionId(null); setActionType(null); }} className={`px-5 py-2.5 rounded-xl text-sm font-bold ${dark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>Cancel</button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Expanded Details */}
                {isExpanded && (
                  <div className={`px-5 pb-5 border-t ${dark ? 'border-slate-700' : 'border-slate-200'}`}>
                    <div className="pt-4 space-y-3">
                      {session.studentMessage && (
                        <div className={`px-4 py-2.5 rounded-xl text-sm ${dark ? 'bg-slate-700/50 text-slate-300' : 'bg-slate-50 text-slate-600'}`}>
                          <span className={`text-xs font-bold block mb-1 ${dark ? 'text-slate-500' : 'text-slate-400'}`}>Student's Message:</span>
                          {session.studentMessage}
                        </div>
                      )}
                      {session.mentorResponse && (
                        <div className={`px-4 py-2.5 rounded-xl text-sm ${session.status === 'accepted'
                            ? dark ? 'bg-green-500/5 text-green-300 border border-green-500/10' : 'bg-green-50 text-green-700 border border-green-200'
                            : dark ? 'bg-red-500/5 text-red-300 border border-red-500/10' : 'bg-red-50 text-red-700 border border-red-200'
                          }`}>
                          <span className={`text-xs font-bold block mb-1 ${session.status === 'accepted' ? (dark ? 'text-green-500' : 'text-green-600') : (dark ? 'text-red-500' : 'text-red-600')}`}>Your Response:</span>
                          {session.mentorResponse}
                        </div>
                      )}
                      {review && (
                        <div className={`px-4 py-2.5 rounded-xl border ${dark ? 'bg-amber-500/5 border-amber-500/10' : 'bg-amber-50/50 border-amber-200/50'}`}>
                          <div className="flex items-center gap-2 mb-1">
                            <div className="flex">
                              {[1, 2, 3, 4, 5].map(i => (
                                <Star key={i} size={14} className={i <= review.rating ? 'text-amber-500' : dark ? 'text-slate-600' : 'text-slate-300'} fill={i <= review.rating ? 'currentColor' : 'none'} />
                              ))}
                            </div>
                            <span className={`text-xs font-bold ${dark ? 'text-amber-400' : 'text-amber-600'}`}>{review.rating}/5</span>
                            <span className={`text-[10px] ${dark ? 'text-slate-500' : 'text-slate-400'}`}>by {review.studentName || 'Student'}</span>
                          </div>
                          {review.review_text && <p className={`text-xs ${dark ? 'text-slate-400' : 'text-slate-600'}`}>{review.review_text}</p>}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* All Reviews Section */}
      {reviews.length > 0 && (
        <div className={`rounded-2xl border p-6 shadow-sm ${dark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
          <h3 className={`text-xl font-bold mb-4 flex items-center gap-2 ${dark ? 'text-white' : 'text-slate-900'}`}>
            <Star size={20} className="text-amber-500" fill="currentColor" />
            Student Reviews ({reviews.length})
          </h3>
          <div className="space-y-3">
            {reviews.map((review: any, idx: number) => (
              <div key={review.id || idx} className={`flex items-start gap-3 p-3 rounded-xl ${dark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                <img
                  src={review.studentAvatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(review.studentName || 'S')}&size=32`}
                  alt=""
                  className="w-9 h-9 rounded-full object-cover shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-sm font-bold ${dark ? 'text-white' : 'text-slate-800'}`}>{review.studentName || 'Student'}</span>
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map(i => (
                        <Star key={i} size={12} className={i <= review.rating ? 'text-amber-500' : dark ? 'text-slate-600' : 'text-slate-300'} fill={i <= review.rating ? 'currentColor' : 'none'} />
                      ))}
                    </div>
                  </div>
                  {review.review_text && <p className={`text-xs ${dark ? 'text-slate-400' : 'text-slate-600'}`}>{review.review_text}</p>}
                  <p className={`text-[10px] mt-1 ${dark ? 'text-slate-500' : 'text-slate-400'}`}>{new Date(review.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
