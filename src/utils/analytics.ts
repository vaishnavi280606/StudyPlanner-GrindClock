import { StudySession, Subject, ProductivityInsight } from '../types';

export const calculateStudyStats = (sessions: StudySession[], subjects: Subject[]) => {
  const totalMinutes = sessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
  const totalHours = Math.round((totalMinutes / 60) * 10) / 10;

  const completedSessions = sessions.filter(s => s.completed).length;
  const completionRate = sessions.length > 0
    ? Math.round((completedSessions / sessions.length) * 100)
    : 0;

  const avgFocusRating = sessions.filter(s => s.focusRating).length > 0
    ? Math.round(
        sessions
          .filter(s => s.focusRating)
          .reduce((sum, s) => sum + (s.focusRating || 0), 0) /
        sessions.filter(s => s.focusRating).length * 10
      ) / 10
    : 0;

  const subjectBreakdown = subjects.map(subject => {
    const subjectSessions = sessions.filter(s => s.subjectId === subject.id);
    const subjectMinutes = subjectSessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
    return {
      subject: subject.name,
      color: subject.color,
      hours: Math.round((subjectMinutes / 60) * 10) / 10,
      sessions: subjectSessions.length,
    };
  }).filter(s => s.hours > 0);

  return {
    totalHours,
    totalSessions: sessions.length,
    completionRate,
    avgFocusRating,
    subjectBreakdown,
  };
};

export const calculateDailyCompletionRate = (sessions: StudySession[], subjects: Subject[]) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const todaySessions = sessions.filter(s => {
    const sessionDate = new Date(s.startTime);
    sessionDate.setHours(0, 0, 0, 0);
    return sessionDate.getTime() === today.getTime();
  });

  const todayMinutes = todaySessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
  const todayHours = todayMinutes / 60;

  const totalDailyTarget = subjects.reduce((sum, subject) => {
    return sum + (subject.targetHoursPerDay || 0);
  }, 0);

  const dailyCompletionRate = totalDailyTarget > 0 
    ? Math.round((todayHours / totalDailyTarget) * 100)
    : 0;

  const subjectProgress = subjects.map(subject => {
    const subjectTodaySessions = todaySessions.filter(s => s.subjectId === subject.id);
    const subjectTodayMinutes = subjectTodaySessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
    const subjectTodayHours = subjectTodayMinutes / 60;
    const subjectTarget = subject.targetHoursPerDay || 0;
    const subjectCompletion = subjectTarget > 0 ? Math.round((subjectTodayHours / subjectTarget) * 100) : 0;

    return {
      subject: subject.name,
      color: subject.color,
      hoursStudied: Math.round(subjectTodayHours * 10) / 10,
      targetHours: subjectTarget,
      completionRate: Math.min(subjectCompletion, 100),
    };
  }).filter(s => s.targetHours > 0);

  return {
    todayHours: Math.round(todayHours * 10) / 10,
    totalDailyTarget,
    dailyCompletionRate: Math.min(dailyCompletionRate, 100),
    subjectProgress,
  };
};

export const generateInsights = (
  sessions: StudySession[],
  subjects: Subject[]
): ProductivityInsight[] => {
  const insights: ProductivityInsight[] = [];

  if (sessions.length === 0) {
    insights.push({
      type: 'recommendation',
      title: 'Start Your Study Journey',
      description: 'Add your subjects and start your first study session to get personalized insights.',
    });
    return insights;
  }

  const hourCounts = new Array(24).fill(0);
  sessions.forEach(session => {
    const hour = new Date(session.startTime).getHours();
    hourCounts[hour]++;
  });

  const peakHour = hourCounts.indexOf(Math.max(...hourCounts));
  if (sessions.length >= 5) {
    insights.push({
      type: 'peak_hours',
      title: 'Peak Productivity Hour',
      description: `You're most productive at ${peakHour}:00. Consider scheduling important subjects during this time.`,
      data: { hour: peakHour },
    });
  }

  const recentSessions = sessions.slice(-7);
  const consecutiveDays = new Set(
    recentSessions.map(s => new Date(s.startTime).toDateString())
  ).size;

  if (consecutiveDays >= 3) {
    insights.push({
      type: 'streak',
      title: `${consecutiveDays}-Day Streak!`,
      description: `You've studied for ${consecutiveDays} days. Keep the momentum going!`,
      data: { days: consecutiveDays },
    });
  }

  const subjectPerformance = subjects.map(subject => {
    const subjectSessions = sessions.filter(s => s.subjectId === subject.id);
    const avgFocus = subjectSessions.filter(s => s.focusRating).length > 0
      ? subjectSessions.reduce((sum, s) => sum + (s.focusRating || 0), 0) /
        subjectSessions.filter(s => s.focusRating).length
      : 0;
    return { subject, avgFocus, sessionCount: subjectSessions.length };
  });

  const weakSubject = subjectPerformance
    .filter(s => s.sessionCount >= 2)
    .sort((a, b) => a.avgFocus - b.avgFocus)[0];

  if (weakSubject && weakSubject.avgFocus < 3) {
    insights.push({
      type: 'weak_subjects',
      title: 'Focus Improvement Needed',
      description: `Your focus rating for ${weakSubject.subject.name} is below average. Try shorter sessions or different study techniques.`,
      data: { subject: weakSubject.subject.name },
    });
  }

  const now = new Date();
  const thisWeek = sessions.filter(s => {
    const sessionDate = new Date(s.startTime);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return sessionDate >= weekAgo;
  });

  subjects.forEach(subject => {
    const subjectWeekSessions = thisWeek.filter(s => s.subjectId === subject.id);
    const weekMinutes = subjectWeekSessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
    const weekHours = weekMinutes / 60;

    if (weekHours < subject.targetHoursPerWeek * 0.7 && subject.targetHoursPerWeek > 0) {
      insights.push({
        type: 'recommendation',
        title: `Behind Schedule: ${subject.name}`,
        description: `You've studied ${Math.round(weekHours * 10) / 10}h this week. Target is ${subject.targetHoursPerWeek}h. Consider adding more sessions.`,
        data: { subject: subject.name, current: weekHours, target: subject.targetHoursPerWeek },
      });
    }
  });

  return insights;
};

export const calculateStreak = (sessions: StudySession[]): number => {
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

  // Check if there's a session today or yesterday (to account for ongoing streaks)
  if (!sessionDates.has(currentDate.getTime())) {
    currentDate.setDate(currentDate.getDate() - 1);
    if (!sessionDates.has(currentDate.getTime())) {
      return 0;
    }
  }

  // Count consecutive days backwards
  while (sessionDates.has(currentDate.getTime())) {
    streak++;
    currentDate.setDate(currentDate.getDate() - 1);
  }

  return streak;
};

export const getWeeklyProgress = (sessions: StudySession[], subjects: Subject[] = []) => {
  const now = new Date();
  
  // Calculate the start of the current week (Sunday)
  const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - currentDay);
  startOfWeek.setHours(0, 0, 0, 0);

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayAbbreviations = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  // Calculate total daily target from all subjects
  const totalDailyTarget = subjects.reduce((sum, subject) => {
    return sum + (subject.targetHoursPerDay || 0);
  }, 0);
  
  const dailyData = days.map((dayName, index) => {
    const targetDate = new Date(startOfWeek);
    targetDate.setDate(startOfWeek.getDate() + index);

    const daySessions = sessions.filter(s => {
      const sessionDate = new Date(s.startTime);
      sessionDate.setHours(0, 0, 0, 0);
      return sessionDate.getTime() === targetDate.getTime();
    });

    const minutes = daySessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
    const hours = Math.round((minutes / 60) * 10) / 10;

    // Calculate completion rate based on daily target
    const completionRate = totalDailyTarget > 0 
      ? Math.min(Math.round((hours / totalDailyTarget) * 100), 100)
      : 0;

    // Check if this day is today
    const isToday = targetDate.toDateString() === now.toDateString();
    
    // Check if this day is in the future
    const isFuture = targetDate > now;

    return {
      day: dayAbbreviations[index],
      fullDay: dayName,
      date: targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      hours,
      completionRate,
      isToday,
      isFuture,
    };
  });

  return dailyData;
};

export const calculateWeeklySubjectProgress = (sessions: StudySession[], subjects: Subject[]) => {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const thisWeekSessions = sessions.filter(s => {
    const sessionDate = new Date(s.startTime);
    return sessionDate >= weekAgo && sessionDate <= now;
  });

  const subjectProgress = subjects.map(subject => {
    const subjectWeekSessions = thisWeekSessions.filter(s => s.subjectId === subject.id);
    const weekMinutes = subjectWeekSessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
    const weekHours = weekMinutes / 60;
    const weeklyTarget = subject.targetHoursPerWeek || 0;
    const completionRate = weeklyTarget > 0 ? Math.round((weekHours / weeklyTarget) * 100) : 0;

    return {
      subject: subject.name,
      color: subject.color,
      hoursStudied: Math.round(weekHours * 10) / 10,
      targetHours: weeklyTarget,
      completionRate: Math.min(completionRate, 100),
    };
  }).filter(s => s.targetHours > 0);

  const totalWeeklyTarget = subjects.reduce((sum, subject) => sum + (subject.targetHoursPerWeek || 0), 0);
  const totalWeekHours = thisWeekSessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0) / 60;
  const overallWeeklyCompletion = totalWeeklyTarget > 0 ? Math.round((totalWeekHours / totalWeeklyTarget) * 100) : 0;

  return {
    subjectProgress,
    totalWeekHours: Math.round(totalWeekHours * 10) / 10,
    totalWeeklyTarget,
    overallWeeklyCompletion: Math.min(overallWeeklyCompletion, 100),
  };
};
