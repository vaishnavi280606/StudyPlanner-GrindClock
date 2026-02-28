import { Calendar, Clock, Brain, FileText } from 'lucide-react';
import { StudySession, Subject } from '../types';

interface SessionHistoryProps {
  sessions: StudySession[];
  subjects: Subject[];
  isDarkMode: boolean;
}

export function SessionHistory({ sessions, subjects, isDarkMode }: SessionHistoryProps) {
  const sortedSessions = [...sessions]
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
    .slice(0, 20);

  const getSubjectName = (subjectId: string) => {
    return subjects.find((s) => s.id === subjectId)?.name || 'Uncategorized Session';
  };

  const getSubjectColor = (subjectId: string) => {
    return subjects.find((s) => s.id === subjectId)?.color || '#6b7280';
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-4">
      <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Session History</h2>

      {sortedSessions.length === 0 ? (
        <div className={`rounded-xl p-12 shadow-md border text-center ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
          <Calendar className={`mx-auto mb-4 ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`} size={48} />
          <p className={`${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>No grind sessions yet. Start your first session!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedSessions.map((session) => (
            <div
              key={session.id}
              className={`rounded-xl p-6 shadow-md border hover:shadow-lg transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div
                    className="w-4 h-4 rounded-full flex-shrink-0 mt-1"
                    style={{ backgroundColor: getSubjectColor(session.subjectId) }}
                  />
                  <div>
                    <h3 className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      {getSubjectName(session.subjectId)}
                    </h3>
                    <div className={`flex flex-wrap items-center gap-2 text-sm mt-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                      <Calendar size={14} />
                      <span>{formatDate(session.startTime)}</span>
                      <span className="hidden sm:inline">•</span>
                      <span>{formatTime(session.startTime)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 border-t sm:border-t-0 pt-3 sm:pt-0">
                  <div className={`flex items-center gap-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    <Clock size={16} />
                    <span className="text-sm font-medium">
                      {session.durationMinutes}m
                    </span>
                  </div>
                  {session.focusRating && (
                    <div className={`flex items-center gap-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                      <Brain size={16} />
                      <span className="text-sm font-medium">{session.focusRating}/5</span>
                    </div>
                  )}
                </div>
              </div>

              {session.notes && (
                <div className={`mt-3 pt-3 border-t ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                  <div className={`flex items-start gap-2 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    <FileText size={16} className="flex-shrink-0 mt-0.5" />
                    <p>{session.notes}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
