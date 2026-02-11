import React, { useState, useEffect } from 'react';
import {
  Plus, Trash2, Clock, Video, MessageCircle,
  CheckCircle, XCircle, Calendar, Award, Briefcase,
  Star, Mail, CheckCheck, Timer, Link, UserPlus, Check, X, Bell
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  fetchMentorProfile,
  fetchMentorOfferings,
  createMentorOffering,
  deleteMentorOffering,
  fetchSessionRequests,
  acceptSessionRequest,
  rejectSessionRequest,
  completeSessionRequest,
  cancelSessionRequest,
  subscribeToSessionRequests,
  subscribeToMentorReviews,
  getTimeUntilSession,
  isSessionIn30Minutes,
  hasSessionStarted,
  updateSessionMeetingLink,
  fetchPendingFriendRequests,
  updateFriendRequestStatus,
  isSessionStartingNow,
  fetchMentorReviews
} from '../utils/supabase-queries';
import { Mentor, MentorshipOffering, SessionRequest } from '../types';

interface MentorDashboardProps {
  isDarkMode: boolean;
  onStartVideoCall?: (participant: any) => void;
  onStartChat?: (participant: any) => void;
}

const MentorDashboard: React.FC<MentorDashboardProps> = ({
  isDarkMode,
  onStartVideoCall,
  onStartChat
}) => {
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'offerings' | 'requests' | 'reviews'>('requests');
  const [mentorProfile, setMentorProfile] = useState<Mentor | null>(null);
  const [offerings, setOfferings] = useState<MentorshipOffering[]>([]);
  const [sessionRequests, setSessionRequests] = useState<SessionRequest[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Offering form state
  const [showOfferingForm, setShowOfferingForm] = useState(false);
  const [offeringForm, setOfferingForm] = useState({
    title: '',
    description: '',
    durationMinutes: 60,
    mode: 'video' as 'chat' | 'call' | 'video',
    isFree: true,
    price: 0,
  });

  // Request response state
  const [responseText, setResponseText] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);

  // Confirmation popup states
  const [showConfirmPopup, setShowConfirmPopup] = useState<{ type: 'complete' | 'cancel', requestId: string, topic: string } | null>(null);
  const [showDeletePopup, setShowDeletePopup] = useState<{ offeringId: string, title: string } | null>(null);
  const [showActionSuccessPopup, setShowActionSuccessPopup] = useState<{ type: 'completed' | 'cancelled' | 'deleted' } | null>(null);

  // Meeting link editing state
  const [editingMeetingLinkId, setEditingMeetingLinkId] = useState<string | null>(null);
  const [editMeetingLinkValue, setEditMeetingLinkValue] = useState('');

  // Friend requests state
  const [friendRequests, setFriendRequests] = useState<any[]>([]);
  const [processingFriendRequest, setProcessingFriendRequest] = useState<string | null>(null);

  // Session start popup state
  const [showSessionStartPopup, setShowSessionStartPopup] = useState<{ studentName: string, topic: string, mode: string, meetingLink?: string } | null>(null);
  const [shownSessionStartIds, setShownSessionStartIds] = useState<Set<string>>(new Set());

  // Timer state to force re-render for countdown updates
  const [, setTimerTick] = useState(0);

  useEffect(() => {
    if (user) {
      console.log('MentorDashboard: User detected, loading data for:', user.id);
      loadData();

      // Subscribe to real-time session request updates
      const sessionSubscription = subscribeToSessionRequests(user.id, 'mentor', () => {
        console.log('MentorDashboard: Real-time session update detected, reloading data');
        loadData();
      });

      // Subscribe to real-time review updates
      const reviewSubscription = subscribeToMentorReviews(user.id, (review) => {
        console.log('MentorDashboard: New review received, reloading data', review);
        loadData(); // Reload to get updated rating and reviews
      });

      return () => {
        console.log('MentorDashboard: Unsubscribing from session requests and reviews');
        sessionSubscription.unsubscribe();
        reviewSubscription.unsubscribe();
      };
    }
  }, [user]);

  // Update timer every second to refresh countdown displays in real-time
  useEffect(() => {
    const interval = setInterval(() => {
      setTimerTick(tick => tick + 1);

      // Check for sessions starting now
      const acceptedRequests = sessionRequests.filter(r => r.status === 'accepted');
      for (const request of acceptedRequests) {
        if (request.preferredDate && request.preferredTime &&
          isSessionStartingNow(request.preferredDate, request.preferredTime) &&
          !shownSessionStartIds.has(request.id)) {
          // Show popup for this session
          setShowSessionStartPopup({
            studentName: request.studentProfile?.fullName || 'Student',
            topic: request.topic,
            mode: request.mode || 'chat',
            meetingLink: request.meetingLink
          });
          setShownSessionStartIds(prev => new Set([...prev, request.id]));
          // Play notification sound
          try {
            const audio = new Audio('/notification.mp3');
            audio.volume = 0.5;
            audio.play().catch(() => { });
          } catch (e) { }
          break; // Only show one popup at a time
        }
      }
    }, 1000); // Update every second
    return () => clearInterval(interval);
  }, [sessionRequests, shownSessionStartIds]);

  const loadData = async () => {
    if (!user) return;

    console.log('MentorDashboard: Loading data for user:', user.id);
    setLoading(true);
    try {
      const [profile, offeringsData, requestsData, friendRequestsData, reviewsData] = await Promise.all([
        fetchMentorProfile(user.id).catch(err => {
          console.error('Error fetching mentor profile:', err);
          return null;
        }),
        fetchMentorOfferings(user.id).catch(err => {
          console.error('Error fetching offerings:', err);
          return [];
        }),
        fetchSessionRequests(user.id, 'mentor').catch(err => {
          console.error('Error fetching requests:', err);
          return [];
        }),
        fetchPendingFriendRequests(user.id).catch(err => {
          console.error('Error fetching friend requests:', err);
          return [];
        }),
        fetchMentorReviews(user.id).catch(err => {
          console.error('Error fetching reviews:', err);
          return [];
        }),
      ]);

      if (profile) {
        setMentorProfile(profile);
      }

      console.log('Loaded offerings data:', offeringsData); // Debug log
      console.log('Loaded session requests:', requestsData); // Debug log
      console.log('Loaded friend requests:', friendRequestsData); // Debug log
      console.log('Loaded reviews:', reviewsData);
      setOfferings(Array.isArray(offeringsData) ? offeringsData : []);
      setSessionRequests(requestsData);
      setFriendRequests(friendRequestsData);
      setReviews(reviewsData);
    } catch (error) {
      console.error('Error loading mentor data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFriendRequestAction = async (requestId: string, status: 'accepted' | 'rejected') => {
    setProcessingFriendRequest(requestId);
    const { error } = await updateFriendRequestStatus(requestId, status);
    if (!error) {
      setFriendRequests(prev => prev.filter(req => req.id !== requestId));
    }
    setProcessingFriendRequest(null);
  };

  const handleCreateOffering = async () => {
    if (!user) return;

    // Validate required fields
    if (!offeringForm.title || !offeringForm.description) {
      alert('Please fill in title and description');
      return;
    }

    const offering = {
      mentor_id: user.id,
      title: offeringForm.title,
      description: offeringForm.description,
      duration_minutes: offeringForm.durationMinutes,
      mode: offeringForm.mode,
      is_free: offeringForm.isFree,
      price: offeringForm.isFree ? 0 : offeringForm.price,
      is_active: true,
    };

    console.log('Creating offering:', offering); // Debug log

    const result = await createMentorOffering(offering);

    if (result.error) {
      console.error('Error creating offering:', result.error);
      alert('Failed to create offering. Please try again.');
      return;
    }

    if (result.data) {
      console.log('Offering created successfully:', result.data);
      setShowOfferingForm(false);
      setOfferingForm({
        title: '',
        description: '',
        durationMinutes: 60,
        mode: 'video',
        isFree: true,
        price: 0,
      });
      loadData();
    }
  };

  const handleDeleteOffering = async (offeringId: string) => {
    await deleteMentorOffering(offeringId);
    setShowDeletePopup(null);
    setShowActionSuccessPopup({ type: 'deleted' });
    setTimeout(() => setShowActionSuccessPopup(null), 3000);
    loadData();
  };

  const handleAcceptRequest = async (requestId: string) => {
    await acceptSessionRequest(requestId, responseText, meetingLink);
    setActiveRequestId(null);
    setResponseText('');
    setMeetingLink('');
    loadData();
  };

  const handleRejectRequest = async (requestId: string) => {
    await rejectSessionRequest(requestId, responseText);
    setActiveRequestId(null);
    setResponseText('');
    loadData();
  };

  const handleCompleteSession = async (requestId: string) => {
    console.log('handleCompleteSession called with requestId:', requestId);
    const result = await completeSessionRequest(requestId, 'mentor');
    console.log('completeSessionRequest result:', result);
    setShowConfirmPopup(null);
    setShowActionSuccessPopup({ type: 'completed' });
    setTimeout(() => setShowActionSuccessPopup(null), 3000);
    loadData();
  };

  const handleCancelSession = async (requestId: string) => {
    await cancelSessionRequest(requestId, 'mentor');
    setShowConfirmPopup(null);
    setShowActionSuccessPopup({ type: 'cancelled' });
    setTimeout(() => setShowActionSuccessPopup(null), 3000);
    loadData();
  };

  const pendingRequests = sessionRequests.filter(r => r.status === 'pending');
  const acceptedRequests = sessionRequests.filter(r => r.status === 'accepted');
  const completedRequests = sessionRequests.filter(r => r.status === 'completed');

  console.log('MentorDashboard - Session Requests:', sessionRequests);
  console.log('MentorDashboard - Pending Requests:', pendingRequests);
  console.log('MentorDashboard - Accepted Requests:', acceptedRequests);
  console.log('MentorDashboard - Auth Loading:', authLoading);
  console.log('MentorDashboard - User:', user?.id);

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
          <p className={isDarkMode ? 'text-slate-300' : 'text-slate-600'}>
            {authLoading ? 'Authenticating...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
      {/* Confirmation Popup */}
      {showConfirmPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className={`relative p-8 rounded-2xl shadow-2xl transform max-w-md ${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
            }`} style={{ animation: 'popIn 0.3s ease-out' }}>
            <div className="flex flex-col items-center text-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${showConfirmPopup.type === 'complete' ? 'bg-green-500/20' : 'bg-red-500/20'
                }`}>
                {showConfirmPopup.type === 'complete' ? (
                  <CheckCheck className="w-10 h-10 text-green-500" />
                ) : (
                  <XCircle className="w-10 h-10 text-red-500" />
                )}
              </div>
              <h3 className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {showConfirmPopup.type === 'complete' ? 'Mark Session Complete?' : 'Cancel Session?'}
              </h3>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {showConfirmPopup.type === 'complete'
                  ? `Are you sure you want to mark "${showConfirmPopup.topic}" as completed?`
                  : `Are you sure you want to cancel "${showConfirmPopup.topic}"?`
                }
              </p>
              <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                The student will be notified of this action.
              </p>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowConfirmPopup(null)}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors ${isDarkMode ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                    }`}
                >
                  Cancel
                </button>
                <button
                  onClick={() => showConfirmPopup.type === 'complete'
                    ? handleCompleteSession(showConfirmPopup.requestId)
                    : handleCancelSession(showConfirmPopup.requestId)
                  }
                  className={`px-6 py-2 rounded-lg font-medium transition-colors ${showConfirmPopup.type === 'complete'
                    ? 'bg-green-500 hover:bg-green-600 text-white'
                    : 'bg-red-500 hover:bg-red-600 text-white'
                    }`}
                >
                  {showConfirmPopup.type === 'complete' ? 'Yes, Complete' : 'Yes, Cancel'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Success Popup */}
      {showActionSuccessPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className={`relative p-8 rounded-2xl shadow-2xl transform ${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
            }`} style={{ animation: 'popIn 0.3s ease-out' }}>
            <div className="flex flex-col items-center text-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${showActionSuccessPopup.type === 'completed' ? 'bg-green-500/20' :
                showActionSuccessPopup.type === 'deleted' ? 'bg-red-500/20' : 'bg-amber-500/20'
                }`}>
                {showActionSuccessPopup.type === 'completed' ? (
                  <CheckCheck className="w-10 h-10 text-green-500" />
                ) : showActionSuccessPopup.type === 'deleted' ? (
                  <Trash2 className="w-10 h-10 text-red-500" />
                ) : (
                  <XCircle className="w-10 h-10 text-amber-500" />
                )}
              </div>
              <h3 className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {showActionSuccessPopup.type === 'completed' ? 'Session Completed!' :
                  showActionSuccessPopup.type === 'deleted' ? 'Offering Deleted!' : 'Session Cancelled'}
              </h3>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {showActionSuccessPopup.type === 'completed'
                  ? 'The session has been marked as complete. The student has been notified.'
                  : showActionSuccessPopup.type === 'deleted'
                    ? 'The offering has been removed from your profile.'
                    : 'The session has been cancelled. The student has been notified.'
                }
              </p>
              <button
                onClick={() => setShowActionSuccessPopup(null)}
                className={`mt-6 px-6 py-2 rounded-lg font-medium transition-colors ${showActionSuccessPopup.type === 'completed'
                  ? 'bg-green-500 hover:bg-green-600 text-white'
                  : showActionSuccessPopup.type === 'deleted'
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-amber-500 hover:bg-amber-600 text-white'
                  }`}
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Session Start Popup */}
      {showSessionStartPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className={`relative p-8 rounded-2xl shadow-2xl transform max-w-lg w-full mx-4 ${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
            }`} style={{ animation: 'popIn 0.3s ease-out' }}>
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mb-4 animate-pulse">
                <Bell className="w-12 h-12 text-green-500" />
              </div>
              <h3 className={`text-2xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                🎉 Session Starting Now!
              </h3>
              <p className={`text-lg mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Your session with <span className="font-bold text-amber-500">{showSessionStartPopup.studentName}</span> is starting!
              </p>
              <p className={`text-sm mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Topic: {showSessionStartPopup.topic}
              </p>
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full mb-4 ${showSessionStartPopup.mode === 'video' ? 'bg-blue-500/20 text-blue-500' :
                showSessionStartPopup.mode === 'call' ? 'bg-green-500/20 text-green-500' :
                  'bg-amber-500/20 text-amber-500'
                }`}>
                {showSessionStartPopup.mode === 'video' && <><Video size={18} /> Video Call</>}
                {showSessionStartPopup.mode === 'call' && <><MessageCircle size={18} /> Voice Call</>}
                {showSessionStartPopup.mode === 'chat' && <><MessageCircle size={18} /> Chat</>}
              </div>
              {showSessionStartPopup.meetingLink && (
                <a
                  href={showSessionStartPopup.meetingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mb-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
                >
                  Join Meeting Link
                </a>
              )}
              <button
                onClick={() => setShowSessionStartPopup(null)}
                className="px-8 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold transition-colors"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Popup */}
      {showDeletePopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className={`relative p-8 rounded-2xl shadow-2xl transform max-w-md ${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
            }`} style={{ animation: 'popIn 0.3s ease-out' }}>
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
                <Trash2 className="w-10 h-10 text-red-500" />
              </div>
              <h3 className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Delete Offering?
              </h3>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Are you sure you want to delete "{showDeletePopup.title}"?
              </p>
              <p className={`text-sm mt-1 text-red-500 font-medium`}>
                This action cannot be undone.
              </p>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowDeletePopup(null)}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors ${isDarkMode ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                    }`}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteOffering(showDeletePopup.offeringId)}
                  className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
                >
                  Yes, Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className={`text-3xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            Mentor Dashboard
          </h1>
          <p className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>
            Manage your profile, offerings, and student requests
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className={`p-6 rounded-xl ${isDarkMode ? 'bg-slate-800' : 'bg-white'} shadow-lg`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Pending Requests</p>
                <p className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {pendingRequests.length}
                </p>
              </div>
              <div className="p-3 bg-amber-500/10 rounded-lg">
                <Mail className="text-amber-500" size={24} />
              </div>
            </div>
          </div>

          <div className={`p-6 rounded-xl ${isDarkMode ? 'bg-slate-800' : 'bg-white'} shadow-lg`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Rating</p>
                <p className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {mentorProfile?.rating.toFixed(1) || '0.0'}
                </p>
              </div>
              <div className="p-3 bg-yellow-500/10 rounded-lg">
                <Star className="text-yellow-500" size={24} />
              </div>
            </div>
          </div>

          <div className={`p-6 rounded-xl ${isDarkMode ? 'bg-slate-800' : 'bg-white'} shadow-lg`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Total Reviews</p>
                <p className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {mentorProfile?.totalReviews || 0}
                </p>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <Award className="text-blue-500" size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-slate-300 dark:border-slate-700">
          {[
            { id: 'requests' as const, label: 'Student Requests', icon: Mail },
            { id: 'offerings' as const, label: 'Mentorship Offerings', icon: Briefcase },
            { id: 'reviews' as const, label: 'Reviews', icon: Star },
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 ${activeTab === tab.id
                  ? 'border-amber-500 text-amber-500'
                  : isDarkMode
                    ? 'border-transparent text-slate-400 hover:text-slate-300'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {/* Student Requests Tab */}
          {activeTab === 'requests' && (
            <div className="space-y-6">
              {/* Friend Requests Section */}
              {friendRequests.length > 0 && (
                <div>
                  <h2 className={`text-xl font-semibold mb-4 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    <UserPlus size={24} className="text-amber-500" />
                    Friend Requests ({friendRequests.length})
                  </h2>
                  <div className="space-y-3">
                    {friendRequests.map(request => (
                      <div
                        key={request.id}
                        className={`p-4 rounded-xl flex items-center justify-between ${isDarkMode ? 'bg-slate-800' : 'bg-white'
                          } shadow-sm border ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={request.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(request.name || 'U')}&background=random`}
                            alt={request.name}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                          <div>
                            <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                              {request.name}
                            </h3>
                            <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                              @{request.username}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {processingFriendRequest === request.id ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-amber-500"></div>
                          ) : (
                            <>
                              <button
                                onClick={() => handleFriendRequestAction(request.id, 'accepted')}
                                className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                                title="Accept"
                              >
                                <Check size={18} />
                              </button>
                              <button
                                onClick={() => handleFriendRequestAction(request.id, 'rejected')}
                                className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                                title="Reject"
                              >
                                <X size={18} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pending Requests */}
              <div>
                <h2 className={`text-xl font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  Pending Requests ({pendingRequests.length})
                </h2>
                {pendingRequests.length === 0 ? (
                  <div className={`text-center py-12 rounded-xl ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>
                    <Mail className={`mx-auto mb-3 ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`} size={48} />
                    <p className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>No pending requests</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingRequests.map(request => (
                      <div
                        key={request.id}
                        className={`p-6 rounded-xl ${isDarkMode ? 'bg-slate-800' : 'bg-white'} shadow-lg`}
                      >
                        <div className="flex items-start gap-4">
                          <img
                            src={request.studentProfile?.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=student'}
                            alt="Student"
                            className="w-16 h-16 rounded-full"
                          />
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                  {request.studentProfile?.fullName || 'Student'}
                                </h3>
                                <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                  {request.studentProfile?.class && `${request.studentProfile.class} • `}
                                  {request.studentProfile?.course || 'Student'}
                                </p>
                              </div>
                              <span className="px-3 py-1 bg-amber-500/10 text-amber-500 text-xs font-medium rounded-full">
                                Pending
                              </span>
                            </div>

                            <div className="space-y-2 mb-4">
                              <p className={`font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                Topic: {request.topic}
                              </p>
                              {request.mode && (
                                <p className={`text-sm flex items-center gap-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                  <span className="font-medium">Session Mode:</span>
                                  {request.mode === 'video' && '🎥 Video Call'}
                                  {request.mode === 'call' && '📞 Voice Call'}
                                  {request.mode === 'chat' && '💬 Chat Only'}
                                </p>
                              )}
                              {request.studentMessage && (
                                <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                  "{request.studentMessage}"
                                </p>
                              )}
                              {request.preferredDate && (
                                <p className={`text-sm flex items-center gap-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                  <Calendar size={16} />
                                  {request.preferredDate} {request.preferredTime && `at ${request.preferredTime}`}
                                </p>
                              )}
                            </div>

                            {activeRequestId === request.id ? (
                              <div className="space-y-3">
                                <input
                                  type="text"
                                  placeholder="Response message (optional)"
                                  value={responseText}
                                  onChange={(e) => setResponseText(e.target.value)}
                                  className={`w-full px-4 py-2 rounded-lg ${isDarkMode
                                    ? 'bg-slate-700 text-white border-slate-600'
                                    : 'bg-slate-50 text-slate-900 border-slate-300'
                                    } border`}
                                />
                                <input
                                  type="text"
                                  placeholder="Meeting link (for accepted requests)"
                                  value={meetingLink}
                                  onChange={(e) => setMeetingLink(e.target.value)}
                                  className={`w-full px-4 py-2 rounded-lg ${isDarkMode
                                    ? 'bg-slate-700 text-white border-slate-600'
                                    : 'bg-slate-50 text-slate-900 border-slate-300'
                                    } border`}
                                />
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleAcceptRequest(request.id)}
                                    className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                                  >
                                    <CheckCircle size={18} />
                                    Accept
                                  </button>
                                  <button
                                    onClick={() => handleRejectRequest(request.id)}
                                    className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                                  >
                                    <XCircle size={18} />
                                    Reject
                                  </button>
                                  <button
                                    onClick={() => {
                                      setActiveRequestId(null);
                                      setResponseText('');
                                      setMeetingLink('');
                                    }}
                                    className={`px-4 py-2 rounded-lg ${isDarkMode
                                      ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                                      : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                                      } transition-colors`}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => setActiveRequestId(request.id)}
                                  className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors"
                                >
                                  Respond
                                </button>
                                {onStartChat && (
                                  <button
                                    onClick={() => onStartChat({
                                      id: request.studentId,
                                      name: request.studentProfile?.fullName || 'Student',
                                      avatar: request.studentProfile?.avatarUrl,
                                    })}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg ${isDarkMode
                                      ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                                      : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                                      } transition-colors`}
                                  >
                                    <MessageCircle size={18} />
                                    Chat
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Accepted Requests / Upcoming Sessions */}
              {acceptedRequests.length > 0 && (
                <div>
                  <h2 className={`text-2xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    Upcoming Sessions ({acceptedRequests.length})
                  </h2>
                  <div className="space-y-4">
                    {acceptedRequests.map(request => (
                      <div
                        key={request.id}
                        className={`p-6 rounded-xl ${isDarkMode ? 'bg-slate-800 border-2 border-green-500/30' : 'bg-white border-2 border-green-200'} shadow-lg`}
                      >
                        <div className="flex items-start gap-4">
                          <img
                            src={request.studentProfile?.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=student'}
                            alt="Student"
                            className="w-16 h-16 rounded-full"
                          />
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                  {request.studentProfile?.fullName || 'Student'}
                                </h3>
                                <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                  {request.studentProfile?.class && `${request.studentProfile.class} • `}
                                  {request.studentProfile?.course || 'Student'}
                                </p>
                              </div>
                              <span className="px-3 py-1 bg-green-500 text-white text-xs font-medium rounded-full flex items-center gap-1">
                                <CheckCircle size={14} />
                                Confirmed
                              </span>
                            </div>

                            <div className="space-y-2 mb-4">
                              <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-green-500/10 border border-green-500/20' : 'bg-green-50 border border-green-200'}`}>
                                <p className={`font-medium ${isDarkMode ? 'text-green-400' : 'text-green-700'}`}>
                                  📚 Topic: {request.topic}
                                </p>
                                {request.mode && (
                                  <p className={`text-xs flex items-center gap-2 mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                    <span className="font-medium">Mode:</span>
                                    {request.mode === 'video' && '🎥 Video Call'}
                                    {request.mode === 'call' && '📞 Voice Call'}
                                    {request.mode === 'chat' && '💬 Chat Only'}
                                  </p>
                                )}
                                {request.preferredDate && (
                                  <p className={`text-sm flex items-center gap-2 mt-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                    <Calendar size={16} />
                                    {request.preferredDate} {request.preferredTime && `at ${request.preferredTime}`}
                                  </p>
                                )}
                                {/* Countdown Timer */}
                                {request.preferredDate && request.preferredTime && (
                                  <div className={`mt-2 p-2 rounded-lg flex items-center gap-2 ${isSessionIn30Minutes(request.preferredDate, request.preferredTime)
                                    ? 'bg-amber-500/20 border border-amber-500/40'
                                    : isDarkMode ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-200'
                                    }`}>
                                    <Timer size={16} className={isSessionIn30Minutes(request.preferredDate, request.preferredTime) ? 'text-amber-500 animate-pulse' : 'text-blue-500'} />
                                    <span className={`text-sm font-medium ${isSessionIn30Minutes(request.preferredDate, request.preferredTime)
                                      ? 'text-amber-500'
                                      : isDarkMode ? 'text-blue-400' : 'text-blue-600'
                                      }`}>
                                      {getTimeUntilSession(request.preferredDate, request.preferredTime)}
                                    </span>
                                  </div>
                                )}
                              </div>

                              {request.mentorResponse && (
                                <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
                                  <p className={`text-xs font-medium mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                    Your Response:
                                  </p>
                                  <p className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                    {request.mentorResponse}
                                  </p>
                                </div>
                              )}

                              {request.meetingLink && (
                                <a
                                  href={request.meetingLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 text-sm text-amber-500 hover:text-amber-600 underline font-medium"
                                >
                                  <Video size={16} />
                                  Meeting Link
                                </a>
                              )}

                              {/* Meeting Link Input for Video/Call Sessions */}
                              {(request.mode === 'video' || request.mode === 'call') && (
                                <div className={`mt-2 p-3 rounded-lg ${isDarkMode ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
                                  {editingMeetingLinkId === request.id ? (
                                    <div className="flex items-center gap-2">
                                      <Link size={16} className={isDarkMode ? 'text-slate-400' : 'text-slate-500'} />
                                      <input
                                        type="url"
                                        value={editMeetingLinkValue}
                                        onChange={(e) => setEditMeetingLinkValue(e.target.value)}
                                        placeholder="Enter meeting link (e.g., Zoom, Google Meet)"
                                        className={`flex-1 px-3 py-1 text-sm rounded-lg border ${isDarkMode
                                          ? 'bg-slate-800 border-slate-600 text-white placeholder-slate-500'
                                          : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                                          }`}
                                      />
                                      <button
                                        onClick={async () => {
                                          await updateSessionMeetingLink(request.id, editMeetingLinkValue);
                                          setEditingMeetingLinkId(null);
                                          loadData();
                                        }}
                                        className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-sm rounded-lg"
                                      >
                                        Save
                                      </button>
                                      <button
                                        onClick={() => {
                                          setEditingMeetingLinkId(null);
                                          setEditMeetingLinkValue('');
                                        }}
                                        className={`px-3 py-1 text-sm rounded-lg ${isDarkMode
                                          ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                                          : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                                          }`}
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        setEditingMeetingLinkId(request.id);
                                        setEditMeetingLinkValue(request.meetingLink || '');
                                      }}
                                      className={`flex items-center gap-2 text-sm ${isDarkMode ? 'text-amber-400 hover:text-amber-300' : 'text-amber-600 hover:text-amber-700'
                                        }`}
                                    >
                                      <Link size={16} />
                                      {request.meetingLink ? 'Edit Meeting Link' : 'Add Meeting Link'}
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>

                            <div className="flex gap-2 flex-wrap">
                              {/* Mentor can initiate calls based on session mode */}
                              {onStartVideoCall && request.mode !== 'chat' && (
                                <button
                                  onClick={() => onStartVideoCall({
                                    id: request.studentId,
                                    name: request.studentProfile?.fullName || 'Student',
                                    avatar: request.studentProfile?.avatarUrl,
                                  })}
                                  className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
                                >
                                  <Video size={18} />
                                  {request.mode === 'call' ? 'Start Voice Call' : 'Start Video Call'}
                                </button>
                              )}
                              {onStartChat && (
                                <button
                                  onClick={() => onStartChat({
                                    id: request.studentId,
                                    name: request.studentProfile?.fullName || 'Student',
                                    avatar: request.studentProfile?.avatarUrl,
                                  })}
                                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${isDarkMode
                                    ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                                    : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                                    } transition-colors`}
                                >
                                  <MessageCircle size={18} />
                                  Chat with Student
                                </button>
                              )}
                              <button
                                onClick={() => setShowConfirmPopup({ type: 'complete', requestId: request.id, topic: request.topic })}
                                disabled={!hasSessionStarted(request.preferredDate || '', request.preferredTime || '')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${hasSessionStarted(request.preferredDate || '', request.preferredTime || '')
                                  ? 'bg-amber-500 hover:bg-amber-600 text-white cursor-pointer'
                                  : 'bg-slate-400 text-slate-200 cursor-not-allowed opacity-60'
                                  }`}
                                title={!hasSessionStarted(request.preferredDate || '', request.preferredTime || '') ? 'Session has not started yet' : ''}
                              >
                                <CheckCheck size={18} />
                                Mark Complete
                              </button>
                              <button
                                onClick={() => setShowConfirmPopup({ type: 'cancel', requestId: request.id, topic: request.topic })}
                                className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
                              >
                                <XCircle size={18} />
                                Cancel Session
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Completed Sessions */}
              {completedRequests.length > 0 && (
                <div>
                  <h2 className={`text-xl font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    Past Sessions ({completedRequests.length})
                  </h2>
                  <div className="space-y-4">
                    {completedRequests.map(request => (
                      <div
                        key={request.id}
                        className={`p-6 rounded-xl ${isDarkMode ? 'bg-slate-800/50' : 'bg-slate-100'}`}
                      >
                        <div className="flex items-start gap-4">
                          <img
                            src={request.studentProfile?.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=student'}
                            alt="Student"
                            className="w-12 h-12 rounded-full"
                          />
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                  {request.studentProfile?.fullName || 'Student'}
                                </h3>
                                <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                  {request.topic}
                                </p>
                                {request.preferredDate && (
                                  <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                                    📅 {request.preferredDate} {request.preferredTime && `at ${request.preferredTime}`}
                                  </p>
                                )}
                              </div>
                              <span className="px-3 py-1 bg-slate-500/10 text-slate-500 text-xs font-medium rounded-full flex items-center gap-1">
                                <CheckCheck size={12} />
                                Completed
                              </span>
                            </div>

                            {/* Display Review if exists */}
                            {request.review ? (
                              <div className={`mt-3 p-3 rounded-lg ${isDarkMode ? 'bg-slate-900/50' : 'bg-white'} border ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="flex items-center gap-0.5">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <Star
                                        key={star}
                                        size={16}
                                        className={star <= request.review!.rating
                                          ? 'text-amber-500 fill-amber-500'
                                          : isDarkMode ? 'text-slate-600' : 'text-slate-300'
                                        }
                                      />
                                    ))}
                                  </div>
                                  <span className={`text-sm font-medium ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>
                                    {request.review.rating}/5
                                  </span>
                                </div>
                                {request.review.reviewText && (
                                  <p className={`text-sm italic ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                    "{request.review.reviewText}"
                                  </p>
                                )}
                                <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                                  Review from {request.review.studentName || request.studentProfile?.fullName || 'Student'}
                                </p>
                              </div>
                            ) : (
                              <p className={`mt-2 text-xs italic ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                No review yet
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Offerings Tab */}
          {activeTab === 'offerings' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  Mentorship Offerings
                </h2>
                <button
                  onClick={() => setShowOfferingForm(!showOfferingForm)}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors"
                >
                  <Plus size={18} />
                  Add Offering
                </button>
              </div>

              {showOfferingForm && (
                <div className={`p-6 rounded-xl mb-6 ${isDarkMode ? 'bg-slate-800' : 'bg-white'} shadow-lg`}>
                  <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    New Offering
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                        Title
                      </label>
                      <select
                        value={offeringForm.title}
                        onChange={(e) => setOfferingForm({ ...offeringForm, title: e.target.value })}
                        className={`w-full px-4 py-2 rounded-lg ${isDarkMode
                          ? 'bg-slate-700 text-white border-slate-600'
                          : 'bg-slate-50 text-slate-900 border-slate-300'
                          } border`}
                      >
                        <option value="">Select offering type</option>
                        <option value="1:1 Mentorship">1:1 Mentorship</option>
                        <option value="Doubt Solving">Doubt Solving</option>
                        <option value="Resume Review">Resume Review</option>
                        <option value="Mock Interview">Mock Interview</option>
                        <option value="Project Guidance">Project Guidance</option>
                        <option value="Career Guidance">Career Guidance</option>
                      </select>
                    </div>

                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                        Description
                      </label>
                      <textarea
                        value={offeringForm.description}
                        onChange={(e) => setOfferingForm({ ...offeringForm, description: e.target.value })}
                        rows={3}
                        placeholder="Describe what you'll provide..."
                        className={`w-full px-4 py-2 rounded-lg ${isDarkMode
                          ? 'bg-slate-700 text-white border-slate-600'
                          : 'bg-slate-50 text-slate-900 border-slate-300'
                          } border`}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                          Duration (minutes)
                        </label>
                        <select
                          value={offeringForm.durationMinutes}
                          onChange={(e) => setOfferingForm({ ...offeringForm, durationMinutes: parseInt(e.target.value) })}
                          className={`w-full px-4 py-2 rounded-lg ${isDarkMode
                            ? 'bg-slate-700 text-white border-slate-600'
                            : 'bg-slate-50 text-slate-900 border-slate-300'
                            } border`}
                        >
                          <option value={30}>30 minutes</option>
                          <option value={60}>1 hour</option>
                          <option value={90}>1.5 hours</option>
                          <option value={120}>2 hours</option>
                        </select>
                      </div>

                      <div>
                        <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                          Mode
                        </label>
                        <select
                          value={offeringForm.mode}
                          onChange={(e) => setOfferingForm({ ...offeringForm, mode: e.target.value as any })}
                          className={`w-full px-4 py-2 rounded-lg ${isDarkMode
                            ? 'bg-slate-700 text-white border-slate-600'
                            : 'bg-slate-50 text-slate-900 border-slate-300'
                            } border`}
                        >
                          <option value="chat">Chat</option>
                          <option value="call">Audio Call</option>
                          <option value="video">Video Call</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={offeringForm.isFree}
                          onChange={(e) => setOfferingForm({ ...offeringForm, isFree: e.target.checked })}
                          className="w-4 h-4 text-amber-500 rounded"
                        />
                        <span className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>Free</span>
                      </label>
                      {!offeringForm.isFree && (
                        <div className="flex-1">
                          <input
                            type="number"
                            value={offeringForm.price}
                            onChange={(e) => setOfferingForm({ ...offeringForm, price: parseFloat(e.target.value) || 0 })}
                            placeholder="Price"
                            className={`w-full px-4 py-2 rounded-lg ${isDarkMode
                              ? 'bg-slate-700 text-white border-slate-600'
                              : 'bg-slate-50 text-slate-900 border-slate-300'
                              } border`}
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={handleCreateOffering}
                        disabled={!offeringForm.title || !offeringForm.description}
                        className="px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-slate-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                      >
                        Create Offering
                      </button>
                      <button
                        onClick={() => setShowOfferingForm(false)}
                        className={`px-4 py-2 rounded-lg ${isDarkMode
                          ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                          : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                          } transition-colors`}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Offerings List */}
              {offerings.length === 0 && !showOfferingForm ? (
                <div className={`text-center py-12 rounded-xl ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>
                  <Briefcase className={`mx-auto mb-3 ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`} size={48} />
                  <p className={`mb-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>No offerings created yet</p>
                  <button
                    onClick={() => setShowOfferingForm(true)}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors"
                  >
                    Create Your First Offering
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {offerings.map(offering => (
                    <div
                      key={offering.id}
                      className={`p-6 rounded-xl ${isDarkMode ? 'bg-slate-800' : 'bg-white'} shadow-lg`}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            {offering.title}
                          </h3>
                          <div className="flex items-center gap-3 mt-2">
                            <span className={`flex items-center gap-1 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                              <Clock size={14} />
                              {offering.durationMinutes} min
                            </span>
                            <span className="px-2 py-1 bg-blue-500/10 text-blue-500 text-xs rounded-full">
                              {offering.mode}
                            </span>
                            {offering.isFree ? (
                              <span className="px-2 py-1 bg-green-500/10 text-green-500 text-xs font-medium rounded-full">
                                Free
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-amber-500/10 text-amber-500 text-xs font-medium rounded-full">
                                ₹{offering.price}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => setShowDeletePopup({ offeringId: offering.id, title: offering.title })}
                          className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                      <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        {offering.description}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Reviews Tab */}
          {activeTab === 'reviews' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  Student Reviews
                </h2>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 bg-amber-500/10 px-3 py-1 rounded-full">
                    <Star className="text-amber-500 fill-amber-500" size={16} />
                    <span className="font-bold text-amber-500">{mentorProfile?.rating.toFixed(1) || '0.0'}</span>
                  </div>
                  <span className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    ({mentorProfile?.totalReviews || 0} reviews)
                  </span>
                </div>
              </div>

              {reviews.length === 0 ? (
                <div className={`text-center py-12 rounded-xl ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>
                  <Star className={`mx-auto mb-3 ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`} size={48} />
                  <p className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>No reviews yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {reviews.map(review => (
                    <div
                      key={review.id}
                      className={`p-6 rounded-xl ${isDarkMode ? 'bg-slate-800' : 'bg-white'} shadow-lg border ${isDarkMode ? 'border-slate-700' : 'border-slate-100'}`}
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <img
                          src={review.student?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(review.student?.fullName || 'U')}&background=random`}
                          alt={review.student?.fullName}
                          className="w-10 h-10 rounded-full"
                        />
                        <div className="flex-1">
                          <h4 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            {review.student?.fullName || 'Anonymous student'}
                          </h4>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-0.5">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  size={14}
                                  className={star <= review.rating
                                    ? 'text-amber-500 fill-amber-500'
                                    : isDarkMode ? 'text-slate-700' : 'text-slate-200'
                                  }
                                />
                              ))}
                            </div>
                            <span className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                              {new Date(review.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      {review.topic && (
                        <div className="mb-3">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold ${isDarkMode ? 'bg-amber-500/10 text-amber-500' : 'bg-amber-100 text-amber-600'} border ${isDarkMode ? 'border-amber-500/20' : 'border-amber-200'}`}>
                            {review.topic}
                          </span>
                        </div>
                      )}
                      {review.reviewText && (
                        <p className={`text-sm italic ${isDarkMode ? 'text-slate-300' : 'text-slate-600'} bg-${isDarkMode ? 'slate-900/50' : 'slate-50'} p-3 rounded-lg`}>
                          "{review.reviewText}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MentorDashboard;
