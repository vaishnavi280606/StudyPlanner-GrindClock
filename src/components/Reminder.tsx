import { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { StudyGoal } from '../types';

interface ReminderProps {
  goals: StudyGoal[];
  isDarkMode: boolean;
}

interface DueGoal {
  goal: StudyGoal;
  daysUntilDue: number;
}

export function Reminder({ goals, isDarkMode }: ReminderProps) {
  const [dueGoals, setDueGoals] = useState<DueGoal[]>([]);
  const [dismissedGoals, setDismissedGoals] = useState<Set<string>>(new Set());

  useEffect(() => {
    const checkDeadlines = () => {
      const now = new Date();
      const upcoming: DueGoal[] = [];

      goals.forEach((goal) => {
        if (goal.completed || !goal.targetDate || dismissedGoals.has(goal.id)) return;

        const targetDate = new Date(goal.targetDate);
        const diffTime = targetDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays <= 3 && diffDays >= 0) {
          upcoming.push({ goal, daysUntilDue: diffDays });
        } else if (diffDays < 0) {
          upcoming.push({ goal, daysUntilDue: diffDays });
        }
      });

      setDueGoals(upcoming.sort((a, b) => a.daysUntilDue - b.daysUntilDue));
    };

    checkDeadlines();
    const interval = setInterval(checkDeadlines, 60000);

    return () => clearInterval(interval);
  }, [goals, dismissedGoals]);

  const dismissReminder = (goalId: string) => {
    setDismissedGoals((prev) => new Set(prev).add(goalId));
  };

  if (dueGoals.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm space-y-2">
      {dueGoals.map(({ goal, daysUntilDue }) => (
        <div
          key={goal.id}
          className={`shadow-2xl rounded-xl p-4 border-l-4 ${
            daysUntilDue < 0
              ? 'bg-red-50 border-red-500'
              : daysUntilDue === 0
              ? 'bg-orange-50 border-orange-500'
              : isDarkMode
              ? 'bg-slate-700 border-amber-500'
              : 'bg-amber-50 border-amber-500'
          } ${isDarkMode && daysUntilDue >= 0 ? 'text-white' : ''}`}
        >
          <div className="flex items-start gap-3">
            <Bell
              className={`flex-shrink-0 mt-1 ${
                daysUntilDue < 0
                  ? 'text-red-600'
                  : daysUntilDue === 0
                  ? 'text-orange-600'
                  : 'text-amber-600'
              }`}
              size={20}
            />
            <div className="flex-1">
              <h4
                className={`font-semibold text-sm ${
                  daysUntilDue < 0
                    ? 'text-red-900'
                    : daysUntilDue === 0
                    ? 'text-orange-900'
                    : isDarkMode
                    ? 'text-white'
                    : 'text-amber-900'
                }`}
              >
                {daysUntilDue < 0
                  ? 'Overdue Goal!'
                  : daysUntilDue === 0
                  ? 'Due Today!'
                  : `Due in ${daysUntilDue} day${daysUntilDue > 1 ? 's' : ''}`}
              </h4>
              <p
                className={`text-sm mt-1 ${
                  daysUntilDue < 0
                    ? 'text-red-800'
                    : daysUntilDue === 0
                    ? 'text-orange-800'
                    : isDarkMode
                    ? 'text-slate-300'
                    : 'text-amber-800'
                }`}
              >
                {goal.title}
              </p>
            </div>
            <button
              onClick={() => dismissReminder(goal.id)}
              className={`p-1 rounded hover:bg-black/10 transition-colors ${
                isDarkMode ? 'text-slate-400' : 'text-slate-600'
              }`}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
