import React, { useState, useEffect } from 'react';
import {
  Search, Star, Shield, GraduationCap, Briefcase, Globe, Clock,
  MessageCircle, Video, X, Send, Filter, CheckCircle, XCircle, Calendar,
  BookOpen, CheckCheck, Trash2, Timer, Bell, User
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  fetchMentorsFromProfiles,
  fetchMentorOfferings,
  fetchMentorReviews,
  fetchAllMentorReviews,
  fetchAllMentorOfferings,
  createSessionRequest,
  fetchSessionRequests,
  subscribeToSessionRequests,
  completeSessionRequest,
  cancelSessionRequest,
  deleteSessionRequest,
  getTimeUntilSession,
  isSessionIn30Minutes,
  submitMentorReview,
  hasSessionStarted,
  isSessionStartingNow,
  getUserProfile
} from '../utils/supabase-queries';
import { getRecommendedMentors, MatchScore } from '../utils/matching-algorithm';
import { Mentor, MentorshipOffering, SessionRequest } from '../types';

interface MentorConnectProps {
  isDarkMode: boolean;
  onStartVideoCall?: (participant: any) => void;
  onStartChat?: (participant: any) => void;
}

export const MentorConnect: React.FC<MentorConnectProps> = ({
  isDarkMode,
  onStartVideoCall,
  onStartChat
}) => {
  const { user, loading: authLoading } = useAuth();
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [userRole, setUserRole] = useState<'student' | 'mentor'>('student');
  // Use useMemo for filteredMentors instead of useEffect to avoid double renders
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDomain, setSelectedDomain] = useState<string>('');
  const [selectedOfferingType, setSelectedOfferingType] = useState<string>('');

  // Use useMemo for filteredMentors instead of useEffect to avoid double renders
  const filteredMentors = React.useMemo(() => {
    let filtered = mentors;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(m =>
        m.name.toLowerCase().includes(query) ||
        (m.username && m.username.toLowerCase().includes(query)) ||
        m.bio.toLowerCase().includes(query) ||
        m.domain.some(d => d.toLowerCase().includes(query)) ||
        m.skills.some(s => s.toLowerCase().includes(query))
      );
    }

    if (selectedDomain) {
      filtered = filtered.filter(m =>
        m.domain.some(d => d.toLowerCase().includes(selectedDomain.toLowerCase()))
      );
    }

    if (selectedOfferingType) {
      filtered = filtered.filter(m =>
        m.offerings && m.offerings.some(o => o.title.toLowerCase().includes(selectedOfferingType.toLowerCase()))
      );
    }

    return filtered;
  }, [mentors, searchQuery, selectedDomain, selectedOfferingType]);
  const [loading, setLoading] = useState(true);
  const [selectedMentor, setSelectedMentor] = useState<Mentor | null>(null);
  const [mentorOfferings, setMentorOfferings] = useState<MentorshipOffering[]>([]);
  const [mentorReviews, setMentorReviews] = useState<any[]>([]);
  const [myRequests, setMyRequests] = useState<SessionRequest[]>([]);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [activeView, setActiveView] = useState<'browse' | 'sessions'>('browse');
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [showConfirmPopup, setShowConfirmPopup] = useState<{ type: 'complete' | 'cancel', requestId: string, topic: string, mentorId?: string, mentorName?: string } | null>(null);
  const [showDeletePopup, setShowDeletePopup] = useState<{ requestId: string, topic: string } | null>(null);
  const [showActionSuccessPopup, setShowActionSuccessPopup] = useState<{ type: 'completed' | 'cancelled' | 'deleted' } | null>(null);
  const [showReviewPopup, setShowReviewPopup] = useState<{ requestId: string, mentorId: string, mentorName: string, topic: string } | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [sessionFilter, setSessionFilter] = useState<'upcoming' | 'pending' | 'past'>('upcoming');

  // Timer state to force re-render for countdown updates
  const [, setTimerTick] = useState(0);
  const [pastSessionFilter, setPastSessionFilter] = useState<'completed' | 'rejected'>('completed');

  // Session start popup state
  const [showSessionStartPopup, setShowSessionStartPopup] = useState<{ mentorName: string, topic: string, mode: string, meetingLink?: string } | null>(null);
  const [shownSessionStartIds, setShownSessionStartIds] = useState<Set<string>>(new Set());
  const [requestForm, setRequestForm] = useState({
    offeringId: '',
    topic: '',
    message: '',
    preferredDate: '',
    preferredTime: '',
  });

  const [recommendations, setRecommendations] = useState<MatchScore[]>([]);

  useEffect(() => {
    loadMentors();
    // Check if we should open sessions view (from notification click)
    const openSessions = localStorage.getItem('openSessionsView');
    if (openSessions === 'true') {
      setActiveView('sessions');
      localStorage.removeItem('openSessionsView');
    }

    // Check for pending review (from session_completed notification)
    const pendingReviewData = localStorage.getItem('pendingReview');
    if (pendingReviewData) {
      try {
        const reviewData = JSON.parse(pendingReviewData);
        // We'll load mentor name after we have requests loaded
        setShowReviewPopup({
          requestId: reviewData.sessionId,
          mentorId: reviewData.mentorId,
          mentorName: 'Mentor', // Will be updated when requests load
          topic: reviewData.topic
        });
        localStorage.removeItem('pendingReview');
      } catch (e) {
        console.error('Error parsing pending review data:', e);
        localStorage.removeItem('pendingReview');
      }
    }
  }, []);

  useEffect(() => {
    const fetchRecommendations = async () => {
      if (user && userRole === 'student') {
        const recs = await getRecommendedMentors(user.id);
        setRecommendations(recs);
      }
    };
    fetchRecommendations();
  }, [user, userRole]);

  useEffect(() => {
    if (user) {
      console.log('User detected, loading requests for:', user.id);

      // Load user role
      getUserProfile(user.id).then(profile => {
        if (profile) setUserRole(profile.role);
      });

      loadMyRequests();

      // Subscribe to real-time session request updates
      const subscription = subscribeToSessionRequests(user.id, 'student', () => {
        console.log('Real-time update detected, reloading requests');
        loadMyRequests();
      });

      return () => {
        console.log('Unsubscribing from session requests');
        subscription.unsubscribe();
      };
    } else {
      console.log('No user available yet');
    }
  }, [user]);

  // Removed useEffect for filtering as we now use useMemo

  // Update timer every second to refresh countdown displays in real-time
  useEffect(() => {
    const interval = setInterval(() => {
      setTimerTick(tick => tick + 1);

      // Check for sessions starting now
      const acceptedRequests = myRequests.filter(r => r.status === 'accepted');
      for (const request of acceptedRequests) {
        if (request.preferredDate && request.preferredTime &&
          isSessionStartingNow(request.preferredDate, request.preferredTime) &&
          !shownSessionStartIds.has(request.id)) {
          // Show popup for this session
          setShowSessionStartPopup({
            mentorName: request.mentorProfile?.fullName || 'Your Mentor',
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

      // Check for pending review from session_completed notification (in case we're already on this page)
      const pendingReviewData = localStorage.getItem('pendingReview');
      if (pendingReviewData && !showReviewPopup) {
        try {
          const reviewData = JSON.parse(pendingReviewData);
          setShowReviewPopup({
            requestId: reviewData.sessionId,
            mentorId: reviewData.mentorId,
            mentorName: 'Mentor',
            topic: reviewData.topic
          });
          localStorage.removeItem('pendingReview');
          // Play notification sound
          try {
            const audio = new Audio('/notification.mp3');
            audio.volume = 0.5;
            audio.play().catch(() => { });
          } catch (e) { }
        } catch (e) {
          console.error('Error parsing pending review data:', e);
          localStorage.removeItem('pendingReview');
        }
      }
    }, 1000); // Update every second
    return () => clearInterval(interval);
  }, [myRequests, shownSessionStartIds, showReviewPopup]);

  const loadMentors = async () => {
    setLoading(true);
    try {
      const data = await fetchMentorsFromProfiles().catch(err => {
        console.error('Error loading mentors:', err);
        return [];
      });


      // Batch fetch reviews and offerings for all mentors in parallel
      const mentorIds = data.map(m => m.id);
      const [reviewsMap, offeringsMap] = await Promise.all([
        fetchAllMentorReviews(mentorIds, 3),
        fetchAllMentorOfferings(mentorIds),
      ]);

      // Map reviews and offerings to mentors, compute real ratings
      const mentorsWithData = data.map(mentor => {
        const mentorReviews = reviewsMap.get(mentor.id) || [];
        const mentorOfferings = offeringsMap.get(mentor.id) || [];
        const avgRating = mentorReviews.length > 0
          ? mentorReviews.reduce((sum: number, r: any) => sum + (r.rating || 0), 0) / mentorReviews.length
          : 0;
        return {
          ...mentor,
          reviews: mentorReviews,
          offerings: mentorOfferings,
          rating: avgRating,
          totalReviews: mentorReviews.length,
        };
      });


      setMentors(mentorsWithData);
    } catch (error) {
      console.error('Error loading mentors:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMyRequests = async () => {
    if (!user) return;
    console.log('=== Loading my requests for user:', user.id);
    try {
      const data = await fetchSessionRequests(user.id, 'student').catch(err => {
        console.error('Error loading requests:', err);
        return [];
      });
      console.log('=== Loaded session requests:', data);
      console.log('=== Number of requests:', data.length);
      if (data.length > 0) {
        console.log('=== First request:', data[0]);
        console.log('=== First request status:', data[0].status);
      }
      setMyRequests(data);
      console.log('=== State updated with requests');
    } catch (error) {
      console.error('Error loading requests:', error);
    }
  };



  const handleViewMentor = async (mentor: Mentor) => {
    setSelectedMentor(mentor);
    const [offerings, reviews] = await Promise.all([
      fetchMentorOfferings(mentor.id),
      fetchMentorReviews(mentor.id)
    ]);
    setMentorOfferings(offerings);
    setMentorReviews(reviews);

    // If a domain filter is selected, pre-fill the topic
    if (selectedOfferingType) {
      setRequestForm(prev => ({ ...prev, topic: selectedOfferingType }));
    }
  };

  const handleRequestSession = async () => {
    if (!user || !selectedMentor) return;

    console.log('Starting session request...');
    // Validate required fields
    if (!requestForm.topic.trim()) {
      alert('Please enter a topic for the session');
      return;
    }

    if (!requestForm.preferredDate) {
      alert('Please select a preferred date for the session');
      return;
    }

    if (!requestForm.preferredTime) {
      alert('Please select a preferred time for the session');
      return;
    }

    // Validate that the selected date/time is in the future
    const selectedDateTime = new Date(`${requestForm.preferredDate}T${requestForm.preferredTime}`);
    if (selectedDateTime <= new Date()) {
      alert('Please select a future date and time for the session');
      return;
    }

    // Get the selected offering to extract mode - if filter applied, find matching offering
    let selectedOffering = mentorOfferings.find(o => o.id === requestForm.offeringId);
    if (!selectedOffering && selectedOfferingType) {
      // Try to find an offering matching the filter type
      selectedOffering = mentorOfferings.find(o =>
        o.title.toLowerCase().includes(selectedOfferingType.toLowerCase())
      );
    }
    const sessionMode = selectedOffering?.mode || 'video'; // Default to video if no offering

    // Build the topic - include the offering type if filter was applied
    const finalTopic = selectedOfferingType
      ? `[${selectedOfferingType}] ${requestForm.topic}`
      : requestForm.topic;

    const request = {
      mentor_id: selectedMentor.id,
      student_id: user.id,
      offering_id: selectedOffering?.id || null,
      topic: finalTopic,
      student_message: requestForm.message,
      preferred_date: requestForm.preferredDate,
      preferred_time: requestForm.preferredTime,
      mode: sessionMode,
      status: 'pending',
    };

    console.log('Submitting request:', request);
    const result = await createSessionRequest(request);
    if (result.error) {
      console.error('Error creating session request:', result.error);
      alert('Failed to send session request. Please try again.');
      return;
    }

    if (result.data) {
      console.log('Session request created successfully!');
      // Close the form and modal
      setShowRequestForm(false);
      setSelectedMentor(null);

      // Reset form
      setRequestForm({
        offeringId: '',
        topic: '',
        message: '',
        preferredDate: '',
        preferredTime: '',
      });

      // Reload requests to show the new one
      console.log('Reloading requests...');
      await loadMyRequests();

      // Small delay to ensure state updates
      setTimeout(() => {
        console.log('After state update - myRequests:', myRequests);
      }, 100);

      // Switch to sessions view to show the pending request
      console.log('Switching to sessions view');
      setActiveView('sessions');
      setSessionFilter('pending');

      // Show success popup
      setShowSuccessPopup(true);
      setTimeout(() => setShowSuccessPopup(false), 4000);
    }
  };

  const allDomains = Array.from(new Set(mentors.flatMap(m => m.domain)));

  // Predefined offering types for filtering
  const predefinedOfferingTypes = [
    '1:1 Mentorship',
    'Doubt Solving',
    'Resume Review',
    'Project Guidance',
    'Career Guidance',
    'Mock Interview'
  ];

  const pendingRequests = myRequests.filter(r => r.status === 'pending');
  const acceptedRequests = myRequests.filter(r => r.status === 'accepted');
  const completedRequests = myRequests.filter(r => r.status === 'completed');
  const rejectedRequests = myRequests.filter(r => r.status === 'rejected' || r.status === 'cancelled');

  const handleCompleteSession = async (requestId: string, mentorId: string, mentorName: string, topic: string) => {
    await completeSessionRequest(requestId);
    setShowConfirmPopup(null);
    // Show review popup after completing session
    setShowReviewPopup({ requestId, mentorId, mentorName, topic });
    loadMyRequests();
  };

  const handleSubmitReview = async () => {
    if (!showReviewPopup || !user) return;

    setSubmittingReview(true);
    try {
      await submitMentorReview(
        showReviewPopup.mentorId,
        user.id,
        showReviewPopup.requestId,
        reviewRating,
        reviewText
      );
      setShowReviewPopup(null);
      setReviewRating(5);
      setReviewText('');
      setShowActionSuccessPopup({ type: 'completed' });
      setTimeout(() => setShowActionSuccessPopup(null), 3000);
    } catch (error) {
      console.error('Error submitting review:', error);
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleSkipReview = () => {
    setShowReviewPopup(null);
    setReviewRating(5);
    setReviewText('');
    setShowActionSuccessPopup({ type: 'completed' });
    setTimeout(() => setShowActionSuccessPopup(null), 3000);
  };

  const handleCancelSession = async (requestId: string) => {
    await cancelSessionRequest(requestId);
    setShowConfirmPopup(null);
    setShowActionSuccessPopup({ type: 'cancelled' });
    setTimeout(() => setShowActionSuccessPopup(null), 3000);
    loadMyRequests();
  };

  const handleDeleteSession = async (requestId: string) => {
    await deleteSessionRequest(requestId);
    setShowDeletePopup(null);
    setShowActionSuccessPopup({ type: 'deleted' });
    setTimeout(() => setShowActionSuccessPopup(null), 3000);
    loadMyRequests();
  };

  console.log('=== RENDER - My Requests:', myRequests);
  console.log('=== RENDER - Pending Requests:', pendingRequests);
  console.log('=== RENDER - Accepted Requests:', acceptedRequests);
  console.log('=== RENDER - Active View:', activeView);
  console.log('=== RENDER - Auth Loading:', authLoading);
  console.log('=== RENDER - User:', user?.id);

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
          <p className={isDarkMode ? 'text-slate-300' : 'text-slate-600'}>
            {authLoading ? 'Authenticating...' : 'Loading mentors...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen px-4 sm:px-6 lg:px-8 ${isDarkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
      {/* Success Popup */}
      {showSuccessPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className={`relative p-8 rounded-2xl shadow-2xl transform ${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
            }`} style={{ animation: 'popIn 0.3s ease-out' }}>
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
              <h3 className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Request Sent Successfully!
              </h3>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Your session booking request has been sent to the mentor.
              </p>
              <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                You'll be notified once they respond.
              </p>
              <button
                onClick={() => setShowSuccessPopup(false)}
                className="mt-6 px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}

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
                The mentor will be notified of this action.
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
                    ? handleCompleteSession(
                      showConfirmPopup.requestId,
                      showConfirmPopup.mentorId || '',
                      showConfirmPopup.mentorName || 'Mentor',
                      showConfirmPopup.topic
                    )
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
                Delete Session?
              </h3>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Are you sure you want to delete "{showDeletePopup.topic}" from your history?
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
                  onClick={() => handleDeleteSession(showDeletePopup.requestId)}
                  className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
                >
                  Yes, Delete
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
                  showActionSuccessPopup.type === 'deleted' ? 'Session Deleted!' : 'Session Cancelled'}
              </h3>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {showActionSuccessPopup.type === 'completed'
                  ? 'The session has been marked as complete. The mentor has been notified.'
                  : showActionSuccessPopup.type === 'deleted'
                    ? 'The session has been removed from your history.'
                    : 'The session has been cancelled. The mentor has been notified.'
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
                Your session with <span className="font-bold text-amber-500">{showSessionStartPopup.mentorName}</span> is starting!
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

      {/* Review Popup */}
      {showReviewPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className={`relative p-8 rounded-2xl shadow-2xl transform max-w-lg w-full mx-4 ${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
            }`} style={{ animation: 'popIn 0.3s ease-out' }}>
            <button
              onClick={handleSkipReview}
              className={`absolute top-4 right-4 p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
                }`}
            >
              <X size={20} />
            </button>

            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mb-4">
                <Star className="w-10 h-10 text-amber-500" />
              </div>
              <h3 className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Session Completed! 🎉
              </h3>
              <p className={`text-sm mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                How was your session with <span className="font-medium text-amber-500">{showReviewPopup.mentorName}</span>?
              </p>
              <p className={`text-xs mb-4 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                Topic: {showReviewPopup.topic}
              </p>

              {/* Star Rating */}
              <div className="flex gap-2 mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setReviewRating(star)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      size={36}
                      className={star <= reviewRating ? 'text-yellow-500' : isDarkMode ? 'text-slate-600' : 'text-slate-300'}
                      fill={star <= reviewRating ? 'currentColor' : 'none'}
                    />
                  </button>
                ))}
              </div>
              <p className={`text-sm font-medium mb-4 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                {reviewRating === 5 ? 'Excellent!' : reviewRating === 4 ? 'Very Good!' : reviewRating === 3 ? 'Good' : reviewRating === 2 ? 'Fair' : 'Poor'}
              </p>

              {/* Review Text */}
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Share your experience with this mentor... (optional)"
                className={`w-full p-3 rounded-xl mb-4 min-h-[100px] resize-none ${isDarkMode
                  ? 'bg-slate-700 text-white placeholder-slate-400 border border-slate-600'
                  : 'bg-slate-50 text-slate-900 placeholder-slate-400 border border-slate-200'
                  } focus:outline-none focus:ring-2 focus:ring-amber-500`}
              />

              <div className="flex gap-3 w-full">
                <button
                  onClick={handleSkipReview}
                  className={`flex-1 px-6 py-2 rounded-lg font-medium transition-colors ${isDarkMode ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                    }`}
                >
                  Skip
                </button>
                <button
                  onClick={handleSubmitReview}
                  disabled={submittingReview}
                  className="flex-1 px-6 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submittingReview ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto p-6">
        {/* Header with View Toggle */}
        <div className="mb-8">
          <h1 className={`text-3xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            {activeView === 'browse' ? 'Find Your Mentor' : 'My Sessions'}
          </h1>
          <p className={`mb-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            {activeView === 'browse'
              ? 'Connect with experienced mentors for guidance, doubt solving, and career advice'
              : 'View and manage your mentorship sessions and requests'}
          </p>

          {/* View Toggle Tabs */}
          <div className="flex gap-2 flex-wrap items-center">
            <button
              onClick={() => setActiveView('browse')}
              className={`px-6 py-2.5 rounded-xl font-medium transition-all ${activeView === 'browse'
                ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/20'
                : isDarkMode
                  ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
            >
              <span className="flex items-center gap-2">
                <Search size={18} />
                Browse Mentors
              </span>
            </button>
            <button
              onClick={() => setActiveView('sessions')}
              className={`px-6 py-2.5 rounded-xl font-medium transition-all ${activeView === 'sessions'
                ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/20'
                : isDarkMode
                  ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
            >
              <span className="flex items-center gap-2">
                <BookOpen size={18} />
                My Sessions
                {(pendingRequests.length + acceptedRequests.length) > 0 && (
                  <span className="px-2 py-0.5 bg-white/20 text-xs rounded-full font-bold">
                    {pendingRequests.length + acceptedRequests.length}
                  </span>
                )}
              </span>
            </button>
          </div>
        </div>

        {/* Browse Mentors View */}
        {activeView === 'browse' && (
          <>
            {/* My Requests Summary - Hidden per user request */}
            {/* {user && (pendingRequests.length > 0 || acceptedRequests.length > 0) && (
              <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingRequests.length > 0 && (
                  <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-amber-50 border border-amber-200'}`}>
                    <p className={`text-sm font-medium ${isDarkMode ? 'text-amber-400' : 'text-amber-700'}`}>
                      {pendingRequests.length} Pending Request{pendingRequests.length > 1 ? 's' : ''}
                    </p>
                  </div>
                )}
                {acceptedRequests.length > 0 && (
                  <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-green-500/10 border border-green-500/20' : 'bg-green-50 border border-green-200'}`}>
                    <p className={`text-sm font-medium ${isDarkMode ? 'text-green-400' : 'text-green-700'}`}>
                      {acceptedRequests.length} Accepted Session{acceptedRequests.length > 1 ? 's' : ''}
                    </p>
                  </div>
                )}
              </div>
            )} */}

            {/* Search and Filter */}
            <div className="mb-8 space-y-4">
              <div className="relative flex-1">
                <Search className={`absolute left-4 top-1/2 transform -translate-y-1/2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`} size={20} />
                <input
                  type="text"
                  placeholder="Search mentors by name, username, domain, or skills..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-12 pr-4 py-3 rounded-xl ${isDarkMode
                    ? 'bg-slate-800 text-white border-slate-700'
                    : 'bg-white text-slate-900 border-slate-300'
                    } border focus:ring-2 focus:ring-amber-500 focus:border-transparent`}
                />
              </div>

              {/* Simplified Filter - 6 main items */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                <Filter size={18} className={isDarkMode ? 'text-slate-400' : 'text-slate-600'} />
                <button
                  onClick={() => { setSelectedDomain(''); setSelectedOfferingType(''); }}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${selectedDomain === '' && selectedOfferingType === ''
                    ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md'
                    : isDarkMode
                      ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                    }`}
                >
                  All
                </button>
                {predefinedOfferingTypes.map(offeringType => (
                  <button
                    key={offeringType}
                    onClick={() => { setSelectedOfferingType(offeringType); setSelectedDomain(''); }}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${selectedOfferingType === offeringType
                      ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md'
                      : isDarkMode
                        ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                        : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                      }`}
                  >
                    {offeringType}
                  </button>
                ))}
              </div>
            </div>


            {/* Recommendations Section */}
            {activeView === 'browse' && !searchQuery && !selectedDomain && !selectedOfferingType && recommendations.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <Star className="text-amber-500" fill="currentColor" size={24} />
                  <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    Recommended for You
                  </h2>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-4 snap-x">
                  {recommendations.map(match => {
                    const mentor = mentors.find(m => m.id === match.mentorId);
                    if (!mentor) return null;
                    return (
                      <div key={match.mentorId} onClick={() => handleViewMentor(mentor)} className={`min-w-[320px] p-5 rounded-xl border flex-shrink-0 cursor-pointer transition-all hover:scale-[1.02] snap-start ${isDarkMode ? 'bg-slate-800 border-amber-500/30 shadow-lg shadow-amber-900/10' : 'bg-white border-amber-200 shadow-lg shadow-amber-100'}`}>
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <img src={mentor.avatarUrl} alt={mentor.name} className="w-12 h-12 rounded-full border-2 border-amber-500" />
                            <div>
                              <h3 className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{mentor.name}</h3>
                              <div className="flex items-center gap-1 text-xs text-amber-500 font-bold">
                                <Star size={12} fill="currentColor" />
                                {match.matchPercentage}% Match
                              </div>
                            </div>
                          </div>
                          <span className="px-2 py-1 bg-amber-500/10 text-amber-500 text-xs font-bold rounded-lg border border-amber-500/20">
                            Top Pick
                          </span>
                        </div>

                        <div className="space-y-2 mb-4">
                          {match.reasoning.slice(0, 2).map((reason, i) => (
                            <div key={i} className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                              <CheckCheck size={12} className="text-green-500" />
                              {reason}
                            </div>
                          ))}
                        </div>

                        <div className="flex items-center gap-2 mt-auto">
                          <button className="flex-1 py-1.5 bg-amber-500 text-white text-sm font-bold rounded-lg hover:bg-amber-600 transition-colors">
                            View Profile
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Mentors Grid */}
            {filteredMentors.length === 0 ? (
              <div className={`text-center py-12 rounded-xl ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>
                <GraduationCap className={`mx-auto mb-3 ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`} size={48} />
                <p className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>No mentors found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredMentors.map(mentor => (
                  <div
                    key={mentor.id}
                    className={`p-6 rounded-xl ${isDarkMode ? 'bg-slate-800' : 'bg-white'} shadow-lg hover:shadow-xl transition-all cursor-pointer`}
                    onClick={() => handleViewMentor(mentor)}
                  >
                    {/* Mentor Header */}
                    <div className="flex items-start gap-4 mb-4">
                      <img
                        src={mentor.avatarUrl}
                        alt={mentor.name}
                        className="w-16 h-16 rounded-full"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            {mentor.name}
                          </h3>
                          {mentor.isVerified && (
                            <Shield className="text-blue-500" size={16} />
                          )}
                        </div>
                        {mentor.username && (
                          <p className={`text-xs mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            @{mentor.username}
                          </p>
                        )}
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <Star className="text-yellow-500" size={14} fill="currentColor" />
                            <span className={`text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                              {mentor.rating.toFixed(1)}
                            </span>
                          </div>
                          <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            ({mentor.totalReviews} reviews)
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Domain Tags */}
                    {mentor.domain.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {mentor.domain.map((d, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-amber-500/10 text-amber-500 text-xs rounded-full font-medium"
                          >
                            {d}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Experience */}
                    {(mentor.experienceYears || mentor.company) && (
                      <div className="flex items-center gap-2 mb-3">
                        <Briefcase size={14} className={isDarkMode ? 'text-slate-400' : 'text-slate-500'} />
                        <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                          {mentor.experienceYears && `${mentor.experienceYears}+ yrs`}
                          {mentor.company && ` • ${mentor.company}`}
                        </p>
                      </div>
                    )}

                    {/* Bio */}
                    <p className={`text-sm line-clamp-2 mb-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                      {mentor.bio || 'Experienced mentor ready to help you grow!'}
                    </p>

                    {/* Offerings Tags Preview (when no filter applied) */}
                    {!selectedOfferingType && mentor.offerings && mentor.offerings.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-4">
                        {mentor.offerings.slice(0, 3).map((offering: any, idx: number) => (
                          <span
                            key={idx}
                            className={`px-2 py-1 text-xs rounded-full font-medium ${isDarkMode ? 'bg-purple-500/15 text-purple-400 border border-purple-500/20' : 'bg-purple-50 text-purple-600 border border-purple-200'}`}
                          >
                            {offering.title}{offering.isFree ? '' : ` • ₹${offering.price}`}
                          </span>
                        ))}
                        {mentor.offerings.length > 3 && (
                          <span className={`px-2 py-1 text-xs rounded-full ${isDarkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                            +{mentor.offerings.length - 3} more
                          </span>
                        )}
                      </div>
                    )}

                    {/* Matched Offering Preview (when filter is applied) */}
                    {selectedOfferingType && mentor.offerings && mentor.offerings.filter(o =>
                      o.title.toLowerCase().includes(selectedOfferingType.toLowerCase())
                    ).length > 0 && (
                        <div className={`p-3 rounded-lg mb-4 ${isDarkMode ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-amber-50 border border-amber-200'}`}>
                          <p className={`text-xs font-medium mb-2 ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>
                            {selectedOfferingType} Offerings:
                          </p>
                          {mentor.offerings.filter(o =>
                            o.title.toLowerCase().includes(selectedOfferingType.toLowerCase())
                          ).slice(0, 2).map((offering, idx) => (
                            <div key={idx} className="flex items-center justify-between text-sm">
                              <span className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>{offering.title}</span>
                              <span className={`text-xs ${offering.isFree ? 'text-green-500' : 'text-amber-500'}`}>
                                {offering.isFree ? 'Free' : `₹${offering.price}`}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                    {/* Skills Preview */}
                    {mentor.skills.length > 0 && !selectedOfferingType && (
                      <div className="flex flex-wrap gap-1 mb-4">
                        {mentor.skills.slice(0, 3).map((skill, idx) => (
                          <span
                            key={idx}
                            className={`px-2 py-1 text-xs rounded ${isDarkMode
                              ? 'bg-slate-700 text-slate-300'
                              : 'bg-slate-100 text-slate-700'
                              }`}
                          >
                            {skill}
                          </span>
                        ))}
                        {mentor.skills.length > 3 && (
                          <span className={`px-2 py-1 text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            +{mentor.skills.length - 3} more
                          </span>
                        )}
                      </div>
                    )}

                    {/* Recent Reviews */}
                    {mentor.reviews && mentor.reviews.length > 0 && (
                      <div className={`mt-4 pt-4 border-t ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                        <h4 className={`text-sm font-medium mb-3 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                          Recent Reviews
                        </h4>
                        <div className="space-y-3">
                          {mentor.reviews.slice(0, 2).map((review) => (
                            <div key={review.id} className={`p-3 rounded-lg ${isDarkMode ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                              <div className="flex items-start gap-2">
                                {review.studentAvatarUrl ? (
                                  <img
                                    src={review.studentAvatarUrl}
                                    alt={review.studentName}
                                    className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                                  />
                                ) : (
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isDarkMode ? 'bg-slate-600' : 'bg-slate-200'
                                    }`}>
                                    <User className="w-4 h-4" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2 mb-1">
                                    <span className={`text-sm font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                                      {review.studentName}
                                    </span>
                                    <div className="flex items-center gap-1">
                                      {[...Array(5)].map((_, i) => (
                                        <Star
                                          key={i}
                                          className={`w-3 h-3 ${i < review.rating
                                            ? 'fill-amber-500 text-amber-500'
                                            : isDarkMode
                                              ? 'text-slate-600'
                                              : 'text-slate-300'
                                            }`}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                  {review.reviewText && (
                                    <p className={`text-xs line-clamp-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                      {review.reviewText}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                          {mentor.reviews.length > 2 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewMentor(mentor);
                              }}
                              className={`text-xs ${isDarkMode ? 'text-amber-400 hover:text-amber-300' : 'text-amber-600 hover:text-amber-700'}`}
                            >
                              View all {mentor.reviews.length} reviews
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Buttons - Show Book Session when filter is applied */}
                    {selectedOfferingType ? (
                      <div className="flex gap-2">
                        <button
                          className="flex-1 py-2 bg-slate-500 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors text-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewMentor(mentor);
                          }}
                        >
                          View Profile
                        </button>
                        <button
                          className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors text-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewMentor(mentor);
                            // Auto-open request form after viewing mentor
                            setTimeout(() => setShowRequestForm(true), 100);
                          }}
                        >
                          Book Session
                        </button>
                      </div>
                    ) : (
                      <button
                        className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewMentor(mentor);
                        }}
                      >
                        View Profile
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* My Sessions View */}
        {activeView === 'sessions' && (
          <div className="space-y-6">
            {/* Session Filter Tabs */}
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setSessionFilter('upcoming')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${sessionFilter === 'upcoming'
                  ? 'bg-green-500 text-white'
                  : isDarkMode
                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    : 'bg-white text-slate-700 hover:bg-slate-100'
                  }`}
              >
                <span className="flex items-center gap-2">
                  <CheckCircle size={16} />
                  Upcoming ({acceptedRequests.length})
                </span>
              </button>
              <button
                onClick={() => setSessionFilter('pending')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${sessionFilter === 'pending'
                  ? 'bg-amber-500 text-white'
                  : isDarkMode
                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    : 'bg-white text-slate-700 hover:bg-slate-100'
                  }`}
              >
                <span className="flex items-center gap-2">
                  <Clock size={16} />
                  Pending ({pendingRequests.length})
                </span>
              </button>
              <button
                onClick={() => setSessionFilter('past')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${sessionFilter === 'past'
                  ? 'bg-slate-500 text-white'
                  : isDarkMode
                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    : 'bg-white text-slate-700 hover:bg-slate-100'
                  }`}
              >
                <span className="flex items-center gap-2">
                  <BookOpen size={16} />
                  Past Sessions ({completedRequests.length + rejectedRequests.length})
                </span>
              </button>
            </div>

            {/* Upcoming Sessions (Accepted) */}
            {sessionFilter === 'upcoming' && (
              <div>
                <h2 className={`text-2xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  Upcoming Sessions
                </h2>
                {acceptedRequests.length === 0 ? (
                  <div className={`text-center py-12 rounded-xl ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>
                    <CheckCircle className={`mx-auto mb-3 ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`} size={48} />
                    <p className={`mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>No upcoming sessions yet</p>
                    <p className={`text-sm ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>Your accepted sessions will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {acceptedRequests.map(request => (
                      <div
                        key={request.id}
                        className={`p-6 rounded-xl ${isDarkMode ? 'bg-slate-800 border-2 border-green-500/30' : 'bg-white border-2 border-green-200'} shadow-lg`}
                      >
                        <div className="flex items-start gap-4">
                          <img
                            src={request.mentorProfile?.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=mentor'}
                            alt="Mentor"
                            className="w-16 h-16 rounded-full"
                          />
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                  {request.mentorProfile?.fullName || 'Mentor'}
                                </h3>
                                <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                  Professional Mentor
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
                                    Mentor's Message:
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
                                  Join Meeting Link
                                </a>
                              )}
                            </div>

                            <div className="flex gap-2 flex-wrap">
                              {onStartChat && (
                                <button
                                  onClick={() => onStartChat({
                                    id: request.mentorId,
                                    name: request.mentorProfile?.fullName || 'Mentor',
                                    avatarUrl: request.mentorProfile?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(request.mentorProfile?.fullName || 'Mentor')}&background=random`,
                                    status: 'online',
                                    isMentor: true
                                  })}
                                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${isDarkMode
                                    ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                                    : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                                    } transition-colors`}
                                >
                                  <MessageCircle size={18} />
                                  Chat with Mentor
                                </button>
                              )}
                              {request.mode && request.mode !== 'chat' && (
                                <p className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-500'} flex items-center`}>
                                  <Video size={14} className="mr-1" />
                                  Mentor will initiate the call
                                </p>
                              )}
                              <button
                                onClick={() => setShowConfirmPopup({
                                  type: 'complete',
                                  requestId: request.id,
                                  topic: request.topic,
                                  mentorId: request.mentorId,
                                  mentorName: request.mentorProfile?.fullName || 'Mentor'
                                })}
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
                )}
              </div>
            )}

            {/* Pending Requests */}
            {sessionFilter === 'pending' && (
              <div>
                <h2 className={`text-2xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  Pending Requests
                </h2>
                {pendingRequests.length === 0 ? (
                  <div className={`text-center py-12 rounded-xl ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>
                    <Clock className={`mx-auto mb-3 ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`} size={48} />
                    <p className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>No pending requests</p>
                    <button
                      onClick={() => setActiveView('browse')}
                      className="mt-4 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors"
                    >
                      Browse Mentors
                    </button>
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
                            src={request.mentorProfile?.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=mentor'}
                            alt="Mentor"
                            className="w-16 h-16 rounded-full"
                          />
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                  {request.mentorProfile?.fullName || 'Mentor'}
                                </h3>
                                <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                  Professional Mentor
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
                              <p className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                Requested on {new Date(request.createdAt).toLocaleDateString()}
                              </p>
                            </div>

                            <div className="flex gap-2">
                              {onStartChat && (
                                <button
                                  onClick={() => onStartChat({
                                    id: request.mentorId,
                                    name: request.mentorProfile?.fullName || 'Mentor',
                                    avatarUrl: request.mentorProfile?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(request.mentorProfile?.fullName || 'Mentor')}&background=random`,
                                    status: 'online',
                                    isMentor: true
                                  })}
                                  className={`flex items-center gap-2 px-4 py-2 rounded-lg ${isDarkMode
                                    ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                                    : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                                    } transition-colors`}
                                >
                                  <MessageCircle size={18} />
                                  Chat with Mentor
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Past Sessions */}
            {sessionFilter === 'past' && (
              <div>
                <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                  <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    Past Sessions
                  </h2>
                  {/* Past Session Filter Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPastSessionFilter('completed')}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${pastSessionFilter === 'completed'
                        ? 'bg-green-500 text-white'
                        : isDarkMode
                          ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                          : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                        }`}
                    >
                      <CheckCheck size={14} />
                      Completed ({completedRequests.length})
                    </button>
                    <button
                      onClick={() => setPastSessionFilter('rejected')}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${pastSessionFilter === 'rejected'
                        ? 'bg-red-500 text-white'
                        : isDarkMode
                          ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                          : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                        }`}
                    >
                      <XCircle size={14} />
                      Rejected/Cancelled ({rejectedRequests.length})
                    </button>
                  </div>
                </div>

                {pastSessionFilter === 'completed' && (
                  <>
                    {completedRequests.length === 0 ? (
                      <div className={`text-center py-12 rounded-xl ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>
                        <CheckCheck className={`mx-auto mb-3 ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`} size={48} />
                        <p className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>No completed sessions yet</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {completedRequests.map(request => (
                          <div
                            key={request.id}
                            className={`p-6 rounded-xl ${isDarkMode ? 'bg-slate-800/50' : 'bg-slate-100'}`}
                          >
                            <div className="flex items-start gap-4">
                              <img
                                src={request.mentorProfile?.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=mentor'}
                                alt="Mentor"
                                className="w-12 h-12 rounded-full"
                              />
                              <div className="flex-1">
                                <div className="flex items-start justify-between mb-2">
                                  <div>
                                    <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                      {request.mentorProfile?.fullName || 'Mentor'}
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
                                  <div className="flex items-center gap-2">
                                    <span className="px-3 py-1 bg-green-500/10 text-green-500 text-xs font-medium rounded-full flex items-center gap-1">
                                      <CheckCheck size={12} />
                                      Completed
                                    </span>
                                    <button
                                      onClick={() => setShowDeletePopup({ requestId: request.id, topic: request.topic })}
                                      className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-slate-700 text-slate-400 hover:text-red-400' : 'hover:bg-slate-200 text-slate-500 hover:text-red-500'
                                        }`}
                                      title="Delete session"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                </div>

                                {/* Display Review if exists */}
                                {request.review ? (
                                  <div className={`mt-3 p-3 rounded-lg ${isDarkMode ? 'bg-slate-900/50' : 'bg-white'} border ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className={`text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                        Your Review:
                                      </span>
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
                                  </div>
                                ) : (
                                  <p className={`mt-2 text-xs italic ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                    You haven't reviewed this session yet
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {pastSessionFilter === 'rejected' && (
                  <>
                    {rejectedRequests.length === 0 ? (
                      <div className={`text-center py-12 rounded-xl ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>
                        <XCircle className={`mx-auto mb-3 ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`} size={48} />
                        <p className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>No rejected or cancelled sessions</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {rejectedRequests.map(request => (
                          <div
                            key={request.id}
                            className={`p-6 rounded-xl ${isDarkMode ? 'bg-slate-800/50' : 'bg-slate-100'}`}
                          >
                            <div className="flex items-start gap-4">
                              <img
                                src={request.mentorProfile?.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=mentor'}
                                alt="Mentor"
                                className="w-12 h-12 rounded-full"
                              />
                              <div className="flex-1">
                                <div className="flex items-start justify-between mb-2">
                                  <div>
                                    <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                      {request.mentorProfile?.fullName || 'Mentor'}
                                    </h3>
                                    <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                      {request.topic}
                                    </p>
                                    {request.preferredDate && (
                                      <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                                        📅 {request.preferredDate} {request.preferredTime && `at ${request.preferredTime}`}
                                      </p>
                                    )}
                                    {request.mentorResponse && (
                                      <p className={`text-sm mt-1 italic ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                                        "{request.mentorResponse}"
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className={`px-3 py-1 text-xs font-medium rounded-full flex items-center gap-1 ${request.status === 'cancelled'
                                      ? 'bg-slate-500/10 text-slate-500'
                                      : 'bg-red-500/10 text-red-500'
                                      }`}>
                                      <XCircle size={12} />
                                      {request.status === 'cancelled' ? 'Cancelled' : 'Rejected'}
                                    </span>
                                    <button
                                      onClick={() => setShowDeletePopup({ requestId: request.id, topic: request.topic })}
                                      className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-slate-700 text-slate-400 hover:text-red-400' : 'hover:bg-slate-200 text-slate-500 hover:text-red-500'
                                        }`}
                                      title="Delete session"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Mentor Detail Modal */}
        {selectedMentor && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className={`max-w-4xl w-full max-h-[90vh] overflow-y-auto rounded-xl ${isDarkMode ? 'bg-slate-800' : 'bg-white'
              } shadow-2xl`}>
              <div className="sticky top-0 z-10 flex justify-between items-center p-6 border-b border-slate-300 dark:border-slate-700 bg-inherit">
                <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  Mentor Profile
                </h2>
                <button
                  onClick={() => {
                    setSelectedMentor(null);
                    setShowRequestForm(false);
                  }}
                  className={`p-2 rounded-lg ${isDarkMode
                    ? 'hover:bg-slate-700 text-slate-300'
                    : 'hover:bg-slate-100 text-slate-600'
                    } transition-colors`}
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Profile Header */}
                <div className="flex items-start gap-6">
                  <img
                    src={selectedMentor.avatarUrl}
                    alt={selectedMentor.name}
                    className="w-24 h-24 rounded-full border-4 border-amber-500/30 shadow-xl"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        {selectedMentor.name}
                      </h3>
                      {selectedMentor.isVerified && (
                        <Shield className="text-blue-500" size={20} />
                      )}
                    </div>
                    {selectedMentor.username && (
                      <p className={`text-sm mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        @{selectedMentor.username}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex items-center gap-1">
                        <Star className="text-yellow-500" size={18} fill="currentColor" />
                        <span className={`font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                          {selectedMentor.rating.toFixed(1)}
                        </span>
                      </div>
                      <span className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        ({selectedMentor.totalReviews} reviews)
                      </span>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => setShowRequestForm(!showRequestForm)}
                        className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl font-medium transition-all shadow-lg shadow-amber-500/20"
                      >
                        Request Session
                      </button>
                      {onStartChat && (
                        <button
                          onClick={() => onStartChat({
                            id: selectedMentor.id,
                            name: selectedMentor.name,
                            avatarUrl: selectedMentor.avatarUrl,
                            status: 'online',
                            isMentor: true
                          })}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${isDarkMode
                            ? 'bg-slate-700 hover:bg-slate-600 text-white border border-slate-600'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                            }`}
                        >
                          <MessageCircle size={18} />
                          Chat
                        </button>
                      )}
                      {onStartVideoCall && mentorOfferings.some(o => o.mode === 'video' || o.mode === 'call') && (
                        <button
                          onClick={() => onStartVideoCall({
                            id: selectedMentor.id,
                            name: selectedMentor.name,
                            avatar: selectedMentor.avatarUrl,
                          })}
                          className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl transition-colors"
                        >
                          <Video size={18} />
                          Call
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Request Form */}
                {showRequestForm && (
                  <div className={`p-6 rounded-xl border ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                    <h4 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      Request a Session
                    </h4>
                    <div className="space-y-4">
                      {selectedOfferingType && (
                        <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-amber-50 border border-amber-200'}`}>
                          <p className={`text-sm font-medium ${isDarkMode ? 'text-amber-400' : 'text-amber-700'}`}>
                            Session Type: <span className="font-bold">{selectedOfferingType}</span>
                          </p>
                        </div>
                      )}

                      <div>
                        <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                          Topic *
                        </label>
                        <input
                          type="text"
                          placeholder={selectedOfferingType ? `Specific topic for ${selectedOfferingType}` : "e.g., DSA - Trees, Resume Review"}
                          value={requestForm.topic}
                          onChange={(e) => setRequestForm({ ...requestForm, topic: e.target.value })}
                          className={`w-full px-4 py-2 rounded-lg ${isDarkMode
                            ? 'bg-slate-800 text-white border-slate-700'
                            : 'bg-white text-slate-900 border-slate-300'
                            } border`}
                          required
                        />
                      </div>

                      <div>
                        <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                          Message
                        </label>
                        <textarea
                          placeholder="Explain what you need help with..."
                          value={requestForm.message}
                          onChange={(e) => setRequestForm({ ...requestForm, message: e.target.value })}
                          rows={3}
                          className={`w-full px-4 py-2 rounded-lg ${isDarkMode
                            ? 'bg-slate-800 text-white border-slate-700'
                            : 'bg-white text-slate-900 border-slate-300'
                            } border`}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                            Preferred Date
                          </label>
                          <input
                            type="date"
                            value={requestForm.preferredDate}
                            onChange={(e) => setRequestForm({ ...requestForm, preferredDate: e.target.value })}
                            className={`w-full px-4 py-2 rounded-lg ${isDarkMode
                              ? 'bg-slate-800 text-white border-slate-700'
                              : 'bg-white text-slate-900 border-slate-300'
                              } border`}
                          />
                        </div>
                        <div>
                          <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                            Preferred Time
                          </label>
                          <input
                            type="time"
                            value={requestForm.preferredTime}
                            onChange={(e) => setRequestForm({ ...requestForm, preferredTime: e.target.value })}
                            className={`w-full px-4 py-2 rounded-lg ${isDarkMode
                              ? 'bg-slate-800 text-white border-slate-700'
                              : 'bg-white text-slate-900 border-slate-300'
                              } border`}
                          />
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={handleRequestSession}
                          disabled={!requestForm.topic || !requestForm.preferredDate || !requestForm.preferredTime}
                          className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                        >
                          <Send size={18} />
                          Send Request
                        </button>
                        <button
                          onClick={() => setShowRequestForm(false)}
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

                {/* About Section */}
                {selectedMentor.bio && (
                  <div className={`p-5 rounded-xl border ${isDarkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                    <h4 className={`font-semibold mb-3 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      <User size={18} className="text-amber-500" />
                      About
                    </h4>
                    <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{selectedMentor.bio}</p>
                  </div>
                )}

                {/* Domain / Expertise */}
                {selectedMentor.domain.length > 0 && (
                  <div className={`p-5 rounded-xl border ${isDarkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex items-center gap-2 mb-3">
                      <GraduationCap className="text-amber-500" size={20} />
                      <h4 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        Domain / Expertise
                      </h4>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedMentor.domain.map((d, idx) => (
                        <span key={idx} className="px-3 py-1.5 bg-gradient-to-r from-amber-500/10 to-orange-500/10 text-amber-500 rounded-full text-sm font-medium border border-amber-500/20">
                          {d}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Experience Section */}
                {(selectedMentor.experienceYears || selectedMentor.company || selectedMentor.college) && (
                  <div className={`p-5 rounded-xl border ${isDarkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex items-center gap-2 mb-3">
                      <Briefcase className="text-blue-500" size={20} />
                      <h4 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Experience</h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {selectedMentor.experienceYears && (
                        <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-slate-800' : 'bg-white'} border ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                          <p className={`text-xs uppercase tracking-wider font-bold mb-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Years</p>
                          <p className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{selectedMentor.experienceYears}+ years</p>
                        </div>
                      )}
                      {selectedMentor.company && (
                        <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-slate-800' : 'bg-white'} border ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                          <p className={`text-xs uppercase tracking-wider font-bold mb-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Company</p>
                          <p className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{selectedMentor.company}</p>
                        </div>
                      )}
                      {selectedMentor.college && (
                        <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-slate-800' : 'bg-white'} border ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                          <p className={`text-xs uppercase tracking-wider font-bold mb-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Education</p>
                          <p className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{selectedMentor.college}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Languages */}
                {selectedMentor.languages.length > 0 && (
                  <div className={`p-5 rounded-xl border ${isDarkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex items-center gap-2 mb-3">
                      <Globe className="text-green-500" size={20} />
                      <h4 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Languages</h4>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedMentor.languages.map((lang, idx) => (
                        <span key={idx} className="px-3 py-1.5 bg-green-500/10 text-green-500 rounded-full text-sm font-medium border border-green-500/20 flex items-center gap-1.5">
                          <Globe size={14} />
                          {lang}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Skills */}
                {selectedMentor.skills.length > 0 && (
                  <div className={`p-5 rounded-xl border ${isDarkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                    <h4 className={`font-semibold mb-3 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Skills</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedMentor.skills.map((skill, idx) => (
                        <span key={idx} className="px-3 py-1.5 bg-blue-500/10 text-blue-500 rounded-full text-sm border border-blue-500/20">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Mentorship Offerings */}
                {mentorOfferings.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Briefcase className="text-purple-500" size={20} />
                      <h4 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        Mentorship Offerings ({mentorOfferings.length})
                      </h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {mentorOfferings.map(offering => (
                        <div
                          key={offering.id}
                          className={`p-4 rounded-lg border ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'}`}
                        >
                          <h5 className={`font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            {offering.title}
                          </h5>
                          <p className={`text-sm mb-3 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                            {offering.description}
                          </p>
                          <div className="flex items-center gap-3 text-sm flex-wrap">
                            <span className={`flex items-center gap-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
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
                      ))}
                    </div>
                  </div>
                )}

                {/* Reviews Section */}
                <div className={`p-5 rounded-xl border ${isDarkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Star className="text-amber-500" size={20} />
                      <h4 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        Reviews ({mentorReviews.length})
                      </h4>
                    </div>
                    {mentorReviews.length > 0 && (
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
                        <Star size={14} className="text-amber-500" fill="currentColor" />
                        <span className="text-sm font-bold text-amber-500">{selectedMentor.rating.toFixed(1)}</span>
                        <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>avg</span>
                      </div>
                    )}
                  </div>
                  {mentorReviews.length === 0 ? (
                    <div className={`text-center py-8 rounded-lg ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>
                      <Star className={`mx-auto mb-2 ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`} size={32} />
                      <p className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>
                        No reviews yet
                      </p>
                      <p className={`text-sm ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                        Be the first to leave a review!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                      {mentorReviews.map(review => (
                        <div
                          key={review.id}
                          className={`p-4 rounded-xl ${isDarkMode ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200'} shadow-sm`}
                        >
                          <div className="flex items-start gap-3">
                            <img
                              src={review.student?.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=student'}
                              alt={review.student?.fullName || 'Student'}
                              className="w-10 h-10 rounded-full border-2 border-amber-500/20"
                            />
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                  {review.student?.fullName || (review.student?.username ? `@${review.student.username}` : 'Anonymous Student')}
                                </span>
                                <span className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                                  {new Date(review.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 mb-2">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    size={14}
                                    className={star <= review.rating
                                      ? 'text-amber-500 fill-amber-500'
                                      : isDarkMode ? 'text-slate-600' : 'text-slate-300'
                                    }
                                  />
                                ))}
                                <span className={`text-sm ml-1 font-medium ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>
                                  {review.rating}/5
                                </span>
                              </div>
                              {review.reviewText && (
                                <p className={`text-sm italic ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                  "{review.reviewText}"
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MentorConnect;
