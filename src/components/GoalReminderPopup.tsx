import { useState, useEffect } from 'react';
import { Target, Clock, X, Zap, Calendar } from 'lucide-react';
import { StudyGoal, Subject } from '../types';

interface GoalReminderPopupProps {
  goals: StudyGoal[];
  subjects: Subject[];
  isDarkMode: boolean;
  onClose: () => void;
}

export function GoalReminderPopup({ goals, subjects, isDarkMode, onClose }: GoalReminderPopupProps) {
  const [currentGoalIndex, setCurrentGoalIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  // Filter active goals and prioritize by urgency
  const activeGoals = goals
    .filter(g => !g.completed)
    .sort((a, b) => {
      if (a.targetDate && b.targetDate) {
        return new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime();
      }
      if (a.targetDate && !b.targetDate) return -1;
      if (!a.targetDate && b.targetDate) return 1;
      return 0;
    });

  useEffect(() => {
    if (activeGoals.length > 0) {
      setIsVisible(true);
    }
  }, [activeGoals.length]);

  if (activeGoals.length === 0 || !isVisible) return null;

  const currentGoal = activeGoals[currentGoalIndex];
  const subject = subjects.find(s => s.id === currentGoal.subjectId);
  
  const getDaysUntilDeadline = (targetDate?: Date) => {
    if (!targetDate) return null;
    const now = new Date();
    const target = new Date(targetDate);
    const diffTime = target.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysLeft = getDaysUntilDeadline(currentGoal.targetDate);
  
  const getUrgencyColor = (days: number | null) => {
    if (days === null) return isDarkMode ? 'text-blue-400' : 'text-blue-600';
    if (days <= 3) return 'text-red-500';
    if (days <= 7) return 'text-orange-500';
    if (days <= 14) return 'text-yellow-500';
    return isDarkMode ? 'text-green-400' : 'text-green-600';
  };

  const getUrgencyMessage = (days: number | null) => {
    if (days === null) return "No deadline set - perfect time to make progress!";
    if (days < 0) return `${Math.abs(days)} days overdue - time to grind!`;
    if (days === 0) return "Due today - final push!";
    if (days === 1) return "Due tomorrow - crunch time!";
    if (days <= 3) return `Only ${days} days left - sprint mode!`;
    if (days <= 7) return `${days} days remaining - stay focused!`;
    return `${days} days to go - keep grinding!`;
  };

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  const nextGoal = () => {
    if (currentGoalIndex < activeGoals.length - 1) {
      setCurrentGoalIndex(currentGoalIndex + 1);
    }
  };

  const prevGoal = () => {
    if (currentGoalIndex > 0) {
      setCurrentGoalIndex(currentGoalIndex - 1);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`max-w-md w-full rounded-2xl shadow-2xl border transform transition-all duration-300 ${
        isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
      } ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-2 rounded-xl">
              <Target className="text-white" size={20} />
            </div>
            <div>
              <h3 className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                Goal Reminder
              </h3>
              <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {currentGoalIndex + 1} of {activeGoals.length}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className={`p-2 rounded-lg transition-colors ${
              isDarkMode ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
            }`}
          >
            <X size={20} />
          </button>
        </div>

        {/* Goal Content */}
        <div className="p-6">
          {subject && (
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: subject.color }}
              />
              <span className={`text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                {subject.name}
              </span>
            </div>
          )}
          
          <h4 className={`text-lg font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            {currentGoal.title}
          </h4>
          
          {currentGoal.description && (
            <p className={`text-sm mb-4 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
              {currentGoal.description}
            </p>
          )}

          {/* Urgency Indicator */}
          <div className={`flex items-center gap-2 p-3 rounded-lg mb-4 ${
            isDarkMode ? 'bg-slate-700' : 'bg-slate-50'
          }`}>
            <Clock className={getUrgencyColor(daysLeft)} size={20} />
            <div>
              <p className={`font-medium ${getUrgencyColor(daysLeft)}`}>
                {getUrgencyMessage(daysLeft)}
              </p>
              {currentGoal.targetDate && (
                <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Target: {new Date(currentGoal.targetDate).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>

          {/* Motivational Message */}
          <div className={`p-4 rounded-lg border-l-4 border-amber-500 ${
            isDarkMode ? 'bg-amber-900/20' : 'bg-amber-50'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <Zap className="text-amber-500" size={16} />
              <span className={`font-medium ${isDarkMode ? 'text-amber-200' : 'text-amber-800'}`}>
                Grind Time!
              </span>
            </div>
            <p className={`text-sm ${isDarkMode ? 'text-amber-100' : 'text-amber-700'}`}>
              Every study session brings you closer to your goal. Start your timer and make progress today!
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-slate-200 dark:border-slate-700">
          <div className="flex gap-2">
            {activeGoals.length > 1 && (
              <>
                <button
                  onClick={prevGoal}
                  disabled={currentGoalIndex === 0}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    isDarkMode 
                      ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Previous
                </button>
                <button
                  onClick={nextGoal}
                  disabled={currentGoalIndex === activeGoals.length - 1}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    isDarkMode 
                      ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Next
                </button>
              </>
            )}
          </div>
          <button
            onClick={handleClose}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg hover:from-amber-600 hover:to-orange-700 transition-colors font-medium"
          >
            Let's Grind!
          </button>
        </div>
      </div>
    </div>
  );
}