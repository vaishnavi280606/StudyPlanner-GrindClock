import { useState, useEffect } from 'react';
import { Flame, Trophy, Target, Calendar, Clock, Brain } from 'lucide-react';
import { StudySession } from '../types';

interface StudyStreaksProps {
  sessions: StudySession[];
  isDarkMode: boolean;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  condition: (sessions: StudySession[]) => boolean;
  progress?: (sessions: StudySession[]) => { current: number; target: number };
  unlocked: boolean;
  unlockedAt?: Date;
}

const achievements: Achievement[] = [
  {
    id: 'first_session',
    title: 'Getting Started',
    description: 'Complete your first study session',
    icon: Target,
    condition: (sessions) => sessions.length >= 1,
    unlocked: false
  },
  {
    id: 'week_warrior',
    title: 'Week Warrior',
    description: 'Study for 7 consecutive days',
    icon: Calendar,
    condition: (sessions) => calculateStreak(sessions) >= 7,
    progress: (sessions) => ({ current: Math.min(calculateStreak(sessions), 7), target: 7 }),
    unlocked: false
  },
  {
    id: 'focus_master',
    title: 'Focus Master',
    description: 'Achieve 5-star focus rating 10 times',
    icon: Brain,
    condition: (sessions) => sessions.filter(s => s.focusRating === 5).length >= 10,
    progress: (sessions) => ({ current: Math.min(sessions.filter(s => s.focusRating === 5).length, 10), target: 10 }),
    unlocked: false
  },
  {
    id: 'marathon_runner',
    title: 'Marathon Runner',
    description: 'Complete a 4+ hour study session',
    icon: Clock,
    condition: (sessions) => sessions.some(s => (s.durationMinutes || 0) >= 240),
    unlocked: false
  },
  {
    id: 'consistency_king',
    title: 'Consistency King',
    description: 'Study for 30 consecutive days',
    icon: Flame,
    condition: (sessions) => calculateStreak(sessions) >= 30,
    progress: (sessions) => ({ current: Math.min(calculateStreak(sessions), 30), target: 30 }),
    unlocked: false
  },
  {
    id: 'century_club',
    title: 'Century Club',
    description: 'Complete 100 study sessions',
    icon: Trophy,
    condition: (sessions) => sessions.length >= 100,
    progress: (sessions) => ({ current: Math.min(sessions.length, 100), target: 100 }),
    unlocked: false
  }
];

function calculateStreak(sessions: StudySession[]): number {
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
}

export function StudyStreaks({ sessions, isDarkMode }: StudyStreaksProps) {
  const [unlockedAchievements, setUnlockedAchievements] = useState<Achievement[]>([]);
  const [newlyUnlocked, setNewlyUnlocked] = useState<Achievement[]>([]);

  const currentStreak = calculateStreak(sessions);
  const longestStreak = calculateLongestStreak(sessions);
  
  useEffect(() => {
    // Load previously unlocked achievements
    const stored = localStorage.getItem('grind_clock_achievements');
    const storedAchievements = stored ? JSON.parse(stored) : [];
    
    // Check for newly unlocked achievements
    const updatedAchievements = achievements.map(achievement => {
      const wasUnlocked = storedAchievements.find((a: any) => a.id === achievement.id);
      const isNowUnlocked = achievement.condition(sessions);
      
      if (isNowUnlocked && !wasUnlocked) {
        return { ...achievement, unlocked: true, unlockedAt: new Date() };
      } else if (wasUnlocked) {
        return { ...achievement, unlocked: true, unlockedAt: new Date(wasUnlocked.unlockedAt) };
      }
      
      return achievement;
    });

    const newUnlocked = updatedAchievements.filter(a => 
      a.unlocked && !storedAchievements.find((s: any) => s.id === a.id)
    );

    if (newUnlocked.length > 0) {
      setNewlyUnlocked(newUnlocked);
      setTimeout(() => setNewlyUnlocked([]), 5000);
    }

    setUnlockedAchievements(updatedAchievements.filter(a => a.unlocked));
    
    // Save updated achievements
    localStorage.setItem('grind_clock_achievements', JSON.stringify(
      updatedAchievements.filter(a => a.unlocked).map(a => ({ id: a.id, unlockedAt: a.unlockedAt }))
    ));
  }, [sessions]);

  return (
    <div className="space-y-6">
      {/* Streak Display */}
      <div className={`rounded-xl p-6 shadow-md border transition-colors ${
        isDarkMode 
          ? 'bg-gradient-to-br from-orange-900 to-red-900 border-orange-700' 
          : 'bg-gradient-to-br from-orange-50 to-red-50 border-orange-200'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Flame className={`${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`} size={32} />
            <div>
              <h3 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-orange-900'}`}>
                {currentStreak} Day Streak
              </h3>
              <p className={`text-sm ${isDarkMode ? 'text-orange-200' : 'text-orange-700'}`}>
                Longest: {longestStreak} days
              </p>
            </div>
          </div>
          <div className={`text-right ${isDarkMode ? 'text-orange-200' : 'text-orange-700'}`}>
            <div className="text-sm">Keep it going!</div>
            <div className="text-xs">Study today to maintain your streak</div>
          </div>
        </div>
        
        {/* Streak Visualization */}
        <div className="flex gap-1 overflow-x-auto pb-2">
          {Array.from({ length: Math.min(currentStreak, 30) }, (_, i) => (
            <div
              key={i}
              className={`w-3 h-8 rounded-sm ${
                isDarkMode ? 'bg-orange-500' : 'bg-orange-400'
              }`}
              title={`Day ${currentStreak - i}`}
            />
          ))}
          {currentStreak > 30 && (
            <div className={`px-2 py-1 rounded text-xs ${isDarkMode ? 'bg-orange-700 text-orange-200' : 'bg-orange-200 text-orange-800'}`}>
              +{currentStreak - 30} more
            </div>
          )}
        </div>
      </div>

      {/* Achievements */}
      <div className={`rounded-xl p-6 shadow-md border transition-colors ${
        isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center gap-3 mb-6">
          <Trophy className={`${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`} size={24} />
          <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            Achievements ({unlockedAchievements.length}/{achievements.length})
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {achievements.map((achievement) => {
            const Icon = achievement.icon;
            const isUnlocked = unlockedAchievements.some(a => a.id === achievement.id);
            const progress = achievement.progress ? achievement.progress(sessions) : null;
            
            return (
              <div
                key={achievement.id}
                className={`p-4 rounded-lg border transition-all ${
                  isUnlocked
                    ? isDarkMode
                      ? 'bg-gradient-to-br from-yellow-900/30 to-amber-900/30 border-yellow-600'
                      : 'bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-300'
                    : isDarkMode
                    ? 'bg-slate-700 border-slate-600 opacity-60'
                    : 'bg-slate-50 border-slate-200 opacity-60'
                }`}
              >
                <div className="flex items-start gap-3">
                  <Icon
                    size={24}
                    className={
                      isUnlocked
                        ? isDarkMode ? 'text-yellow-400' : 'text-yellow-600'
                        : isDarkMode ? 'text-slate-500' : 'text-slate-400'
                    }
                  />
                  <div className="flex-1">
                    <h4 className={`font-semibold ${
                      isUnlocked
                        ? isDarkMode ? 'text-yellow-200' : 'text-yellow-800'
                        : isDarkMode ? 'text-slate-400' : 'text-slate-600'
                    }`}>
                      {achievement.title}
                    </h4>
                    <p className={`text-sm ${
                      isUnlocked
                        ? isDarkMode ? 'text-yellow-300' : 'text-yellow-700'
                        : isDarkMode ? 'text-slate-500' : 'text-slate-500'
                    }`}>
                      {achievement.description}
                    </p>
                    
                    {progress && !isUnlocked && (
                      <div className="mt-2">
                        <div className="flex justify-between text-xs mb-1">
                          <span>Progress</span>
                          <span>{progress.current}/{progress.target}</span>
                        </div>
                        <div className={`w-full rounded-full h-2 ${isDarkMode ? 'bg-slate-600' : 'bg-slate-200'}`}>
                          <div
                            className="bg-gradient-to-r from-amber-500 to-orange-600 h-2 rounded-full transition-all"
                            style={{ width: `${(progress.current / progress.target) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                    
                    {isUnlocked && (
                      <div className={`text-xs mt-1 ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                        ✓ Unlocked
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* New Achievement Notifications */}
      {newlyUnlocked.map((achievement, index) => (
        <div
          key={achievement.id}
          className="fixed top-20 right-6 bg-gradient-to-r from-yellow-500 to-amber-600 text-white px-6 py-4 rounded-xl shadow-2xl animate-bounce z-50 max-w-sm"
          style={{ top: `${5 + index * 5}rem` }}
        >
          <div className="flex items-center gap-3">
            <Trophy size={24} />
            <div>
              <h3 className="font-bold">Achievement Unlocked!</h3>
              <p className="text-sm text-yellow-100">{achievement.title}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function calculateLongestStreak(sessions: StudySession[]): number {
  if (sessions.length === 0) return 0;

  const sessionDates = new Set(
    sessions.map(s => {
      const date = new Date(s.startTime);
      date.setHours(0, 0, 0, 0);
      return date.getTime();
    })
  );

  const sortedDates = Array.from(sessionDates).sort((a, b) => a - b);
  let maxStreak = 1;
  let currentStreak = 1;

  for (let i = 1; i < sortedDates.length; i++) {
    const prevDate = new Date(sortedDates[i - 1]);
    const currentDate = new Date(sortedDates[i]);
    
    prevDate.setDate(prevDate.getDate() + 1);
    
    if (prevDate.getTime() === currentDate.getTime()) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 1;
    }
  }

  return maxStreak;
}