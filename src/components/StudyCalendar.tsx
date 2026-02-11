import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Clock, Target } from 'lucide-react';
import { Subject, StudySession, StudyGoal } from '../types';

interface StudyCalendarProps {
  subjects: Subject[];
  sessions: StudySession[];
  goals: StudyGoal[];
  isDarkMode: boolean;
  onScheduleSession?: (date: Date, subjectId: string, duration: number) => void;
}

interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  duration: number;
  type: 'session' | 'goal' | 'scheduled';
  subjectId?: string;
  color: string;
}

interface ScheduledSession {
  id: string;
  date: Date;
  subjectId: string;
  duration: number;
  title: string;
}

export function StudyCalendar({ subjects, sessions, goals, isDarkMode, onScheduleSession }: StudyCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [scheduledSessions, setScheduledSessions] = useState<ScheduledSession[]>([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  useEffect(() => {
    // Load scheduled sessions from localStorage
    const stored = localStorage.getItem('grind_clock_scheduled_sessions');
    if (stored) {
      const parsed = JSON.parse(stored);
      setScheduledSessions(parsed.map((s: any) => ({
        ...s,
        date: new Date(s.date)
      })));
    }
  }, []);

  const saveScheduledSessions = (sessions: ScheduledSession[]) => {
    setScheduledSessions(sessions);
    localStorage.setItem('grind_clock_scheduled_sessions', JSON.stringify(sessions));
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const getEventsForDate = (date: Date): CalendarEvent[] => {
    const events: CalendarEvent[] = [];
    const dateStr = date.toDateString();

    // Add completed sessions
    sessions.forEach(session => {
      if (session.startTime.toDateString() === dateStr) {
        const subject = subjects.find(s => s.id === session.subjectId);
        events.push({
          id: session.id,
          title: `${subject?.name || 'Unknown'} (${session.durationMinutes}m)`,
          date: session.startTime,
          duration: session.durationMinutes || 0,
          type: 'session',
          subjectId: session.subjectId,
          color: subject?.color || '#6b7280'
        });
      }
    });

    // Add goal deadlines
    goals.forEach(goal => {
      if (goal.targetDate && goal.targetDate.toDateString() === dateStr && !goal.completed) {
        events.push({
          id: goal.id,
          title: `📋 ${goal.title}`,
          date: goal.targetDate,
          duration: 0,
          type: 'goal',
          color: '#ef4444'
        });
      }
      
      if (goal.examDate && goal.examDate.toDateString() === dateStr) {
        events.push({
          id: `${goal.id}-exam`,
          title: `🎓 ${goal.title}`,
          date: goal.examDate,
          duration: 0,
          type: 'goal',
          color: '#8b5cf6'
        });
      }
    });

    // Add scheduled sessions
    scheduledSessions.forEach(scheduled => {
      if (scheduled.date.toDateString() === dateStr) {
        const subject = subjects.find(s => s.id === scheduled.subjectId);
        events.push({
          id: scheduled.id,
          title: `📅 ${scheduled.title}`,
          date: scheduled.date,
          duration: scheduled.duration,
          type: 'scheduled',
          subjectId: scheduled.subjectId,
          color: subject?.color || '#6b7280'
        });
      }
    });

    return events.sort((a, b) => a.date.getTime() - b.date.getTime());
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const days = getDaysInMonth(currentDate);
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className={`rounded-xl p-6 shadow-md border transition-colors ${
      isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
    }`}>
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
          Study Calendar
        </h3>
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigateMonth('prev')}
            className={`p-2 rounded-lg transition-colors ${
              isDarkMode ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-600'
            }`}
          >
            <ChevronLeft size={20} />
          </button>
          <h4 className={`text-lg font-semibold min-w-[200px] text-center ${
            isDarkMode ? 'text-white' : 'text-slate-900'
          }`}>
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h4>
          <button
            onClick={() => navigateMonth('next')}
            className={`p-2 rounded-lg transition-colors ${
              isDarkMode ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-600'
            }`}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Day Names */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map(day => (
          <div
            key={day}
            className={`text-center text-sm font-medium py-2 ${
              isDarkMode ? 'text-slate-400' : 'text-slate-600'
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((date, index) => {
          if (!date) {
            return <div key={index} className="h-24" />;
          }

          const events = getEventsForDate(date);
          const isSelected = selectedDate?.toDateString() === date.toDateString();

          return (
            <div
              key={date.toDateString()}
              onClick={() => setSelectedDate(date)}
              className={`h-24 p-1 border rounded-lg cursor-pointer transition-all ${
                isToday(date)
                  ? isDarkMode
                    ? 'bg-amber-900/30 border-amber-600'
                    : 'bg-amber-50 border-amber-300'
                  : isSelected
                  ? isDarkMode
                    ? 'bg-blue-900/30 border-blue-600'
                    : 'bg-blue-50 border-blue-300'
                  : isDarkMode
                  ? 'bg-slate-700 border-slate-600 hover:bg-slate-600'
                  : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className={`text-sm font-medium mb-1 ${
                isToday(date)
                  ? 'text-amber-600'
                  : isDarkMode ? 'text-white' : 'text-slate-900'
              }`}>
                {date.getDate()}
              </div>
              
              <div className="space-y-1 overflow-hidden">
                {events.slice(0, 2).map(event => (
                  <div
                    key={event.id}
                    className="text-xs px-1 py-0.5 rounded truncate"
                    style={{ backgroundColor: event.color + '20', color: event.color }}
                    title={event.title}
                  >
                    {event.title}
                  </div>
                ))}
                {events.length > 2 && (
                  <div className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    +{events.length - 2} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Date Details */}
      {selectedDate && (
        <div className={`mt-6 p-4 rounded-lg border ${
          isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <h4 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              {selectedDate.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </h4>
            <button
              onClick={() => setShowScheduleModal(true)}
              className="flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg hover:from-amber-600 hover:to-orange-700 transition-colors text-sm"
            >
              <Plus size={16} />
              Schedule
            </button>
          </div>

          <div className="space-y-2">
            {getEventsForDate(selectedDate).map(event => (
              <div
                key={event.id}
                className={`flex items-center gap-3 p-2 rounded ${
                  isDarkMode ? 'bg-slate-600' : 'bg-white'
                }`}
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: event.color }}
                />
                <div className="flex-1">
                  <div className={`font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    {event.title}
                  </div>
                  {event.duration > 0 && (
                    <div className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                      {event.duration} minutes
                    </div>
                  )}
                </div>
                <div className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  {event.type === 'session' ? '✓ Completed' : 
                   event.type === 'goal' ? '🎯 Deadline' : '📅 Scheduled'}
                </div>
              </div>
            ))}
            
            {getEventsForDate(selectedDate).length === 0 && (
              <div className={`text-center py-4 ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                No events scheduled for this day
              </div>
            )}
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {showScheduleModal && selectedDate && (
        <ScheduleModal
          date={selectedDate}
          subjects={subjects}
          isDarkMode={isDarkMode}
          onClose={() => setShowScheduleModal(false)}
          onSchedule={(subjectId, duration, title) => {
            const newSession: ScheduledSession = {
              id: crypto.randomUUID(),
              date: selectedDate,
              subjectId,
              duration,
              title
            };
            saveScheduledSessions([...scheduledSessions, newSession]);
            setShowScheduleModal(false);
          }}
        />
      )}
    </div>
  );
}

interface ScheduleModalProps {
  date: Date;
  subjects: Subject[];
  isDarkMode: boolean;
  onClose: () => void;
  onSchedule: (subjectId: string, duration: number, title: string) => void;
}

function ScheduleModal({ date, subjects, isDarkMode, onClose, onSchedule }: ScheduleModalProps) {
  const [selectedSubject, setSelectedSubject] = useState('');
  const [duration, setDuration] = useState(25);
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('09:00');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSubject && title) {
      onSchedule(selectedSubject, duration, title);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`rounded-xl p-6 max-w-md w-full ${
        isDarkMode ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200'
      }`}>
        <h3 className={`text-lg font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
          Schedule Study Session
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              Subject
            </label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border ${
                isDarkMode 
                  ? 'bg-slate-700 border-slate-600 text-white' 
                  : 'bg-white border-slate-300 text-slate-900'
              }`}
              required
            >
              <option value="">Select a subject</option>
              {subjects.map(subject => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              Session Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Chapter 5 Review"
              className={`w-full px-3 py-2 rounded-lg border ${
                isDarkMode 
                  ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' 
                  : 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'
              }`}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Duration (minutes)
              </label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value))}
                min="5"
                max="480"
                className={`w-full px-3 py-2 rounded-lg border ${
                  isDarkMode 
                    ? 'bg-slate-700 border-slate-600 text-white' 
                    : 'bg-white border-slate-300 text-slate-900'
                }`}
                required
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Time
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border ${
                  isDarkMode 
                    ? 'bg-slate-700 border-slate-600 text-white' 
                    : 'bg-white border-slate-300 text-slate-900'
                }`}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 px-4 py-2 rounded-lg border transition-colors ${
                isDarkMode 
                  ? 'border-slate-600 text-slate-300 hover:bg-slate-700' 
                  : 'border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg hover:from-amber-600 hover:to-orange-700 transition-colors"
            >
              Schedule
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}