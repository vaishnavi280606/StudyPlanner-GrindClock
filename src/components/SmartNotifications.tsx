import { useState, useEffect } from 'react';
import { Bell, BellOff, Clock, Target, Flame, Settings } from 'lucide-react';
import { Subject, StudySession, StudyGoal } from '../types';

interface SmartNotificationsProps {
  subjects: Subject[];
  sessions: StudySession[];
  goals: StudyGoal[];
  isDarkMode: boolean;
}

interface NotificationSettings {
  enabled: boolean;
  studyReminders: boolean;
  goalDeadlines: boolean;
  streakReminders: boolean;
  breakReminders: boolean;
  dailyTargetReminders: boolean;
  reminderTime: string;
  breakInterval: number; // minutes
}

interface NotificationData {
  id: string;
  title: string;
  message: string;
  type: 'reminder' | 'goal' | 'streak' | 'break' | 'target';
  scheduledFor: Date;
  sent: boolean;
}

export function SmartNotifications({ subjects, sessions, goals, isDarkMode }: SmartNotificationsProps) {
  const [settings, setSettings] = useState<NotificationSettings>({
    enabled: false,
    studyReminders: true,
    goalDeadlines: true,
    streakReminders: true,
    breakReminders: true,
    dailyTargetReminders: true,
    reminderTime: '09:00',
    breakInterval: 25
  });
  const [showSettings, setShowSettings] = useState(false);
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    // Load settings from localStorage
    const stored = localStorage.getItem('grind_clock_notification_settings');
    if (stored) {
      setSettings(JSON.parse(stored));
    }

    // Check notification permission
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    // Save settings to localStorage
    localStorage.setItem('grind_clock_notification_settings', JSON.stringify(settings));
    
    if (settings.enabled) {
      scheduleNotifications();
    }
  }, [settings, subjects, sessions, goals]);

  const requestPermission = async () => {
    if ('Notification' in window) {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === 'granted') {
        setSettings(prev => ({ ...prev, enabled: true }));
      }
    }
  };

  const scheduleNotifications = () => {
    const newNotifications: NotificationData[] = [];
    const now = new Date();

    // Daily study reminders
    if (settings.studyReminders) {
      const today = new Date();
      const [hours, minutes] = settings.reminderTime.split(':').map(Number);
      const reminderTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes);
      
      if (reminderTime > now) {
        const todaySessions = sessions.filter(s => 
          s.startTime.toDateString() === today.toDateString()
        );
        
        if (todaySessions.length === 0) {
          newNotifications.push({
            id: `daily-reminder-${today.toDateString()}`,
            title: '📚 Time to Study!',
            message: 'Start your daily study session to maintain your streak.',
            type: 'reminder',
            scheduledFor: reminderTime,
            sent: false
          });
        }
      }
    }

    // Goal deadline reminders
    if (settings.goalDeadlines) {
      goals.forEach(goal => {
        if (goal.targetDate && !goal.completed) {
          const daysUntilDeadline = Math.ceil(
            (goal.targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          );
          
          if (daysUntilDeadline <= 3 && daysUntilDeadline > 0) {
            newNotifications.push({
              id: `goal-deadline-${goal.id}`,
              title: '🎯 Goal Deadline Approaching',
              message: `"${goal.title}" is due in ${daysUntilDeadline} day${daysUntilDeadline > 1 ? 's' : ''}!`,
              type: 'goal',
              scheduledFor: new Date(now.getTime() + 5000), // 5 seconds from now for immediate notification
              sent: false
            });
          }
        }
        
        if (goal.examDate) {
          const daysUntilExam = Math.ceil(
            (goal.examDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          );
          
          if ([7, 3, 1].includes(daysUntilExam)) {
            newNotifications.push({
              id: `exam-reminder-${goal.id}-${daysUntilExam}`,
              title: '🎓 Exam Reminder',
              message: `${goal.title} exam is in ${daysUntilExam} day${daysUntilExam > 1 ? 's' : ''}!`,
              type: 'goal',
              scheduledFor: new Date(now.getTime() + 5000),
              sent: false
            });
          }
        }
      });
    }

    // Streak reminders
    if (settings.streakReminders) {
      const currentStreak = calculateStreak(sessions);
      const today = new Date();
      const todaySessions = sessions.filter(s => 
        s.startTime.toDateString() === today.toDateString()
      );
      
      if (currentStreak > 0 && todaySessions.length === 0) {
        const reminderTime = new Date();
        reminderTime.setHours(20, 0, 0, 0); // 8 PM reminder
        
        if (reminderTime > now) {
          newNotifications.push({
            id: `streak-reminder-${today.toDateString()}`,
            title: '🔥 Don\'t Break Your Streak!',
            message: `You have a ${currentStreak}-day streak. Study today to keep it going!`,
            type: 'streak',
            scheduledFor: reminderTime,
            sent: false
          });
        }
      }
    }

    // Daily target reminders
    if (settings.dailyTargetReminders) {
      const totalDailyTarget = subjects.reduce((sum, subject) => 
        sum + (subject.targetHoursPerDay || 0), 0
      );
      
      if (totalDailyTarget > 0) {
        const today = new Date();
        const todaySessions = sessions.filter(s => 
          s.startTime.toDateString() === today.toDateString()
        );
        const todayMinutes = todaySessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
        const todayHours = todayMinutes / 60;
        
        if (todayHours < totalDailyTarget * 0.5) { // Less than 50% of target
          const reminderTime = new Date();
          reminderTime.setHours(18, 0, 0, 0); // 6 PM reminder
          
          if (reminderTime > now) {
            newNotifications.push({
              id: `target-reminder-${today.toDateString()}`,
              title: '📊 Daily Target Check',
              message: `You're ${Math.round((totalDailyTarget - todayHours) * 10) / 10}h behind your daily target. Time to catch up!`,
              type: 'target',
              scheduledFor: reminderTime,
              sent: false
            });
          }
        }
      }
    }

    setNotifications(newNotifications);
    
    // Schedule actual browser notifications
    newNotifications.forEach(notification => {
      const timeUntilNotification = notification.scheduledFor.getTime() - now.getTime();
      if (timeUntilNotification > 0) {
        setTimeout(() => {
          if (settings.enabled && permission === 'granted') {
            new Notification(notification.title, {
              body: notification.message,
              icon: '/favicon.ico',
              badge: '/favicon.ico'
            });
          }
        }, timeUntilNotification);
      }
    });
  };

  const calculateStreak = (sessions: StudySession[]): number => {
    if (sessions.length === 0) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const sessionDates = new Set(
      sessions.map(s => {
        const date = new Date(s.startTime);
        date.setHours(0, 0, 0, 0);
        return date.getTime();
      })
    );

    let streak = 0;
    let currentDate = new Date(today);

    if (!sessionDates.has(currentDate.getTime())) {
      currentDate.setDate(currentDate.getDate() - 1);
      if (!sessionDates.has(currentDate.getTime())) {
        return 0;
      }
    }

    while (sessionDates.has(currentDate.getTime())) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    }

    return streak;
  };

  return (
    <div className={`rounded-xl p-6 shadow-md border transition-colors ${
      isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
    }`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {settings.enabled ? (
            <Bell className={`${isDarkMode ? 'text-green-400' : 'text-green-600'}`} size={24} />
          ) : (
            <BellOff className={`${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} size={24} />
          )}
          <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            Smart Notifications
          </h3>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`p-2 rounded-lg transition-colors ${
            isDarkMode ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-600'
          }`}
        >
          <Settings size={20} />
        </button>
      </div>

      {permission === 'default' && (
        <div className={`p-4 rounded-lg border mb-4 ${
          isDarkMode 
            ? 'bg-blue-900/20 border-blue-700 text-blue-200' 
            : 'bg-blue-50 border-blue-200 text-blue-800'
        }`}>
          <p className="mb-3">Enable notifications to get smart study reminders!</p>
          <button
            onClick={requestPermission}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Enable Notifications
          </button>
        </div>
      )}

      {permission === 'denied' && (
        <div className={`p-4 rounded-lg border mb-4 ${
          isDarkMode 
            ? 'bg-red-900/20 border-red-700 text-red-200' 
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <p>Notifications are blocked. Please enable them in your browser settings to receive study reminders.</p>
        </div>
      )}

      {showSettings && (
        <div className={`p-4 rounded-lg border mb-4 ${
          isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-200'
        }`}>
          <h4 className={`font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            Notification Settings
          </h4>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>
                Enable Notifications
              </span>
              <button
                onClick={() => setSettings(prev => ({ ...prev, enabled: !prev.enabled }))}
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.enabled ? 'bg-green-500' : isDarkMode ? 'bg-slate-600' : 'bg-slate-300'
                }`}
                disabled={permission !== 'granted'}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  settings.enabled ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <span className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>
                Daily Study Reminders
              </span>
              <button
                onClick={() => setSettings(prev => ({ ...prev, studyReminders: !prev.studyReminders }))}
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.studyReminders ? 'bg-green-500' : isDarkMode ? 'bg-slate-600' : 'bg-slate-300'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  settings.studyReminders ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <span className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>
                Goal Deadline Alerts
              </span>
              <button
                onClick={() => setSettings(prev => ({ ...prev, goalDeadlines: !prev.goalDeadlines }))}
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.goalDeadlines ? 'bg-green-500' : isDarkMode ? 'bg-slate-600' : 'bg-slate-300'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  settings.goalDeadlines ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <span className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>
                Streak Reminders
              </span>
              <button
                onClick={() => setSettings(prev => ({ ...prev, streakReminders: !prev.streakReminders }))}
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.streakReminders ? 'bg-green-500' : isDarkMode ? 'bg-slate-600' : 'bg-slate-300'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  settings.streakReminders ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <span className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>
                Daily Target Reminders
              </span>
              <button
                onClick={() => setSettings(prev => ({ ...prev, dailyTargetReminders: !prev.dailyTargetReminders }))}
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.dailyTargetReminders ? 'bg-green-500' : isDarkMode ? 'bg-slate-600' : 'bg-slate-300'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  settings.dailyTargetReminders ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <label className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>
                Daily Reminder Time
              </label>
              <input
                type="time"
                value={settings.reminderTime}
                onChange={(e) => setSettings(prev => ({ ...prev, reminderTime: e.target.value }))}
                className={`px-3 py-1 rounded border ${
                  isDarkMode 
                    ? 'bg-slate-600 border-slate-500 text-white' 
                    : 'bg-white border-slate-300 text-slate-900'
                }`}
              />
            </div>
          </div>
        </div>
      )}

      {/* Upcoming Notifications */}
      <div>
        <h4 className={`font-semibold mb-3 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
          Upcoming Reminders
        </h4>
        
        {notifications.length === 0 ? (
          <p className={`text-center py-4 ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
            {settings.enabled ? 'No upcoming reminders' : 'Enable notifications to see reminders'}
          </p>
        ) : (
          <div className="space-y-2">
            {notifications.slice(0, 5).map(notification => (
              <div
                key={notification.id}
                className={`flex items-center gap-3 p-3 rounded-lg ${
                  isDarkMode ? 'bg-slate-700' : 'bg-slate-50'
                }`}
              >
                <div className={`p-2 rounded-full ${
                  notification.type === 'reminder' ? 'bg-blue-500/20 text-blue-500' :
                  notification.type === 'goal' ? 'bg-red-500/20 text-red-500' :
                  notification.type === 'streak' ? 'bg-orange-500/20 text-orange-500' :
                  'bg-green-500/20 text-green-500'
                }`}>
                  {notification.type === 'reminder' ? <Clock size={16} /> :
                   notification.type === 'goal' ? <Target size={16} /> :
                   notification.type === 'streak' ? <Flame size={16} /> :
                   <Bell size={16} />}
                </div>
                <div className="flex-1">
                  <div className={`font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    {notification.title}
                  </div>
                  <div className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    {notification.message}
                  </div>
                </div>
                <div className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                  {notification.scheduledFor.toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}