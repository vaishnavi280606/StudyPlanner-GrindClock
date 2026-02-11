import { useState, useEffect, useRef } from 'react';
import { Clock, Video, MessageCircle, Calendar, X, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { fetchUpcomingSessions, isSessionSoon, getUserProfile, isSessionIn30Minutes, isSessionIn10Minutes, sendSessionReminderNotification, isSessionWithin30Minutes, getTimeUntilSession } from '../utils/supabase-queries';

interface SessionRemindersProps {
  isDarkMode: boolean;
  onStartChat?: (participant: any) => void;
  onStartVideoCall?: (name: string, avatar: string, userId: string) => void;
}

interface UpcomingSession {
  id: string;
  mentorId: string;
  studentId: string;
  topic: string;
  preferredDate: string;
  preferredTime: string;
  mode: 'chat' | 'call' | 'video';
  studentProfile?: {
    fullName: string;
    avatarUrl: string;
    username: string;
  };
  mentorProfile?: {
    fullName: string;
    avatarUrl: string;
    username: string;
  };
}

export function SessionReminders({ isDarkMode, onStartChat, onStartVideoCall }: SessionRemindersProps) {
  const { user } = useAuth();
  const [upcomingSessions, setUpcomingSessions] = useState<UpcomingSession[]>([]);
  const [userRole, setUserRole] = useState<'student' | 'mentor'>('student');
  const [dismissedSessions, setDismissedSessions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Track sessions that already had reminders sent (separate for 30 and 10 minute)
  const sent30MinReminders = useRef<Set<string>>(new Set());
  const sent10MinReminders = useRef<Set<string>>(new Set());
  
  // Show popup for sessions within 30 minutes on page load
  const [upcomingSessionPopup, setUpcomingSessionPopup] = useState<UpcomingSession | null>(null);
  const hasShownPopup = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (user) {
      loadUserRole();
    }
  }, [user]);

  useEffect(() => {
    if (user && userRole) {
      loadUpcomingSessions();
      // Check every minute for upcoming sessions
      const interval = setInterval(loadUpcomingSessions, 60000);
      return () => clearInterval(interval);
    }
  }, [user, userRole]);
  
  // Check for reminder notifications (30-minute and 10-minute) and show popup
  useEffect(() => {
    const checkAndSendReminders = async () => {
      for (const session of upcomingSessions) {
        // 30-minute reminder
        if (
          isSessionIn30Minutes(session.preferredDate, session.preferredTime) &&
          !sent30MinReminders.current.has(session.id)
        ) {
          sent30MinReminders.current.add(session.id);
          await sendSessionReminderNotification(
            session.id,
            session.mentorId,
            session.studentId,
            session.topic,
            30
          );
          console.log(`30-minute reminder sent for session: ${session.topic}`);
        }
        
        // 10-minute reminder
        if (
          isSessionIn10Minutes(session.preferredDate, session.preferredTime) &&
          !sent10MinReminders.current.has(session.id)
        ) {
          sent10MinReminders.current.add(session.id);
          await sendSessionReminderNotification(
            session.id,
            session.mentorId,
            session.studentId,
            session.topic,
            10
          );
          console.log(`10-minute reminder sent for session: ${session.topic}`);
        }
        
        // Show popup for session within 30 minutes on fresh page load
        if (
          isSessionWithin30Minutes(session.preferredDate, session.preferredTime) &&
          !hasShownPopup.current.has(session.id)
        ) {
          hasShownPopup.current.add(session.id);
          setUpcomingSessionPopup(session);
        }
      }
    };
    
    if (upcomingSessions.length > 0) {
      checkAndSendReminders();
    }
  }, [upcomingSessions]);

  const loadUserRole = async () => {
    if (!user) return;
    const profile = await getUserProfile(user.id);
    setUserRole(profile?.role || 'student');
  };

  const loadUpcomingSessions = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const sessions = await fetchUpcomingSessions(user.id, userRole);
      setUpcomingSessions(sessions);
    } catch (error) {
      console.error('Error loading upcoming sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const dismissSession = (sessionId: string) => {
    setDismissedSessions(prev => [...prev, sessionId]);
  };

  const getOtherParticipant = (session: UpcomingSession) => {
    if (userRole === 'mentor') {
      return {
        id: session.studentId,
        name: session.studentProfile?.fullName || 'Student',
        avatar: session.studentProfile?.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=student',
      };
    } else {
      return {
        id: session.mentorId,
        name: session.mentorProfile?.fullName || 'Mentor',
        avatar: session.mentorProfile?.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=mentor',
      };
    }
  };

  const formatTime = (time: string) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  // Filter out dismissed sessions and get sessions happening soon (within 1 hour)
  const sessionsToShow = upcomingSessions.filter(session => 
    !dismissedSessions.includes(session.id) && 
    isSessionSoon(session.preferredDate, session.preferredTime)
  );

  // Also show today's sessions that haven't started yet
  const todaysSessions = upcomingSessions.filter(session => {
    if (dismissedSessions.includes(session.id)) return false;
    if (sessionsToShow.some(s => s.id === session.id)) return false;
    
    const sessionDateTime = new Date(`${session.preferredDate}T${session.preferredTime}`);
    return sessionDateTime > new Date();
  });

  if (loading || (sessionsToShow.length === 0 && todaysSessions.length === 0 && !upcomingSessionPopup)) {
    return null;
  }

  return (
    <>
      {/* Popup for session within 30 minutes on page load */}
      {upcomingSessionPopup && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`max-w-md w-full rounded-2xl shadow-2xl overflow-hidden animate-popIn ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>
            <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-4">
              <div className="flex items-center gap-3 text-white">
                <AlertCircle size={28} className="animate-pulse" />
                <div>
                  <h3 className="font-bold text-lg">Session Starting Soon!</h3>
                  <p className="text-sm opacity-90">Don't miss your upcoming session</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="text-center mb-4">
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${isDarkMode ? 'bg-amber-500/20' : 'bg-amber-100'}`}>
                  <Clock size={20} className="text-amber-500" />
                  <span className={`text-lg font-bold ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>
                    {getTimeUntilSession(upcomingSessionPopup.preferredDate, upcomingSessionPopup.preferredTime)}
                  </span>
                </div>
              </div>
              
              <div className={`p-4 rounded-xl mb-4 ${isDarkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
                <h4 className={`font-bold text-lg mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  📚 {upcomingSessionPopup.topic}
                </h4>
                <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  with {userRole === 'mentor' 
                    ? upcomingSessionPopup.studentProfile?.fullName || 'Student'
                    : upcomingSessionPopup.mentorProfile?.fullName || 'Mentor'}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Calendar size={14} className={isDarkMode ? 'text-slate-400' : 'text-slate-500'} />
                  <span className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    {upcomingSessionPopup.preferredDate} at {formatTime(upcomingSessionPopup.preferredTime)}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  {upcomingSessionPopup.mode === 'video' && <Video size={14} className="text-blue-500" />}
                  {upcomingSessionPopup.mode === 'call' && <MessageCircle size={14} className="text-green-500" />}
                  {upcomingSessionPopup.mode === 'chat' && <MessageCircle size={14} className="text-purple-500" />}
                  <span className={`text-sm capitalize ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    {upcomingSessionPopup.mode === 'video' ? 'Video Call' : upcomingSessionPopup.mode === 'call' ? 'Voice Call' : 'Chat'}
                  </span>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setUpcomingSessionPopup(null)}
                  className={`flex-1 py-3 rounded-xl font-medium transition-colors ${
                    isDarkMode 
                      ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' 
                      : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                  }`}
                >
                  Dismiss
                </button>
                <button
                  onClick={() => {
                    setUpcomingSessionPopup(null);
                    // Navigate to sessions - can be enhanced to actually navigate
                  }}
                  className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium transition-colors"
                >
                  Go to Session
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
    <div className="space-y-4">
      {/* Urgent reminders - sessions starting within 1 hour */}
      {sessionsToShow.length > 0 && (
        <div className={`rounded-xl border-2 border-amber-500 overflow-hidden ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>
          <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-3">
            <div className="flex items-center gap-2 text-white">
              <AlertCircle size={20} className="animate-pulse" />
              <span className="font-bold">Session Starting Soon!</span>
            </div>
          </div>
          <div className="p-4 space-y-3">
            {sessionsToShow.map(session => {
              const participant = getOtherParticipant(session);
              return (
                <div 
                  key={session.id}
                  className={`flex items-center justify-between p-4 rounded-lg ${isDarkMode ? 'bg-slate-700/50' : 'bg-amber-50'}`}
                >
                  <div className="flex items-center gap-4">
                    <img 
                      src={participant.avatar} 
                      alt={participant.name}
                      className="w-12 h-12 rounded-full border-2 border-amber-500"
                    />
                    <div>
                      <h4 className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        {session.topic}
                      </h4>
                      <p className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                        with {participant.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock size={14} className="text-amber-500" />
                        <span className={`text-sm font-medium ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>
                          {formatTime(session.preferredTime)}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          session.mode === 'video' ? 'bg-blue-500/10 text-blue-500' :
                          session.mode === 'call' ? 'bg-green-500/10 text-green-500' :
                          'bg-purple-500/10 text-purple-500'
                        }`}>
                          {session.mode === 'video' ? '🎥 Video' : session.mode === 'call' ? '📞 Call' : '💬 Chat'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {session.mode !== 'chat' && userRole === 'mentor' && onStartVideoCall && (
                      <button
                        onClick={() => onStartVideoCall(participant.name, participant.avatar, participant.id)}
                        className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                      >
                        <Video size={16} />
                        Start Call
                      </button>
                    )}
                    {onStartChat && (
                      <button
                        onClick={() => onStartChat(participant)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                          isDarkMode ? 'bg-slate-600 hover:bg-slate-500 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                        }`}
                      >
                        <MessageCircle size={16} />
                        Chat
                      </button>
                    )}
                    <button
                      onClick={() => dismissSession(session.id)}
                      className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-slate-600 text-slate-400' : 'hover:bg-slate-200 text-slate-500'}`}
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Today's upcoming sessions */}
      {todaysSessions.length > 0 && (
        <div className={`rounded-xl border overflow-hidden ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
          <div className={`px-4 py-3 border-b ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-amber-500" />
              <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Today's Sessions</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${isDarkMode ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-600'}`}>
                {todaysSessions.length}
              </span>
            </div>
          </div>
          <div className="p-4 space-y-3">
            {todaysSessions.map(session => {
              const participant = getOtherParticipant(session);
              return (
                <div 
                  key={session.id}
                  className={`flex items-center justify-between p-3 rounded-lg ${isDarkMode ? 'bg-slate-700/30' : 'bg-slate-50'}`}
                >
                  <div className="flex items-center gap-3">
                    <img 
                      src={participant.avatar} 
                      alt={participant.name}
                      className="w-10 h-10 rounded-full"
                    />
                    <div>
                      <h4 className={`font-medium text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        {session.topic}
                      </h4>
                      <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        with {participant.name} at {formatTime(session.preferredTime)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => dismissSession(session.id)}
                    className={`p-1.5 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-slate-600 text-slate-400' : 'hover:bg-slate-200 text-slate-500'}`}
                  >
                    <X size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
    </>
  );
}

export default SessionReminders;
