import { useState, useMemo } from 'react';
import { TrendingUp, BarChart3, PieChart, Calendar, Clock, Target, Brain, Award, Zap } from 'lucide-react';
import { StudySession, Subject } from '../types';

interface AdvancedAnalyticsProps {
  sessions: StudySession[];
  subjects: Subject[];
  isDarkMode: boolean;
}

type TimeRange = '7d' | '30d' | '90d' | 'all';
type ChartType = 'overview' | 'subjects' | 'performance' | 'trends';

export function AdvancedAnalytics({ sessions, subjects, isDarkMode }: AdvancedAnalyticsProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [activeChart, setActiveChart] = useState<ChartType>('overview');

  const filteredSessions = useMemo(() => {
    if (timeRange === 'all') return sessions;

    const now = new Date();
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    return sessions.filter(s => new Date(s.startTime) >= cutoff);
  }, [sessions, timeRange]);

  // Calculate analytics data
  const analytics = useMemo(() => {
    const totalMinutes = filteredSessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
    const totalHours = Math.round((totalMinutes / 60) * 10) / 10;

    // Calculate completion rate
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 1;
    const totalTargetHours = subjects.reduce((sum, subject) => {
      return sum + (subject.targetHoursPerDay || 0) * days;
    }, 0);

    const completionRate = totalTargetHours > 0
      ? Math.min(Math.round((totalHours / totalTargetHours) * 100), 100)
      : 0;

    // Calculate avg focus
    const sessionsWithFocus = filteredSessions.filter(s => s.focusRating && s.durationMinutes);
    const avgFocusRating = sessionsWithFocus.length > 0
      ? (() => {
        const totalWeightedFocus = sessionsWithFocus.reduce((sum, s) =>
          sum + (s.focusRating || 0) * (s.durationMinutes || 0), 0
        );
        const totalFocusMinutes = sessionsWithFocus.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
        return totalFocusMinutes > 0 ? Math.round((totalWeightedFocus / totalFocusMinutes) * 10) / 10 : 0;
      })()
      : 0;

    return {
      totalHours,
      totalSessions: filteredSessions.length,
      avgSessionLength: filteredSessions.length > 0
        ? Math.round((totalMinutes / filteredSessions.length) * 10) / 10
        : 0,
      completionRate,
      avgFocusRating
    };
  }, [filteredSessions, subjects, timeRange]);

  // Calculate subject breakdown
  const subjectBreakdown = useMemo(() => {
    return subjects.map(subject => {
      const subjectSessions = filteredSessions.filter(s => s.subjectId === subject.id);
      const subjectMinutes = subjectSessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);

      const sessionsWithFocus = subjectSessions.filter(s => s.focusRating && s.durationMinutes);
      const avgFocus = sessionsWithFocus.length > 0
        ? (() => {
          const totalWeightedFocus = sessionsWithFocus.reduce((sum, s) =>
            sum + (s.focusRating || 0) * (s.durationMinutes || 0), 0
          );
          const totalMinutes = sessionsWithFocus.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
          return totalMinutes > 0 ? totalWeightedFocus / totalMinutes : 0;
        })()
        : 0;

      return {
        subject: subject.name,
        color: subject.color,
        hours: Math.round((subjectMinutes / 60) * 10) / 10,
        sessions: subjectSessions.length,
        avgFocus: Math.round(avgFocus * 10) / 10,
        percentage: analytics.totalHours > 0 ? Math.round((subjectMinutes / 60 / analytics.totalHours) * 100) : 0,
      };
    }).filter(s => s.hours > 0);
  }, [subjects, filteredSessions, analytics.totalHours]);

  // Calculate daily trends
  const dailyTrends = useMemo(() => {
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365;
    const trends = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(date.getDate() + 1);

      const daySessions = filteredSessions.filter(s => {
        const sDate = new Date(s.startTime);
        return sDate >= date && sDate < nextDate;
      });

      const dayMinutes = daySessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
      const dayHours = Math.round((dayMinutes / 60) * 10) / 10;

      const sessionsWithFocus = daySessions.filter(s => s.focusRating);
      const avgFocus = sessionsWithFocus.length > 0
        ? Math.round(sessionsWithFocus.reduce((sum, s) => sum + (s.focusRating || 0), 0) / sessionsWithFocus.length * 10) / 10
        : 0;

      trends.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        hours: dayHours,
        sessions: daySessions.length,
        avgFocus
      });
    }

    return trends;
  }, [timeRange, filteredSessions]);

  // Calculate hourly distribution
  const hourlyDistribution = useMemo(() => {
    const hourCounts = new Array(24).fill(0);
    filteredSessions.forEach(session => {
      const hour = new Date(session.startTime).getHours();
      hourCounts[hour] += session.durationMinutes || 0;
    });

    return hourCounts.map((minutes, hour) => ({
      hour: `${hour}:00`,
      minutes,
      hours: Math.round((minutes / 60) * 10) / 10,
    })).filter(h => h.minutes > 0);
  }, [filteredSessions]);

  const renderOverviewChart = () => (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-blue-50'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total Hours</p>
              <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {analytics.totalHours}
              </p>
            </div>
            <Clock className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-green-50'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Sessions</p>
              <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {analytics.totalSessions}
              </p>
            </div>
            <Target className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-purple-50'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Avg Focus</p>
              <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {analytics.avgFocusRating}/5
              </p>
            </div>
            <Brain className="w-8 h-8 text-purple-500" />
          </div>
        </div>

        <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-orange-50'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Completion</p>
              <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {analytics.completionRate}%
              </p>
            </div>
            <Award className="w-8 h-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Daily Trends Chart */}
      <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Daily Study Hours
        </h3>
        <div className="h-64 flex items-end justify-between space-x-1">
          {dailyTrends.map((day, index) => {
            const maxHours = Math.max(...dailyTrends.map(d => d.hours));
            const height = maxHours > 0 ? (day.hours / maxHours) * 100 : 0;

            return (
              <div key={index} className="flex flex-col items-center flex-1">
                <div
                  className="w-full bg-blue-500 rounded-t transition-all duration-300 hover:bg-blue-600 min-h-[4px]"
                  style={{ height: `${Math.max(height, 2)}%` }}
                  title={`${day.date}: ${day.hours}h`}
                />
                <span className={`text-xs mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {day.date.split(' ')[1]}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderSubjectsChart = () => (
    <div className="space-y-6">
      {/* Subject Breakdown */}
      <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Subject Distribution
        </h3>
        <div className="space-y-4">
          {subjectBreakdown.map((subject, index) => (
            <div key={index} className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: subject.color }}
                  />
                  <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {subject.subject}
                  </span>
                </div>
                <div className="text-right">
                  <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {subject.hours}h
                  </span>
                  <span className={`text-sm ml-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    ({subject.percentage}%)
                  </span>
                </div>
              </div>
              <div className={`w-full h-2 rounded-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                <div
                  className="h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${subject.percentage}%`,
                    backgroundColor: subject.color
                  }}
                />
              </div>
              <div className="flex justify-between text-sm">
                <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                  {subject.sessions} sessions
                </span>
                <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                  Avg Focus: {subject.avgFocus}/5
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderPerformanceChart = () => {
    const now = new Date();

    // Start from the beginning of current month
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    startDate.setHours(0, 0, 0, 0);

    // Calculate total days from start of month to today
    const totalDays = now.getDate();

    const monthName = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    // Calculate daily trends for current month only
    const allDaysTrends = [];

    for (let i = 0; i < totalDays; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);

      const nextDate = new Date(date);
      nextDate.setDate(date.getDate() + 1);

      const daySessions = sessions.filter(s => {
        const sessionDate = new Date(s.startTime);
        return sessionDate >= date && sessionDate < nextDate;
      });

      const dayMinutes = daySessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
      const dayHours = Math.round((dayMinutes / 60) * 10) / 10;

      const sessionsWithFocus = daySessions.filter(s => s.focusRating);
      const avgFocus = sessionsWithFocus.length > 0
        ? Math.round(daySessions.reduce((sum, s) => sum + (s.focusRating || 0), 0) / sessionsWithFocus.length * 10) / 10
        : null;

      allDaysTrends.push({
        date: date.getDate(),
        fullDate: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        monthYear: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        hours: dayHours,
        sessions: daySessions.length,
        avgFocus,
      });
    }

    const hasData = allDaysTrends.some(d => d.avgFocus !== null);

    // Calculate width for scrollable area (each day gets 40px)
    const chartWidth = Math.max(totalDays * 40, 800);

    return (
      <div className={`p-8 rounded-xl ${isDarkMode ? 'bg-slate-800' : 'bg-white'} border ${isDarkMode ? 'border-slate-700' : 'border-slate-200'} shadow-lg`}>
        <div className="mb-6">
          <h3 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            Performance Overview
          </h3>
          <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            Focus rating trends for {monthName} ({totalDays} days)
          </p>
        </div>

        {hasData ? (
          <div className="h-80 relative flex">
            {/* Y-axis (fixed) */}
            <div className="flex-shrink-0 w-12 flex flex-col justify-between text-sm font-medium text-slate-500" style={{ height: 'calc(100% - 3rem)' }}>
              <span>5.0</span>
              <span>4.0</span>
              <span>3.0</span>
              <span>2.0</span>
              <span>1.0</span>
              <span>0.0</span>
            </div>

            {/* Scrollable Chart area */}
            <div
              className="flex-1 overflow-x-auto overflow-y-hidden ml-2 mr-4 rounded-lg"
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: isDarkMode ? '#475569 #1e293b' : '#cbd5e1 #f1f5f9'
              }}
            >
              <div className="h-full relative pb-16" style={{ width: `${chartWidth}px`, minWidth: '100%' }}>


                {/* Line graph with gradient fill */}
                <svg className="absolute inset-0 w-full" style={{ height: 'calc(100% - 3rem)' }} preserveAspectRatio="none" viewBox="0 0 100 100">
                  <defs>
                    <linearGradient id="focusGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="rgb(249, 115, 22)" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="rgb(249, 115, 22)" stopOpacity="0.05" />
                    </linearGradient>
                  </defs>

                  {/* Area fill - all days */}
                  <path
                    d={`
                      M 0,100
                      ${allDaysTrends.map((day, index) => {
                      const x = (index / Math.max(totalDays - 1, 1)) * 100;
                      const y = day.avgFocus !== null ? 100 - ((day.avgFocus / 5) * 100) : 100;
                      return `L ${x},${y}`;
                    }).join(' ')}
                      L 100,100
                      Z
                    `}
                    fill="url(#focusGradient)"
                    opacity="0.6"
                  />

                  {/* Line - connecting all days */}
                  <path
                    d={allDaysTrends.map((day, index) => {
                      const x = (index / Math.max(totalDays - 1, 1)) * 100;
                      const y = day.avgFocus !== null ? 100 - ((day.avgFocus / 5) * 100) : 100;
                      return index === 0 ? `M ${x},${y}` : `L ${x},${y}`;
                    }).join(' ')}
                    fill="none"
                    stroke="rgb(249, 115, 22)"
                    strokeWidth="0.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                  />

                  {/* Data points - all days */}
                  {allDaysTrends.map((day, index) => {
                    const x = (index / Math.max(totalDays - 1, 1)) * 100;
                    const y = day.avgFocus !== null ? 100 - ((day.avgFocus / 5) * 100) : 100;
                    const hasData = day.avgFocus !== null;

                    return (
                      <g key={index}>
                        <circle
                          cx={x}
                          cy={y}
                          r={hasData ? "1" : "0.5"}
                          fill={hasData ? "rgb(249, 115, 22)" : "rgb(203, 213, 225)"}
                          stroke="white"
                          strokeWidth="0.3"
                          className="transition-all cursor-pointer"
                          vectorEffect="non-scaling-stroke"
                          style={{ filter: hasData ? 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' : 'none' }}
                        >
                          <title>
                            {hasData
                              ? `${day.fullDate}: ${day.avgFocus}/5 (${day.hours}h studied)`
                              : `${day.fullDate}: No study session`
                            }
                          </title>
                        </circle>
                      </g>
                    );
                  })}
                </svg>

                {/* X-axis labels - All day numbers */}
                <div className="absolute left-0 text-xs font-medium text-slate-500" style={{ bottom: '2rem', width: '100%' }}>
                  {allDaysTrends.map((day, index) => {
                    const xPosition = (index / Math.max(totalDays - 1, 1)) * 100;
                    return (
                      <div
                        key={index}
                        className="absolute text-center"
                        style={{
                          left: `${xPosition}%`,
                          transform: 'translateX(-50%)',
                          fontSize: totalDays > 20 ? '10px' : '12px'
                        }}
                      >
                        <div className={`absolute bottom-0 left-1/2 transform -translate-x-1/2 w-px h-2 ${isDarkMode ? 'bg-slate-600' : 'bg-slate-300'}`} />
                        <div className="mt-2">{day.date}</div>
                      </div>
                    );
                  })}
                </div>


              </div>
            </div>
          </div>
        ) : (
          <div className="h-80 flex flex-col items-center justify-center">
            <div className={`text-6xl mb-4`}>📊</div>
            <p className={`text-lg font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              No performance data yet
            </p>
            <p className={`text-sm mt-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Complete study sessions with focus ratings to see your performance trends
            </p>
          </div>
        )}
      </div>
    );
  };

  const renderTrendsChart = () => (
    <div className="space-y-6">
      {/* Weekly Comparison */}
      <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Study Trends & Patterns
        </h3>

        {/* Trend Insights */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
            <div className="flex items-center space-x-2 mb-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Peak Performance
              </span>
            </div>
            <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              {hourlyDistribution.length > 0
                ? `Best study time: ${hourlyDistribution.reduce((max, hour) => hour.hours > max.hours ? hour : max).hour}`
                : 'No data available'
              }
            </p>
          </div>

          <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
            <div className="flex items-center space-x-2 mb-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Consistency Score
              </span>
            </div>
            <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              {dailyTrends.filter(d => d.hours > 0).length} of {dailyTrends.length} days active
            </p>
          </div>
        </div>

        {/* Combined Trends Chart */}
        <div className="h-64 relative">
          <div className="absolute inset-0 flex items-end justify-between space-x-1">
            {dailyTrends.map((day, index) => {
              const maxHours = Math.max(...dailyTrends.map(d => d.hours));
              const hoursHeight = maxHours > 0 ? (day.hours / maxHours) * 80 : 0;
              const focusHeight = day.avgFocus > 0 ? (day.avgFocus / 5) * 60 : 0;

              return (
                <div key={index} className="flex flex-col items-center flex-1 relative">
                  {/* Hours bar */}
                  <div
                    className="w-full bg-blue-500 rounded-t transition-all duration-300 hover:bg-blue-600 min-h-[2px] absolute bottom-8"
                    style={{ height: `${Math.max(hoursHeight, 1)}%` }}
                    title={`${day.date}: ${day.hours}h`}
                  />
                  {/* Focus overlay */}
                  {day.avgFocus > 0 && (
                    <div
                      className="w-1/2 bg-purple-400 rounded-t transition-all duration-300 absolute bottom-8 right-0"
                      style={{ height: `${Math.max(focusHeight, 1)}%` }}
                      title={`Focus: ${day.avgFocus}/5`}
                    />
                  )}
                  <span className={`text-xs mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {day.date.split(' ')[1]}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="absolute top-0 right-0 flex space-x-4 text-sm">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-blue-500 rounded" />
              <span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>Hours</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-purple-400 rounded" />
              <span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>Focus</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Advanced Analytics
        </h2>

        {/* Time Range Selector */}
        <div className="flex space-x-2">
          {(['7d', '30d'] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${timeRange === range
                  ? 'bg-blue-500 text-white'
                  : isDarkMode
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
            >
              {range.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Type Tabs */}
      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
        {([
          { key: 'overview', label: 'Overview', icon: BarChart3 },
          { key: 'subjects', label: 'Subjects', icon: PieChart },
          { key: 'performance', label: 'Performance', icon: TrendingUp },
          { key: 'trends', label: 'Trends', icon: Calendar },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveChart(key)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors flex-1 justify-center ${activeChart === key
                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Chart Content */}
      {activeChart === 'overview' && renderOverviewChart()}
      {activeChart === 'subjects' && renderSubjectsChart()}
      {activeChart === 'performance' && renderPerformanceChart()}
      {activeChart === 'trends' && renderTrendsChart()}
    </div>
  );
}