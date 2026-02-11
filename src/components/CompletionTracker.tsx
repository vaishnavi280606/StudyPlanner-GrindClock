import { useState, useMemo } from 'react';
import { Calendar, TrendingUp, Filter, Target, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { StudyGoal, Subject, StudySession } from '../types';

interface CompletionTrackerProps {
  goals: StudyGoal[];
  subjects: Subject[];
  sessions: StudySession[];
  isDarkMode: boolean;
}

interface DailyCompletion {
  date: string;
  displayDate: string;
  totalGoals: number;
  completedGoals: number;
  totalExams: number;
  completedExams: number;
  completionRate: number;
  studyHours: number;
}

export function CompletionTracker({ goals, subjects, sessions, isDarkMode }: CompletionTrackerProps) {
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'goals' | 'exams' | string>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'all'>('week');

  // Calculate daily completion data
  const dailyCompletions = useMemo(() => {
    const now = new Date();
    const days: DailyCompletion[] = [];
    
    // Determine date range
    const daysToShow = timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 90;
    
    for (let i = daysToShow - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      // Filter goals based on selected filters
      let filteredGoals = goals;
      
      if (selectedSubject !== 'all') {
        filteredGoals = filteredGoals.filter(g => g.subjectId === selectedSubject);
      }
      
      if (selectedFilter === 'goals') {
        filteredGoals = filteredGoals.filter(g => !g.isExam);
      } else if (selectedFilter === 'exams') {
        filteredGoals = filteredGoals.filter(g => g.isExam);
      }
      
      // Goals completed on this day
      const completedOnDay = filteredGoals.filter(g => 
        g.completed && g.completedAt && 
        new Date(g.completedAt).toISOString().split('T')[0] === dateStr
      );
      
      // Goals that were active on this day (created before or on this day, not completed before this day)
      const activeOnDay = filteredGoals.filter(g => {
        const createdDate = g.targetDate ? new Date(g.targetDate) : new Date();
        const completedDate = g.completedAt ? new Date(g.completedAt) : null;
        
        return createdDate <= date && (!completedDate || completedDate >= date);
      });
      
      // Study hours for this day
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);
      
      const dayStudyMinutes = sessions
        .filter(session => {
          const sessionDate = new Date(session.startTime);
          const matchesSubject = selectedSubject === 'all' || session.subjectId === selectedSubject;
          return session.completed && 
                 sessionDate >= dayStart && 
                 sessionDate <= dayEnd && 
                 matchesSubject;
        })
        .reduce((total, session) => total + (session.durationMinutes || 0), 0);
      
      const studyHours = Math.round(dayStudyMinutes / 60 * 10) / 10;
      
      // Separate goals and exams
      const regularGoals = activeOnDay.filter(g => !g.isExam);
      const examGoals = activeOnDay.filter(g => g.isExam);
      const completedRegular = completedOnDay.filter(g => !g.isExam);
      const completedExams = completedOnDay.filter(g => g.isExam);
      
      const totalItems = activeOnDay.length;
      const completedItems = completedOnDay.length;
      const completionRate = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
      
      days.push({
        date: dateStr,
        displayDate: date.toLocaleDateString('en-US', { 
          weekday: 'short', 
          month: 'short', 
          day: 'numeric' 
        }),
        totalGoals: regularGoals.length,
        completedGoals: completedRegular.length,
        totalExams: examGoals.length,
        completedExams: completedExams.length,
        completionRate,
        studyHours,
      });
    }
    
    return days.reverse(); // Show most recent first
  }, [goals, sessions, selectedFilter, selectedSubject, timeRange]);

  const averageCompletionRate = useMemo(() => {
    const validDays = dailyCompletions.filter(day => day.totalGoals + day.totalExams > 0);
    if (validDays.length === 0) return 0;
    
    const totalRate = validDays.reduce((sum, day) => sum + day.completionRate, 0);
    return Math.round(totalRate / validDays.length);
  }, [dailyCompletions]);

  const totalStudyHours = useMemo(() => {
    return dailyCompletions.reduce((sum, day) => sum + day.studyHours, 0);
  }, [dailyCompletions]);

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            Completion Tracker
          </h2>
          <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            Track your daily progress and completion rates
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className={`text-center px-4 py-2 rounded-lg ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
            <div className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              {averageCompletionRate}%
            </div>
            <div className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Avg Rate
            </div>
          </div>
          <div className={`text-center px-4 py-2 rounded-lg ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
            <div className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              {totalStudyHours}h
            </div>
            <div className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Study Time
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className={`rounded-xl p-4 border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Filter className="text-amber-500" size={20} />
            <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Filters
            </span>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-1 rounded transition-colors ${
              isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'
            }`}
          >
            {showFilters ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {/* Time Range */}
          <div className="flex gap-1">
            {(['week', 'month', 'all'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                  timeRange === range
                    ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white'
                    : isDarkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {range === 'week' ? '7 Days' : range === 'month' ? '30 Days' : '90 Days'}
              </button>
            ))}
          </div>

          {/* Type Filter */}
          <div className="flex gap-1">
            {(['all', 'goals', 'exams'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setSelectedFilter(filter)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                  selectedFilter === filter
                    ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white'
                    : isDarkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {filter === 'all' ? 'All' : filter === 'goals' ? 'Goals' : 'Exams'}
              </button>
            ))}
          </div>
        </div>

        {showFilters && (
          <div className="space-y-3">
            {/* Subject Filter */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Filter by Subject
              </label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent ${
                  isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'border-slate-300'
                }`}
              >
                <option value="all">All Subjects</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Daily Completion Chart */}
      <div className={`rounded-xl p-6 border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
          Daily Completion Rates
        </h3>
        
        {dailyCompletions.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className={`mx-auto mb-4 ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`} size={48} />
            <p className={`${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              No data available for the selected filters
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {dailyCompletions.map((day, index) => (
              <div
                key={day.date}
                className={`p-4 rounded-lg border transition-all hover:shadow-md ${
                  isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      {day.displayDate}
                    </span>
                    {day.studyHours > 0 && (
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        isDarkMode ? 'bg-amber-900 text-amber-200' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {day.studyHours}h studied
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    {selectedFilter !== 'exams' && (
                      <div className="text-center">
                        <div className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          {day.completedGoals}/{day.totalGoals}
                        </div>
                        <div className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                          Goals
                        </div>
                      </div>
                    )}
                    {selectedFilter !== 'goals' && (
                      <div className="text-center">
                        <div className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          {day.completedExams}/{day.totalExams}
                        </div>
                        <div className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                          Exams
                        </div>
                      </div>
                    )}
                    <div className={`text-lg font-bold ${
                      day.completionRate >= 80 ? 'text-green-500' :
                      day.completionRate >= 60 ? 'text-amber-500' :
                      day.completionRate >= 40 ? 'text-orange-500' : 'text-red-500'
                    }`}>
                      {day.completionRate}%
                    </div>
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className={`w-full rounded-full h-2 ${isDarkMode ? 'bg-slate-600' : 'bg-slate-200'}`}>
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      day.completionRate >= 80 ? 'bg-gradient-to-r from-green-500 to-emerald-600' :
                      day.completionRate >= 60 ? 'bg-gradient-to-r from-amber-500 to-orange-600' :
                      day.completionRate >= 40 ? 'bg-gradient-to-r from-orange-500 to-red-500' :
                      'bg-gradient-to-r from-red-500 to-red-600'
                    }`}
                    style={{ width: `${day.completionRate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}