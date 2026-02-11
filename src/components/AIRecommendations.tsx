import { useState } from 'react';
import { Brain, Lightbulb, TrendingUp, Clock, Target, AlertCircle, CheckCircle, Zap } from 'lucide-react';
import { StudySession, Subject } from '../types';

interface AIRecommendationsProps {
  sessions: StudySession[];
  subjects: Subject[];
  isDarkMode: boolean;
}

interface Recommendation {
  id: string;
  type: 'schedule' | 'technique' | 'focus' | 'balance' | 'performance';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  actionable: string;
  reasoning: string;
  impact: string;
  icon: any;
  color: string;
}

export function AIRecommendations({ sessions, subjects, isDarkMode }: AIRecommendationsProps) {
  const [selectedType, setSelectedType] = useState<string>('all');

  const generateRecommendations = (): Recommendation[] => {
    const recommendations: Recommendation[] = [];
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const recentSessions = sessions.filter(s => s.startTime >= weekAgo);

    // Analyze study patterns
    const hourCounts = new Array(24).fill(0);
    const focusRatings: number[] = [];
    const sessionLengths: number[] = [];
    
    recentSessions.forEach(session => {
      const hour = new Date(session.startTime).getHours();
      hourCounts[hour]++;
      if (session.focusRating) focusRatings.push(session.focusRating);
      if (session.durationMinutes) sessionLengths.push(session.durationMinutes);
    });

    const avgFocus = focusRatings.length > 0 ? focusRatings.reduce((a, b) => a + b, 0) / focusRatings.length : 0;
    const avgSessionLength = sessionLengths.length > 0 ? sessionLengths.reduce((a, b) => a + b, 0) / sessionLengths.length : 0;
    const peakHour = hourCounts.indexOf(Math.max(...hourCounts));

    // Schedule Optimization Recommendations
    if (recentSessions.length >= 5) {
      const morningHours = [6, 7, 8, 9, 10];
      const afternoonHours = [14, 15, 16, 17];
      const eveningHours = [18, 19, 20, 21];

      const morningStudy = morningHours.reduce((sum, hour) => sum + hourCounts[hour], 0);
      const afternoonStudy = afternoonHours.reduce((sum, hour) => sum + hourCounts[hour], 0);
      const eveningStudy = eveningHours.reduce((sum, hour) => sum + hourCounts[hour], 0);

      if (morningStudy < afternoonStudy && morningStudy < eveningStudy) {
        recommendations.push({
          id: 'morning-study',
          type: 'schedule',
          priority: 'high',
          title: 'Try Morning Study Sessions',
          description: 'Research shows peak cognitive performance occurs in the morning hours.',
          actionable: 'Schedule your most challenging subjects between 8-10 AM',
          reasoning: 'You currently study less in the morning, but this is when most people have peak focus',
          impact: 'Could improve focus ratings by 15-25%',
          icon: Clock,
          color: 'text-orange-500'
        });
      }

      if (peakHour >= 0 && hourCounts[peakHour] >= 3) {
        recommendations.push({
          id: 'peak-hour-optimization',
          type: 'schedule',
          priority: 'medium',
          title: 'Optimize Your Peak Hour',
          description: `You're most productive at ${peakHour}:00. Use this time strategically.`,
          actionable: `Schedule your most difficult subjects at ${peakHour}:00`,
          reasoning: 'Data shows this is your most consistent study time',
          impact: 'Maximize productivity during your natural peak',
          icon: TrendingUp,
          color: 'text-green-500'
        });
      }
    }

    // Focus Improvement Recommendations
    if (avgFocus > 0 && avgFocus < 3.5) {
      recommendations.push({
        id: 'focus-improvement',
        type: 'focus',
        priority: 'high',
        title: 'Improve Focus with Shorter Sessions',
        description: 'Your average focus rating is below optimal levels.',
        actionable: 'Try 25-minute Pomodoro sessions with 5-minute breaks',
        reasoning: `Current average focus: ${avgFocus.toFixed(1)}/5. Shorter sessions often improve concentration`,
        impact: 'Could increase focus ratings by 0.5-1.0 points',
        icon: Brain,
        color: 'text-purple-500'
      });
    }

    if (avgSessionLength > 90) {
      recommendations.push({
        id: 'session-length',
        type: 'technique',
        priority: 'medium',
        title: 'Break Up Long Study Sessions',
        description: 'Your sessions average over 90 minutes, which can lead to diminishing returns.',
        actionable: 'Split long sessions into 45-60 minute blocks with breaks',
        reasoning: `Average session: ${Math.round(avgSessionLength)} minutes. Research shows focus declines after 45-60 minutes`,
        impact: 'Better retention and reduced mental fatigue',
        icon: Zap,
        color: 'text-yellow-500'
      });
    }

    // Subject Balance Recommendations
    const subjectHours = subjects.map(subject => {
      const subjectSessions = recentSessions.filter(s => s.subjectId === subject.id);
      const hours = subjectSessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0) / 60;
      return { subject, hours, target: subject.targetHoursPerWeek };
    });

    const imbalancedSubjects = subjectHours.filter(s => 
      s.target > 0 && s.hours < s.target * 0.6
    );

    if (imbalancedSubjects.length > 0) {
      const mostNeglected = imbalancedSubjects.sort((a, b) => 
        (a.hours / a.target) - (b.hours / b.target)
      )[0];

      recommendations.push({
        id: 'subject-balance',
        type: 'balance',
        priority: 'high',
        title: `Increase ${mostNeglected.subject.name} Study Time`,
        description: 'You\'re significantly behind on your weekly target for this subject.',
        actionable: `Add 2-3 more sessions of ${mostNeglected.subject.name} this week`,
        reasoning: `Current: ${mostNeglected.hours.toFixed(1)}h, Target: ${mostNeglected.target}h per week`,
        impact: 'Stay on track with your study goals',
        icon: Target,
        color: 'text-red-500'
      });
    }

    // Performance-based Recommendations
    const subjectPerformance = subjects.map(subject => {
      const subjectSessions = recentSessions.filter(s => s.subjectId === subject.id);
      const avgFocus = subjectSessions.filter(s => s.focusRating).length > 0
        ? subjectSessions.reduce((sum, s) => sum + (s.focusRating || 0), 0) / subjectSessions.filter(s => s.focusRating).length
        : 0;
      return { subject, avgFocus, sessionCount: subjectSessions.length };
    });

    const weakSubject = subjectPerformance
      .filter(s => s.sessionCount >= 2 && s.avgFocus > 0)
      .sort((a, b) => a.avgFocus - b.avgFocus)[0];

    if (weakSubject && weakSubject.avgFocus < 3) {
      recommendations.push({
        id: 'weak-subject-technique',
        type: 'technique',
        priority: 'medium',
        title: `Try Different Techniques for ${weakSubject.subject.name}`,
        description: 'This subject has your lowest focus ratings.',
        actionable: 'Experiment with active recall, spaced repetition, or mind mapping',
        reasoning: `Average focus for ${weakSubject.subject.name}: ${weakSubject.avgFocus.toFixed(1)}/5`,
        impact: 'Improve engagement and retention for challenging subjects',
        icon: Lightbulb,
        color: 'text-blue-500'
      });
    }

    // Consistency Recommendations
    const studyDays = new Set(recentSessions.map(s => 
      new Date(s.startTime).toDateString()
    )).size;

    if (studyDays < 5) {
      recommendations.push({
        id: 'consistency',
        type: 'schedule',
        priority: 'medium',
        title: 'Improve Study Consistency',
        description: 'Regular study habits lead to better long-term retention.',
        actionable: 'Aim to study at least 5 days per week, even if for shorter periods',
        reasoning: `You studied on ${studyDays} days this week. Consistency beats intensity`,
        impact: 'Better knowledge retention and reduced cramming',
        icon: CheckCircle,
        color: 'text-green-500'
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  };

  const recommendations = generateRecommendations();
  const filteredRecommendations = selectedType === 'all' 
    ? recommendations 
    : recommendations.filter(r => r.type === selectedType);

  const recommendationTypes = [
    { key: 'all', label: 'All Recommendations', count: recommendations.length },
    { key: 'schedule', label: 'Schedule', count: recommendations.filter(r => r.type === 'schedule').length },
    { key: 'technique', label: 'Techniques', count: recommendations.filter(r => r.type === 'technique').length },
    { key: 'focus', label: 'Focus', count: recommendations.filter(r => r.type === 'focus').length },
    { key: 'balance', label: 'Balance', count: recommendations.filter(r => r.type === 'balance').length },
    { key: 'performance', label: 'Performance', count: recommendations.filter(r => r.type === 'performance').length },
  ].filter(type => type.count > 0);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-red-500 bg-red-50 dark:bg-red-900/20';
      case 'medium': return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20';
      case 'low': return 'border-green-500 bg-green-50 dark:bg-green-900/20';
      default: return 'border-gray-500 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'medium': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'low': return <CheckCircle className="w-4 h-4 text-green-500" />;
      default: return null;
    }
  };

  if (sessions.length < 3) {
    return (
      <div className={`p-8 rounded-lg text-center ${isDarkMode ? 'bg-gray-800' : 'bg-white'} border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <Brain className={`w-16 h-16 mx-auto mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} />
        <h3 className={`text-xl font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          AI Recommendations Coming Soon
        </h3>
        <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Complete a few more study sessions to get personalized AI-powered recommendations for improving your study habits.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <Brain className="w-8 h-8 text-purple-500" />
        <div>
          <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            AI Study Recommendations
          </h2>
          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Personalized insights based on your study patterns
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {recommendationTypes.map(type => (
          <button
            key={type.key}
            onClick={() => setSelectedType(type.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedType === type.key
                ? 'bg-purple-500 text-white'
                : isDarkMode
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {type.label} ({type.count})
          </button>
        ))}
      </div>

      {/* Recommendations List */}
      <div className="space-y-4">
        {filteredRecommendations.map((rec) => {
          const IconComponent = rec.icon;
          return (
            <div
              key={rec.id}
              className={`p-6 rounded-lg border-l-4 ${getPriorityColor(rec.priority)} ${
                isDarkMode ? 'bg-gray-800' : 'bg-white'
              } border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <IconComponent className={`w-6 h-6 ${rec.color}`} />
                  <div>
                    <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {rec.title}
                    </h3>
                    <div className="flex items-center space-x-2 mt-1">
                      {getPriorityIcon(rec.priority)}
                      <span className={`text-sm font-medium capitalize ${
                        rec.priority === 'high' ? 'text-red-500' :
                        rec.priority === 'medium' ? 'text-yellow-500' : 'text-green-500'
                      }`}>
                        {rec.priority} Priority
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {rec.description}
                </p>

                <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <h4 className={`font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    💡 Action to Take:
                  </h4>
                  <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {rec.actionable}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className={`font-medium text-sm mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Why this matters:
                    </h4>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {rec.reasoning}
                    </p>
                  </div>
                  <div>
                    <h4 className={`font-medium text-sm mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Expected impact:
                    </h4>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {rec.impact}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredRecommendations.length === 0 && (
        <div className={`p-8 rounded-lg text-center ${isDarkMode ? 'bg-gray-800' : 'bg-white'} border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <CheckCircle className={`w-16 h-16 mx-auto mb-4 text-green-500`} />
          <h3 className={`text-xl font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Great Job!
          </h3>
          <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            No recommendations in this category. Your study habits are looking good!
          </p>
        </div>
      )}
    </div>
  );
}