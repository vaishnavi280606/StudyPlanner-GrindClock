import { useState, useEffect, useRef, useCallback } from 'react';
import { BookOpen, LayoutDashboard, Clock, Target, History, Zap, BarChart3, Brain, X, Users, GraduationCap, Settings as SettingsIcon, Phone, PhoneOff, CalendarCheck, Tag } from 'lucide-react';
import { Subject, StudySession, StudyGoal } from './types';
import { storage } from './utils/storage';
import { Dashboard } from './components/Dashboard';
import { SubjectManager } from './components/SubjectManager';
import { StudyTimer } from './components/StudyTimer';
import { SessionHistory } from './components/SessionHistory';
import { GoalsManager } from './components/GoalsManager';
import { AdvancedAnalytics } from './components/AdvancedAnalytics';
import { AIRecommendations } from './components/AIRecommendations';
import { StudyTechniques } from './components/StudyTechniques';
import { Reminder } from './components/Reminder';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useAuth } from './contexts/AuthContext';
import { GoalReminderPopup } from './components/GoalReminderPopup';
import { AIChatbot } from './components/AIChatbot';
import { ExamCountdown } from './components/ExamCountdown';
import { MentorConnect } from './components/MentorConnect';
import { FriendsCircle } from './components/FriendsCircle';
import { VideoCall } from './components/VideoCall';
import { createNotification, subscribeToNotifications, fetchUnreadCounts } from './utils/supabase-queries';
import { supabase } from './utils/supabase';
import { Header } from './components/Header';
import { Settings } from './components/Settings';
import { ToastNotification } from './components/ToastNotification';
import MentorDashboard from './components/MentorDashboard';
import { MentorSessionsPage } from './components/MentorSessionsPage';
import { MentorStudentsPage } from './components/MentorStudentsPage';
import { MentorOfferingsPage } from './components/MentorOfferingsPage';

type View = 'dashboard' | 'subjects' | 'timer' | 'history' | 'goals' | 'analytics' | 'recommendations' | 'techniques' | 'mentors' | 'friends' | 'settings' | 'mentor-sessions' | 'mentor-students' | 'mentor-offerings';

// Timer state interface
interface TimerState {
  isRunning: boolean;
  isPaused: boolean;
  selectedSubjectId: string;
  startTime: Date | null;
  elapsedSeconds: number;
  notes: string;
  focusRating: number;
}

function AppContent() {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [goals, setGoals] = useState<StudyGoal[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });
  const [showSuccessPopper, setShowSuccessPopper] = useState(false);
  const [showGoalReminder, setShowGoalReminder] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [goalsInitialTab, setGoalsInitialTab] = useState<'goals' | 'exams' | 'tracker'>('goals');


  // Persistent timer state
  const [timerState, setTimerState] = useState<TimerState>({
    isRunning: false,
    isPaused: false,
    selectedSubjectId: '',
    startTime: null,
    elapsedSeconds: 0,
    notes: '',
    focusRating: 3,
  });

  const [activeVideoCall, setActiveVideoCall] = useState<{ name: string; avatar?: string; friendId?: string; isInitiator?: boolean } | null>(null);
  const [totalUnreadMessages, setTotalUnreadMessages] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('grind_clock_sound_enabled');
    return saved ? JSON.parse(saved) : true;
  });
  const [incomingCall, setIncomingCall] = useState<any | null>(null);
  const [soundVolume, setSoundVolume] = useState(() => {
    const saved = localStorage.getItem('grind_clock_sound_volume');
    return saved ? JSON.parse(saved) : 0.7;
  });
  const [incomingCallSoundEnabled, setIncomingCallSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('grind_clock_incoming_call_sound');
    return saved ? JSON.parse(saved) : true;
  });
  const [receiveMsgSoundEnabled, setReceiveMsgSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('grind_clock_receive_msg_sound');
    return saved ? JSON.parse(saved) : true;
  });
  const [sendMsgSoundEnabled, setSendMsgSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('grind_clock_send_msg_sound');
    return saved ? JSON.parse(saved) : true;
  });


  const [toasts, setToasts] = useState<Array<{ id: string; message: string; senderName?: string; senderAvatar?: string; type: 'message' | 'info' | 'success'; senderId?: string }>>([]);
  const removeToast = useCallback((id: string) => setToasts(prev => prev.filter(t => t.id !== id)), []);

  const [userRole, setUserRole] = useState<'student' | 'mentor'>('student');

  const { user, isGuest } = useAuth();

  // Notification sound — plays a real audio file, falls back to Web Audio API
  const playNotificationSound = useCallback(() => {
    if (!soundEnabled || !receiveMsgSoundEnabled) return;
    try {
      const a = new Audio('https://cdn.pixabay.com/audio/2024/11/04/audio_4956b4edd2.mp3');
      a.volume = soundVolume;
      a.play().catch(() => {
        // Web Audio API fallback
        try {
          const ctx = new AudioContext();
          const o1 = ctx.createOscillator(); const o2 = ctx.createOscillator();
          const g = ctx.createGain();
          o1.connect(g); o2.connect(g); g.connect(ctx.destination);
          o1.frequency.setValueAtTime(587, ctx.currentTime);
          o2.frequency.setValueAtTime(784, ctx.currentTime + 0.08);
          g.gain.setValueAtTime(soundVolume * 0.3, ctx.currentTime);
          g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
          o1.start(); o1.stop(ctx.currentTime + 0.12);
          o2.start(ctx.currentTime + 0.08); o2.stop(ctx.currentTime + 0.3);
        } catch (err) {
          console.error('AudioContext fallback failed', err);
        }
      });
    } catch (err) {
      console.error('Audio play failed', err);
    }
  }, [soundEnabled, receiveMsgSoundEnabled, soundVolume]);

  // Ringtone — plays a real audio file on loop, falls back to Web Audio API
  const ringtoneCtxRef = useRef<{ ctx: AudioContext; interval: ReturnType<typeof setInterval> } | null>(null);
  const ringtoneAudioRef = useRef<HTMLAudioElement | null>(null);

  const stopRingtone = useCallback(() => {
    // Stop audio element ringtone
    if (ringtoneAudioRef.current) {
      ringtoneAudioRef.current.pause();
      ringtoneAudioRef.current.src = '';
      ringtoneAudioRef.current = null;
    }
    // Stop Web Audio API fallback ringtone
    if (ringtoneCtxRef.current) {
      clearInterval(ringtoneCtxRef.current.interval);
      ringtoneCtxRef.current.ctx.close().catch((err) => { console.error('Error closing ringtone context', err); });
      ringtoneCtxRef.current = null;
    }
  }, []);

  const playRingtone = useCallback(() => {
    if (!soundEnabled || !incomingCallSoundEnabled) return;
    stopRingtone(); // clean up any existing
    try {
      const a = new Audio('https://cdn.pixabay.com/audio/2022/10/30/audio_f3f8e5a830.mp3');
      a.loop = true;
      a.volume = soundVolume;
      ringtoneAudioRef.current = a;
      a.play().catch(() => {
        // Web Audio API fallback ringtone
        try {
          const ctx = new AudioContext();
          const playPulse = () => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.frequency.setValueAtTime(440, ctx.currentTime);
            osc.frequency.setValueAtTime(520, ctx.currentTime + 0.15);
            osc.frequency.setValueAtTime(440, ctx.currentTime + 0.30);
            gain.gain.setValueAtTime(soundVolume * 0.4, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
            osc.start(); osc.stop(ctx.currentTime + 0.5);
          };
          playPulse();
          const interval = setInterval(playPulse, 1200);
          ringtoneCtxRef.current = { ctx, interval };
        } catch (err) {
          console.error('AudioContext ringtone fallback failed', err);
        }
      });
    } catch (err) {
      console.error('Ringtone play failed', err);
    }
  }, [soundEnabled, incomingCallSoundEnabled, soundVolume, stopRingtone]);


  const loadGlobalUnreadCount = useCallback(async () => {
    if (!user) return;
    const counts = await fetchUnreadCounts(user.id);
    const total = Object.values(counts).reduce((acc: number, curr: any) => acc + curr, 0);
    setTotalUnreadMessages(total);
  }, [user]);



  const handleStartVideoCall = async (name: string, avatar?: string, friendId?: string) => {
    setActiveVideoCall({ name, avatar, friendId, isInitiator: true });
    if (friendId && user) {
      await createNotification(friendId, user.id, 'call', `Incoming call from friend ${user.user_metadata?.full_name || 'Someone'}`);
    }
  };

  useEffect(() => {
    if (user) {
      const sub = subscribeToNotifications(user.id, async (notif) => {
        if (!notif.is_read) {
          if (notif.type === 'call') {
            // Fetch sender profile for call popup
            const { data: senderProfile } = await supabase
              .from('user_profiles')
              .select('full_name, avatar_url')
              .eq('user_id', notif.sender_id)
              .single();
            setIncomingCall({
              ...notif,
              senderName: senderProfile?.full_name || 'Someone',
              senderAvatar: senderProfile?.avatar_url || `https://ui-avatars.com/api/?name=U&background=random`,
            });
            playRingtone();
          } else {
            playNotificationSound();

            // Show toast popup for all non-call notifications
            const { data: senderProfile } = await supabase
              .from('user_profiles')
              .select('full_name, avatar_url')
              .eq('user_id', notif.sender_id)
              .single();
            const sName = senderProfile?.full_name || 'Someone';
            const sAvatar = senderProfile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(sName)}&background=random`;
            const toastMsg = notif.type === 'message'
              ? (notif.content || 'Sent you a message')
              : notif.type === 'friend_request'
                ? `${sName} wants to be your friend`
                : (notif.content || 'New notification');
            setToasts(prev => [...prev, {
              id: notif.id || `toast-${Date.now()}`,
              message: toastMsg,
              senderName: sName,
              senderAvatar: sAvatar,
              type: notif.type === 'message' ? 'message' : 'info',
              senderId: notif.sender_id,
            }]);
          }

          if (notif.type === 'message') {
            loadGlobalUnreadCount();
          }
        }
      });
      loadGlobalUnreadCount();
      return () => {
        sub.unsubscribe();
      };
    }
  }, [user, playNotificationSound, playRingtone, loadGlobalUnreadCount]);

  // Listen for notifications-read events to refresh global unread count
  useEffect(() => {
    const handler = async () => {
      if (!user) return;
      const counts = await fetchUnreadCounts(user.id);
      const total = Object.values(counts).reduce((acc, curr) => acc + curr, 0);
      setTotalUnreadMessages(total);
    };
    window.addEventListener('notifications-read', handler);
    return () => window.removeEventListener('notifications-read', handler);
  }, [user]);


  const loadUserProfile = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      if (!error && data) {
        setUserRole(data.role || 'student');
      }
    } catch (error) {
      console.error('Error loading role:', error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadUserProfile();
    }
  }, [user, loadUserProfile]);

  const handleNotificationClick = (notifOrType: any, data?: any) => {
    const notif = typeof notifOrType === 'string' ? { type: notifOrType, ...data } : notifOrType;
    if (notif.type === 'message') {
      setCurrentView('friends');
    } else if (notif.type === 'friend_request') {
      setCurrentView('friends');
    } else if (notif.type === 'call') {
      setIncomingCall(notif);
      playRingtone();
    } else if (notif.type === 'session_request') {
      // Mentor got a new booking request → go to mentor sessions
      setCurrentView(userRole === 'mentor' ? 'mentor-sessions' : 'history');
    } else if (notif.type === 'session_accepted' || notif.type === 'session_rejected' || notif.type === 'session_cancelled') {
      // Student got session update → go to session history; mentor → mentor sessions
      setCurrentView(userRole === 'mentor' ? 'mentor-sessions' : 'history');
    } else if (notif.type === 'session_completed') {
      // Handled by ReviewPopup in NotificationCenter, but if clicked normally navigate
      setCurrentView(userRole === 'mentor' ? 'mentor-sessions' : 'history');
    } else if (notif.type === 'new_review') {
      // Mentor got a review → go to mentor sessions
      setCurrentView('mentor-sessions');
    } else if (notif.type === 'group_added') {
      setCurrentView('friends');
    }
  };

  useEffect(() => {
    localStorage.setItem('grind_clock_sound_enabled', JSON.stringify(soundEnabled));
  }, [soundEnabled]);

  useEffect(() => {
    localStorage.setItem('grind_clock_sound_volume', JSON.stringify(soundVolume));
  }, [soundVolume]);

  useEffect(() => {
    localStorage.setItem('grind_clock_incoming_call_sound', JSON.stringify(incomingCallSoundEnabled));
  }, [incomingCallSoundEnabled]);

  useEffect(() => {
    localStorage.setItem('grind_clock_receive_msg_sound', JSON.stringify(receiveMsgSoundEnabled));
  }, [receiveMsgSoundEnabled]);

  useEffect(() => {
    localStorage.setItem('grind_clock_send_msg_sound', JSON.stringify(sendMsgSoundEnabled));
  }, [sendMsgSoundEnabled]);

  useEffect(() => {
    const loadData = async () => {
      try {
        // If user just logged in (transitioned from guest/null to a real user), migrate data
        if (user && user.id !== 'guest' && !isGuest) {
          await storage.migrateGuestData(user.id);
        }

        const [loadedSubjects, loadedSessions, loadedGoals] = await Promise.all([
          storage.getSubjects(),
          storage.getSessions(),
          storage.getGoals()
        ]);

        setSubjects(loadedSubjects);
        setSessions(loadedSessions);

        // Auto-complete exams that have passed
        const now = new Date();
        let goalsUpdated = false;
        const updatedGoals = loadedGoals.map(goal => {
          if (goal.isExam && goal.examDate && !goal.completed) {
            const examDateTime = new Date(goal.examDate);

            // Set exam time if available
            if (goal.examTime) {
              const [hours, minutes] = goal.examTime.split(':').map(Number);
              examDateTime.setHours(hours, minutes, 0, 0);
            } else {
              // If no time specified, consider exam done at end of day
              examDateTime.setHours(23, 59, 59, 999);
            }

            // If exam has passed, mark as completed
            if (examDateTime < now) {
              goalsUpdated = true;
              return {
                ...goal,
                completed: true,
                completedAt: examDateTime
              };
            }
          }
          return goal;
        });

        // Save updated goals if any were auto-completed
        if (goalsUpdated) {
          await storage.saveGoals(updatedGoals);
        }

        setGoals(updatedGoals);

        // Show goal reminder on app load if there are active goals
        const activeGoals = updatedGoals.filter(g => !g.completed);
        if (activeGoals.length > 0) {
          // Delay to allow UI to render first
          setTimeout(() => setShowGoalReminder(true), 1000);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    loadData();

    // Auto-hide sidebar after 5 seconds
    const sidebarTimer = setTimeout(() => {
      setIsSidebarOpen(false);
    }, 5000);

    return () => clearTimeout(sidebarTimer);
  }, []);

  // Show goal reminder when switching to dashboard
  useEffect(() => {
    if (currentView === 'dashboard' && goals.length > 0) {
      const activeGoals = goals.filter(g => !g.completed);
      if (activeGoals.length > 0) {
        // Check if we should show reminder (not too frequently)
        const lastReminderTime = localStorage.getItem('lastGoalReminderTime');
        const now = Date.now();
        const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds

        if (!lastReminderTime || now - parseInt(lastReminderTime) > oneHour) {
          setTimeout(() => setShowGoalReminder(true), 500);
          localStorage.setItem('lastGoalReminderTime', now.toString());
        }
      }
    }
  }, [currentView, goals]);

  // Timer effect - runs continuously when timer is active
  useEffect(() => {
    let interval: number | undefined;
    if (timerState.isRunning && !timerState.isPaused && timerState.startTime) {
      interval = window.setInterval(() => {
        const now = new Date();
        setTimerState(prev => ({
          ...prev,
          elapsedSeconds: Math.floor((now.getTime() - prev.startTime!.getTime()) / 1000)
        }));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerState.isRunning, timerState.isPaused, timerState.startTime]);

  const handleAddSubject = async (subject: Omit<Subject, 'id'>) => {
    const newSubject: Subject = {
      ...subject,
      id: crypto.randomUUID(),
    };
    const updated = [...subjects, newSubject];
    setSubjects(updated);
    await storage.saveSubjects(updated);
  };

  const handleUpdateSubject = async (id: string, updates: Partial<Subject>) => {
    const updated = subjects.map((s) => (s.id === id ? { ...s, ...updates } : s));
    setSubjects(updated);
    await storage.saveSubjects(updated);
  };

  const handleDeleteSubject = async (id: string) => {
    if (confirm('Delete this subject? All related sessions will remain but show as "Unknown Subject".')) {
      const updated = subjects.filter((s) => s.id !== id);
      setSubjects(updated);
      await storage.saveSubjects(updated);
    }
  };

  const handleSessionComplete = async (session: Omit<StudySession, 'id'>) => {
    const newSession: StudySession = {
      ...session,
      id: crypto.randomUUID(),
    };
    const updated = [newSession, ...sessions];
    setSessions(updated);
    await storage.saveSessions(updated);
    setShowSuccessPopper(true);
    setTimeout(() => setShowSuccessPopper(false), 4000);
  };

  const handleAddGoal = async (goal: Omit<StudyGoal, 'id'>) => {
    const newGoal: StudyGoal = {
      ...goal,
      id: crypto.randomUUID(),
    };
    const updated = [...goals, newGoal];
    setGoals(updated);
    await storage.saveGoals(updated);
  };

  const handleUpdateGoal = async (id: string, goalData: Omit<StudyGoal, 'id'>) => {
    const updated = goals.map((g) =>
      g.id === id
        ? {
          ...goalData,
          id,
          completed: g.completed, // Preserve completion status
          completedAt: g.completedAt, // Preserve completion date
        }
        : g
    );
    setGoals(updated);
    await storage.saveGoals(updated);
  };

  const handleToggleGoal = async (id: string) => {
    const updated = goals.map((g) =>
      g.id === id
        ? {
          ...g,
          completed: !g.completed,
          completedAt: !g.completed ? new Date() : undefined,
        }
        : g
    );
    setGoals(updated);
    await storage.saveGoals(updated);
  };

  const handleDeleteGoal = async (id: string) => {
    if (confirm('Delete this goal?')) {
      const updated = goals.filter((g) => g.id !== id);
      setGoals(updated);
      await storage.saveGoals(updated);
    }
  };

  // Timer handlers
  const handleTimerStart = (subjectId: string) => {
    setTimerState({
      isRunning: true,
      isPaused: false,
      selectedSubjectId: subjectId,
      startTime: new Date(),
      elapsedSeconds: 0,
      notes: '',
      focusRating: 3,
    });
  };

  const handleTimerPause = () => {
    setTimerState(prev => ({
      ...prev,
      isPaused: true,
      isRunning: true // Keep running state true, just paused
    }));
  };

  const handleTimerResume = () => {
    if (!timerState.startTime) return;

    // Calculate the time that was paused and adjust start time
    const now = new Date();
    const pausedDuration = Math.floor((now.getTime() - timerState.startTime.getTime()) / 1000) - timerState.elapsedSeconds;
    const adjustedStartTime = new Date(timerState.startTime.getTime() + (pausedDuration * 1000));

    setTimerState(prev => ({
      ...prev,
      isPaused: false,
      isRunning: true,
      startTime: adjustedStartTime
    }));
  };

  const handleTimerStop = () => {
    if (!timerState.startTime || !timerState.selectedSubjectId) return;

    const endTime = new Date();
    const durationMinutes = Math.floor(timerState.elapsedSeconds / 60);

    if (durationMinutes < 1) {
      alert('Session must be at least 1 minute long');
      return;
    }

    const session: Omit<StudySession, 'id'> = {
      subjectId: timerState.selectedSubjectId,
      startTime: timerState.startTime,
      endTime,
      durationMinutes,
      focusRating: timerState.focusRating,
      notes: timerState.notes,
      completed: true,
    };

    handleSessionComplete(session);

    // Reset timer state
    setTimerState({
      isRunning: false,
      isPaused: false,
      selectedSubjectId: '',
      startTime: null,
      elapsedSeconds: 0,
      notes: '',
      focusRating: 3,
    });
  };

  const handleTimerUpdate = (updates: Partial<TimerState>) => {
    setTimerState(prev => ({ ...prev, ...updates }));
  };



  // Save dark mode preference to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };


  // All navigation items (shown in hamburger menu)
  const allNavigation = userRole === 'mentor' ? [
    { id: 'dashboard' as View, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'mentor-sessions' as View, label: 'Sessions', icon: CalendarCheck },
    { id: 'mentor-students' as View, label: 'Students', icon: GraduationCap },
    { id: 'friends' as View, label: 'Friends', icon: Users },
    { id: 'mentor-offerings' as View, label: 'Offerings', icon: Tag },
  ] : [
    { id: 'dashboard' as View, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'timer' as View, label: 'Study Timer', icon: Clock },
    { id: 'goals' as View, label: 'Goals', icon: Target },
    { id: 'history' as View, label: 'History', icon: History },
    { id: 'subjects' as View, label: 'Subjects', icon: BookOpen },
    { id: 'mentors' as View, label: 'Mentors', icon: GraduationCap },
    { id: 'friends' as View, label: 'Friends', icon: Users },
    { id: 'analytics' as View, label: 'Analytics', icon: BarChart3 },
    { id: 'recommendations' as View, label: 'AI Insights', icon: Brain },
  ];


  return (
    <div className={`min-h-screen flex transition-colors ${isDarkMode ? 'bg-gradient-to-br from-slate-900 to-slate-800' : 'bg-gradient-to-br from-slate-50 to-slate-100'}`}>
      {/* Mobile Sidebar Backdrop */}
      {isSidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Persistent/Drawer Sidebar - Grind Menu */}
      <div className={`w-80 h-screen fixed left-0 top-0 shadow-lg z-50 transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-80'
        } ${isDarkMode ? 'bg-slate-800 border-r border-slate-700' : 'bg-white border-r border-slate-200'}`}>
        <div className="flex items-center justify-between px-6 py-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-2 rounded-xl shadow-lg">
              <Zap className="text-white" size={28} />
            </div>
            <div>
              <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Grind Clock</h2>
              <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Push Your Limits</p>
            </div>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`}
            title="Hide menu"
          >
            <X size={24} />
          </button>
        </div>


        <div className="flex-1 p-4 space-y-2 overflow-y-auto">
          {allNavigation.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentView(item.id);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all text-left ${currentView === item.id
                  ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md'
                  : isDarkMode
                    ? 'text-slate-300 hover:bg-slate-700'
                    : 'text-slate-600 hover:bg-slate-100'
                  }`}
              >
                <Icon size={20} />
                <span className="flex-1">{item.label}</span>
                {item.id === 'friends' && totalUnreadMessages > 0 && (
                  <span className={`min-w-[20px] h-5 flex items-center justify-center px-1 rounded-full text-[10px] font-bold leading-none ${currentView === item.id
                    ? 'bg-white/20 text-white'
                    : 'bg-amber-500 text-white'
                    }`}>
                    {totalUnreadMessages > 99 ? '99+' : totalUnreadMessages}
                  </span>
                )}
                {item.id === 'dashboard' && timerState.isRunning && (
                  <span className={`text-xs font-mono font-bold px-2 py-1 rounded-md ${currentView === item.id
                    ? 'bg-white/20 text-white'
                    : 'bg-amber-500/10 text-amber-500'
                    }`}>
                    {formatTime(timerState.elapsedSeconds)}
                  </span>
                )}
              </button>
            );
          })}

          {/* Settings Button */}
          <button
            onClick={() => setCurrentView('settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all text-left ${currentView === 'settings' ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md' : isDarkMode ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <SettingsIcon size={20} />
            <span className="flex-1">Settings</span>
          </button>
        </div>

      </div>

      {/* Main Content Area */}
      <div className={`flex-1 transition-all duration-300 relative h-screen flex flex-col ${isSidebarOpen ? 'lg:ml-80 ml-0' : 'ml-0'}`}>
        <Header
          isDarkMode={isDarkMode}
          setIsDarkMode={setIsDarkMode}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          currentView={currentView}
          setCurrentView={setCurrentView}
          totalUnreadMessages={totalUnreadMessages}
          onNotificationClick={handleNotificationClick}
          timerState={timerState}
          formatTime={formatTime}
          onTimerPause={handleTimerPause}
          onTimerResume={handleTimerResume}
          subjects={subjects}
          userRole={userRole}
        />

        {/* Exam Countdown Banner - Only on Dashboard for students */}
        {
          currentView === 'dashboard' && userRole !== 'mentor' && (
            <ExamCountdown
              goals={goals}
              isDarkMode={isDarkMode}
              onExamClick={() => {
                setGoalsInitialTab('exams');
                setCurrentView('goals');
              }}
            />
          )
        }

        <div className="flex-1 relative overflow-hidden flex flex-col">
          <main className={`flex-1 overflow-y-auto px-6 py-8 pb-24 ${currentView === 'friends' ? 'scrollbar-hide' : ''}`}>
            {currentView === 'dashboard' && userRole === 'mentor' && (
              <MentorDashboard isDarkMode={isDarkMode} onStartVideoCall={handleStartVideoCall} />
            )}
            {currentView === 'dashboard' && userRole !== 'mentor' && (
              <Dashboard subjects={subjects} sessions={sessions} goals={goals} isDarkMode={isDarkMode} />
            )}
            {currentView === 'subjects' && (
              <SubjectManager
                subjects={subjects}
                sessions={sessions}
                onAddSubject={handleAddSubject}
                onUpdateSubject={handleUpdateSubject}
                onDeleteSubject={handleDeleteSubject}
                isDarkMode={isDarkMode}
              />
            )}
            {currentView === 'timer' && (
              <div className="max-w-2xl mx-auto">
                <StudyTimer
                  subjects={subjects}
                  timerState={timerState}
                  onTimerStart={handleTimerStart}
                  onTimerPause={handleTimerPause}
                  onTimerResume={handleTimerResume}
                  onTimerStop={handleTimerStop}
                  onTimerUpdate={handleTimerUpdate}
                  formatTime={formatTime}
                  isDarkMode={isDarkMode}
                />
              </div>
            )}
            {currentView === 'history' && (
              <SessionHistory sessions={sessions} subjects={subjects} isDarkMode={isDarkMode} />
            )}
            {currentView === 'goals' && (
              <GoalsManager
                goals={goals}
                subjects={subjects}
                sessions={sessions}
                onAddGoal={handleAddGoal}
                onUpdateGoal={handleUpdateGoal}
                onToggleGoal={handleToggleGoal}
                onDeleteGoal={handleDeleteGoal}
                isDarkMode={isDarkMode}
                initialTab={goalsInitialTab}
              />
            )}
            {currentView === 'analytics' && (
              <AdvancedAnalytics
                sessions={sessions}
                subjects={subjects}
                isDarkMode={isDarkMode}
              />
            )}
            {currentView === 'recommendations' && (
              <AIRecommendations
                sessions={sessions}
                subjects={subjects}
                isDarkMode={isDarkMode}
              />
            )}
            {currentView === 'techniques' && (
              <StudyTechniques
                subjects={subjects}
                sessions={sessions}
                isDarkMode={isDarkMode}
              />
            )}
            {currentView === 'mentors' && (
              <MentorConnect isDarkMode={isDarkMode} onStartVideoCall={handleStartVideoCall} onStartChat={() => { }} />
            )}
            {currentView === 'friends' && (
              <FriendsCircle
                isDarkMode={isDarkMode}
                onStartVideoCall={handleStartVideoCall}
                userRole={userRole}
              />
            )}
            {currentView === 'mentor-sessions' && (
              <MentorSessionsPage isDarkMode={isDarkMode} onStartVideoCall={handleStartVideoCall} />
            )}
            {currentView === 'mentor-students' && (
              <MentorStudentsPage isDarkMode={isDarkMode} onStartVideoCall={handleStartVideoCall} />
            )}
            {currentView === 'mentor-offerings' && (
              <MentorOfferingsPage isDarkMode={isDarkMode} />
            )}
            {currentView === 'settings' && (
              <Settings
                isDarkMode={isDarkMode}
                onClose={() => setCurrentView('dashboard')}
                soundEnabled={soundEnabled}
                setSoundEnabled={setSoundEnabled}
                soundVolume={soundVolume}
                setSoundVolume={setSoundVolume}
                incomingCallSoundEnabled={incomingCallSoundEnabled}
                setIncomingCallSoundEnabled={setIncomingCallSoundEnabled}
                receiveMsgSoundEnabled={receiveMsgSoundEnabled}
                setReceiveMsgSoundEnabled={setReceiveMsgSoundEnabled}
                sendMsgSoundEnabled={sendMsgSoundEnabled}
                setSendMsgSoundEnabled={setSendMsgSoundEnabled}
              />
            )}
          </main>

          {
            showSuccessPopper && (
              <div className="fixed top-20 right-6 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-4 rounded-xl shadow-2xl animate-bounce z-50 max-w-sm">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2 rounded-lg">
                    <Zap className="text-white" size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Session Complete!</h3>
                    <p className="text-sm text-green-50">Great work! Keep grinding!</p>
                  </div>
                </div>
              </div>
            )
          }

          <Reminder goals={goals} isDarkMode={isDarkMode} />

          {/* Goal Reminder Popup */}
          {
            showGoalReminder && (
              <GoalReminderPopup
                goals={goals}
                subjects={subjects}
                isDarkMode={isDarkMode}
                onClose={() => setShowGoalReminder(false)}
              />
            )
          }

        </div >

        <footer className={`fixed bottom-0 right-0 border-t transition-all duration-300 z-20 ${isSidebarOpen ? 'left-80' : 'left-0'
          } ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
          <div className="w-full px-6 py-3">
            <div className="flex flex-col md:flex-row items-center justify-between gap-2">
              <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                © 2025 Grind Clock. Push your limits every day.
              </p>
              <div className={`flex items-center gap-2 text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                <Zap size={14} />
                <span>Powered by dedication</span>
              </div>
            </div>
          </div>
        </footer>


        {/* Video Call Overlay */}
        {
          activeVideoCall && (
            <VideoCall
              participantName={activeVideoCall.name}
              participantAvatar={activeVideoCall.avatar}
              isDarkMode={isDarkMode}
              onClose={() => setActiveVideoCall(null)}
              currentUserId={user?.id || ''}
              callId={activeVideoCall.friendId && user ? [user.id, activeVideoCall.friendId].sort().join('-') : ''}
              participantId={activeVideoCall.friendId || ''}
              isInitiator={!!activeVideoCall.isInitiator}
            />
          )
        }

        {/* AI Chatbot */}
        <AIChatbot isDarkMode={isDarkMode} />
      </div >

      {/* Incoming Call Modal */}
      {
        incomingCall && (
          <IncomingCallModal
            incomingCall={incomingCall}
            isDarkMode={isDarkMode}
            onAccept={() => {
              stopRingtone();
              setActiveVideoCall({
                name: incomingCall.senderName,
                avatar: incomingCall.senderAvatar,
                friendId: incomingCall.sender_id
              });
              setIncomingCall(null);
            }}
            onReject={async () => {
              stopRingtone();
              // Send missed call notification to caller
              if (user && incomingCall.sender_id) {
                try {
                  await createNotification(
                    incomingCall.sender_id,
                    user.id,
                    'call_ended',
                    `📞 Missed call from ${user.user_metadata?.full_name || 'User'}`
                  );
                } catch (err) {
                  console.error('Failed to create notification during call rejection', err);
                }
              }
              setIncomingCall(null);
            }}
          />
        )
      }

      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map(toast => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastNotification
              message={toast.message}
              type={toast.type}
              duration={4000}
              onClose={() => removeToast(toast.id)}
              senderName={toast.senderName}
              avatarUrl={toast.senderAvatar}
              action={toast.type === 'message' ? {
                label: 'Open Chat',
                onClick: () => {
                  setCurrentView('friends');
                  removeToast(toast.id);
                }
              } : undefined}
            />
          </div>
        ))}
      </div>
    </div >
  );
}

/* ─── Incoming Call Modal with 30s auto-timeout ─── */
function IncomingCallModal({ incomingCall, isDarkMode, onAccept, onReject }: {
  incomingCall: { caller_id?: string; sender_id?: string; senderName?: string; senderAvatar?: string; content?: string;[key: string]: unknown };
  isDarkMode: boolean;
  onAccept: () => void;
  onReject: () => void;
}) {
  const [countdown, setCountdown] = useState(30);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          onReject(); // auto-reject & send missed call
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [onReject]);

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
      <div className={`w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="p-8 text-center">
          <div className="relative inline-block mb-6">
            <div className="absolute inset-0 bg-amber-500 rounded-full animate-ping opacity-20"></div>
            <img
              src={incomingCall.senderAvatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix'}
              alt=""
              className="w-24 h-24 rounded-full border-4 border-amber-500 relative z-10"
            />
            <div className="absolute -bottom-2 -right-2 bg-amber-500 p-2 rounded-full border-4 border-slate-900 z-20">
              <Phone size={20} className="text-white animate-pulse" />
            </div>
          </div>

          <h2 className={`text-2xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            {incomingCall.senderName || 'Someone'}
          </h2>
          <p className="text-amber-500 font-medium animate-pulse mb-2">
            Incoming Video Call...
          </p>
          {/* Countdown ring timer */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="relative w-10 h-10">
              <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="16" fill="none" stroke={isDarkMode ? '#334155' : '#e2e8f0'} strokeWidth="2" />
                <circle cx="18" cy="18" r="16" fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray={`${(countdown / 30) * 100.53} 100.53`} strokeLinecap="round" className="transition-all duration-1000" />
              </svg>
              <span className={`absolute inset-0 flex items-center justify-center text-xs font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{countdown}</span>
            </div>
            <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>seconds remaining</span>
          </div>

          <div className="flex gap-4">
            <button
              onClick={onAccept}
              className="flex-1 flex items-center justify-center gap-2 py-4 bg-green-500 hover:bg-green-600 text-white rounded-2xl font-bold transition-all shadow-lg shadow-green-500/20"
            >
              <Phone size={20} />
              Pickup
            </button>
            <button
              onClick={onReject}
              className="flex-1 flex items-center justify-center gap-2 py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-bold transition-all shadow-lg shadow-red-500/20"
            >
              <PhoneOff size={20} />
              Decline
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <ProtectedRoute>
      <AppContent />
    </ProtectedRoute>
  );
}

export default App;
