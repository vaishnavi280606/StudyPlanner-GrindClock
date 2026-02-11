import { Calendar, Clock, MapPin } from 'lucide-react';
import { StudyGoal } from '../types';

interface ExamCountdownProps {
  goals: StudyGoal[];
  isDarkMode: boolean;
  onExamClick?: () => void;
}

export function ExamCountdown({ goals, isDarkMode, onExamClick }: ExamCountdownProps) {
  // Find the nearest upcoming exam
  const now = new Date();
  const upcomingExams = goals
    .filter(goal => goal.isExam && goal.examDate && !goal.completed)
    .map(goal => ({
      ...goal,
      examDate: new Date(goal.examDate!)
    }))
    .filter(goal => {
      // Only show exams that haven't happened yet
      // If exam has a time, check if it's in the future
      // Otherwise, check if the date is today or in the future
      const examDateTime = new Date(goal.examDate);
      if (goal.examTime) {
        const [hours, minutes] = goal.examTime.split(':').map(Number);
        examDateTime.setHours(hours, minutes, 0, 0);
      } else {
        // If no time specified, consider the exam as happening at end of day
        examDateTime.setHours(23, 59, 59, 999);
      }
      return examDateTime > now;
    })
    .sort((a, b) => a.examDate.getTime() - b.examDate.getTime());

  if (upcomingExams.length === 0) {
    return null;
  }

  const nearestExam = upcomingExams[0];
  
  // Calculate time left considering exam time if available
  const examDateTime = new Date(nearestExam.examDate);
  if (nearestExam.examTime) {
    const [hours, minutes] = nearestExam.examTime.split(':').map(Number);
    examDateTime.setHours(hours, minutes, 0, 0);
  }
  
  const daysLeft = Math.ceil((examDateTime.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const hoursLeft = Math.ceil((examDateTime.getTime() - now.getTime()) / (1000 * 60 * 60));

  const getUrgencyStyles = () => {
    if (daysLeft <= 1) {
      return {
        gradient: 'from-orange-600 to-red-600',
        badge: 'bg-orange-500/20 text-orange-100 border-orange-400/30',
        icon: '🔥',
        label: 'URGENT'
      };
    }
    if (daysLeft <= 3) {
      return {
        gradient: 'from-orange-500 to-orange-600',
        badge: 'bg-orange-500/20 text-orange-100 border-orange-400/30',
        icon: '⚡',
        label: 'SOON'
      };
    }
    if (daysLeft <= 7) {
      return {
        gradient: 'from-amber-500 to-orange-500',
        badge: 'bg-amber-500/20 text-amber-100 border-amber-400/30',
        icon: '⏰',
        label: 'UPCOMING'
      };
    }
    return {
      gradient: 'from-yellow-500 to-orange-500',
      badge: 'bg-yellow-500/20 text-yellow-100 border-yellow-400/30',
      icon: '📚',
      label: 'SCHEDULED'
    };
  };

  const getCountdownText = () => {
    if (daysLeft === 0) {
      if (hoursLeft <= 0) return 'STARTING NOW!';
      return `${hoursLeft} ${hoursLeft === 1 ? 'HOUR' : 'HOURS'} TO GO`;
    }
    return `${daysLeft} ${daysLeft === 1 ? 'DAY' : 'DAYS'} TO GO`;
  };

  const getMotivationalMessage = () => {
    if (daysLeft === 0) {
      return {
        message: "Stay calm and confident!",
        tip: "Take deep breaths and trust your preparation"
      };
    }
    if (daysLeft === 1) {
      return {
        message: "Final push! You've got this!",
        tip: "Review key concepts and get good sleep tonight"
      };
    }
    if (daysLeft <= 3) {
      return {
        message: "Focus mode activated!",
        tip: "Prioritize weak areas and practice problems"
      };
    }
    if (daysLeft <= 7) {
      return {
        message: "Keep grinding!",
        tip: "Create a study schedule and stick to it"
      };
    }
    return {
      message: "You have time to prepare well!",
      tip: "Build strong fundamentals and practice regularly"
    };
  };

  const motivation = getMotivationalMessage();

  const styles = getUrgencyStyles();

  return (
    <div className={`border-b ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
      <div className="max-w-7xl mx-auto px-6 py-2">
        <div 
          onClick={onExamClick}
          className={`flex items-center gap-6 px-4 py-2.5 rounded-lg bg-gradient-to-r ${styles.gradient} ${onExamClick ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''}`}
        >
          {/* Left Section - Exam Info */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Icon */}
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <span className="text-xl">{styles.icon}</span>
            </div>

            {/* Exam Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="font-black text-4xl text-white leading-tight">
                  {nearestExam.title}
                </h3>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-sm text-white/95 bg-white/10 px-2.5 py-1 rounded-md">
                    <Calendar size={14} />
                    <span className="font-bold">
                      {nearestExam.examDate.toLocaleDateString('en-US', { 
                        weekday: 'short',
                        month: 'short', 
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                  {nearestExam.examTime && (
                    <div className="flex items-center gap-1.5 text-sm text-white/95 bg-white/10 px-2.5 py-1 rounded-md">
                      <Clock size={14} />
                      <span className="font-bold">{nearestExam.examTime}</span>
                    </div>
                  )}
                </div>
              </div>
              {nearestExam.examLocation && (
                <div className="flex items-center gap-1.5 text-sm text-white/90 mt-1.5">
                  <MapPin size={14} />
                  <span className="font-semibold">{nearestExam.examLocation}</span>
                </div>
              )}
            </div>
          </div>

          {/* Middle Section - Motivation */}
          <div className="flex-1 px-4 text-center">
            <div className="text-white/95 font-bold text-lg mb-1">
              {motivation.message}
            </div>
            <div className="text-white/80 text-sm font-medium">
              💡 {motivation.tip}
            </div>
          </div>

          {/* Right Section - Countdown */}
          <div className="flex-shrink-0 min-w-fit">
            <div className="relative px-6 py-3 rounded-xl bg-white/25 backdrop-blur-md shadow-lg border-2 border-white/30">
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-xl"></div>
              <div className="relative text-white text-3xl font-black whitespace-nowrap drop-shadow-lg tracking-tight">
                {getCountdownText()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
