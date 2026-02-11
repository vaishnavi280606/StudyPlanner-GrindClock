import { useState } from 'react';
import { Target, Plus, Check, Trash2, Calendar, Clock, MapPin, TrendingUp, Edit2 } from 'lucide-react';
import { StudyGoal, Subject, StudySession } from '../types';
import { CompletionTracker } from './CompletionTracker';

interface GoalsManagerProps {
  goals: StudyGoal[];
  subjects: Subject[];
  sessions: StudySession[];
  onAddGoal: (goal: Omit<StudyGoal, 'id'>) => void;
  onUpdateGoal: (id: string, goal: Omit<StudyGoal, 'id'>) => void;
  onToggleGoal: (id: string) => void;
  onDeleteGoal: (id: string) => void;
  isDarkMode: boolean;
  initialTab?: 'goals' | 'exams' | 'tracker';
}

export function GoalsManager({
  goals,
  subjects,
  sessions,
  onAddGoal,
  onUpdateGoal,
  onToggleGoal,
  onDeleteGoal,
  isDarkMode,
  initialTab = 'goals',
}: GoalsManagerProps) {
  const [activeTab, setActiveTab] = useState<'goals' | 'exams' | 'tracker'>(initialTab);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subjectId: '',
    subjectIds: [] as string[],
    targetDate: '',
    isExam: false,
    examDate: '',
    examTime: '',
    examLocation: '',
    studyHoursTarget: '',
  });

  // Calculate study time for each subject
  const getStudyTimeForSubject = (subjectId: string) => {
    return sessions
      .filter(session => session.subjectId === subjectId && session.completed)
      .reduce((total, session) => total + (session.durationMinutes || 0), 0);
  };

  const startEdit = (goal: StudyGoal) => {
    setEditingId(goal.id);
    setFormData({
      title: goal.title,
      description: goal.description,
      subjectId: goal.subjectId || '',
      subjectIds: goal.subjectIds || [],
      targetDate: goal.targetDate ? goal.targetDate.toISOString().split('T')[0] : '',
      isExam: goal.isExam || false,
      examDate: goal.examDate ? goal.examDate.toISOString().split('T')[0] : '',
      examTime: goal.examTime || '',
      examLocation: goal.examLocation || '',
      studyHoursTarget: goal.studyHoursTarget?.toString() || '',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation for exams
    if (formData.isExam && formData.subjectIds.length === 0) {
      alert('Please select at least one subject for the exam');
      return;
    }

    const goalData = {
      ...formData,
      subjectId: formData.isExam ? undefined : (formData.subjectId || undefined),
      subjectIds: formData.isExam ? formData.subjectIds : undefined,
      targetDate: formData.targetDate ? new Date(formData.targetDate) : undefined,
      examDate: formData.examDate ? new Date(formData.examDate) : undefined,
      studyHoursTarget: formData.studyHoursTarget ? parseInt(formData.studyHoursTarget) : undefined,
      completed: false,
    };

    if (editingId) {
      onUpdateGoal(editingId, goalData);
      setEditingId(null);
    } else {
      onAddGoal(goalData);
      setIsAdding(false);
    }

    setFormData({
      title: '',
      description: '',
      subjectId: '',
      subjectIds: [],
      targetDate: '',
      isExam: false,
      examDate: '',
      examTime: '',
      examLocation: '',
      studyHoursTarget: '',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setIsAdding(false);
    setFormData({
      title: '',
      description: '',
      subjectId: '',
      subjectIds: [],
      targetDate: '',
      isExam: false,
      examDate: '',
      examTime: '',
      examLocation: '',
      studyHoursTarget: '',
    });
  };

  const regularGoals = goals.filter((g) => !g.isExam);
  const examGoals = goals.filter((g) => g.isExam);
  const activeRegularGoals = regularGoals.filter((g) => !g.completed);
  const completedRegularGoals = regularGoals.filter((g) => g.completed);
  const activeExamGoals = examGoals.filter((g) => !g.completed);
  const completedExamGoals = examGoals.filter((g) => g.completed);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Goals & Exams</h2>
        {!isAdding && (
          <button
            onClick={() => {
              setIsAdding(true);
              setFormData({
                ...formData,
                isExam: activeTab === 'exams'
              });
            }}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg hover:from-amber-600 hover:to-orange-700 transition-colors"
          >
            <Plus size={20} />
            Add {activeTab === 'goals' ? 'Goal' : 'Exam'}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => {
            setActiveTab('goals');
            cancelEdit();
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${activeTab === 'goals'
            ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md'
            : isDarkMode ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-100'
            }`}
        >
          <Target size={18} />
          Goals ({regularGoals.length})
        </button>
        <button
          onClick={() => {
            setActiveTab('exams');
            cancelEdit();
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${activeTab === 'exams'
            ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md'
            : isDarkMode ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-100'
            }`}
        >
          <Calendar size={18} />
          Exams ({examGoals.length})
        </button>
        <button
          onClick={() => {
            setActiveTab('tracker');
            cancelEdit();
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${activeTab === 'tracker'
            ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md'
            : isDarkMode ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-100'
            }`}
        >
          <TrendingUp size={18} />
          Progress
        </button>
      </div>

      {(isAdding || editingId) && (
        <form
          onSubmit={handleSubmit}
          className={`rounded-xl p-6 shadow-md border transition-colors ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}
        >
          <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            {editingId ? 'Edit' : 'New'} {formData.isExam ? 'Exam Schedule' : 'Goal'}
          </h3>
          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                {formData.isExam ? 'Exam Name' : 'Goal Title'}
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'border-slate-300'}`}
                placeholder={formData.isExam ? "e.g., Mathematics Final Exam" : "e.g., Complete Chapter 5"}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'border-slate-300'}`}
                rows={3}
                placeholder="Additional details about this goal..."
              />
            </div>

            {/* Subject Selection - Different for Goals vs Exams */}
            {!formData.isExam ? (
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Subject (Optional)
                </label>
                <select
                  value={formData.subjectId}
                  onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'border-slate-300'}`}
                >
                  <option value="">General Goal</option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Subjects (Select multiple for combined exams)
                </label>
                <div className={`border rounded-lg p-3 max-h-40 overflow-y-auto ${isDarkMode ? 'bg-slate-700 border-slate-600' : 'border-slate-300 bg-white'}`}>
                  {subjects.length === 0 ? (
                    <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      No subjects available. Add subjects first.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {subjects.map((subject) => (
                        <label key={subject.id} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.subjectIds.includes(subject.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({
                                  ...formData,
                                  subjectIds: [...formData.subjectIds, subject.id]
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  subjectIds: formData.subjectIds.filter(id => id !== subject.id)
                                });
                              }
                            }}
                            className="text-amber-500 rounded focus:ring-amber-500"
                          />
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: subject.color }}
                          />
                          <span className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                            {subject.name}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                {formData.subjectIds.length === 0 && (
                  <p className={`text-xs mt-1 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                    Please select at least one subject for the exam
                  </p>
                )}
              </div>
            )}

            {!formData.isExam ? (
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Target Date (Optional)
                </label>
                <input
                  type="date"
                  value={formData.targetDate}
                  onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'border-slate-300'}`}
                />
              </div>
            ) : (
              <>
                {/* Exam-specific fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      Exam Date (Required)
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.examDate}
                      onChange={(e) => setFormData({ ...formData, examDate: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'border-slate-300'}`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      Exam Time (Optional)
                    </label>
                    <input
                      type="time"
                      value={formData.examTime}
                      onChange={(e) => setFormData({ ...formData, examTime: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'border-slate-300'}`}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      Location (Optional)
                    </label>
                    <input
                      type="text"
                      value={formData.examLocation}
                      onChange={(e) => setFormData({ ...formData, examLocation: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'border-slate-300'}`}
                      placeholder="e.g., Room 101, Main Hall"
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      Study Hours Target
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.studyHoursTarget}
                      onChange={(e) => setFormData({ ...formData, studyHoursTarget: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'border-slate-300'}`}
                      placeholder="Hours to study"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg hover:from-amber-600 hover:to-orange-700 transition-colors"
              >
                {editingId ? 'Update' : 'Add'} {formData.isExam ? 'Exam' : 'Goal'}
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                className={`px-4 py-2 rounded-lg transition-colors ${isDarkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Completion Tracker Tab */}
      {activeTab === 'tracker' && (
        <CompletionTracker
          goals={goals}
          subjects={subjects}
          sessions={sessions}
          isDarkMode={isDarkMode}
        />
      )}

      {/* Goals and Exams Tabs */}
      {activeTab !== 'tracker' && (
        <div className="space-y-6">
          {/* Active Goals/Exams based on tab */}
          {(activeTab === 'goals' ? activeRegularGoals : activeExamGoals).length > 0 && (
            <div>
              <h3 className={`text-lg font-semibold mb-3 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                Active {activeTab === 'goals' ? 'Goals' : 'Exams'}
              </h3>
              <div className="space-y-3">
                {(activeTab === 'goals' ? activeRegularGoals : activeExamGoals).map((goal) => (
                  <div
                    key={goal.id}
                    className={`rounded-xl p-5 shadow-md border hover:shadow-lg transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => onToggleGoal(goal.id)}
                        className={`mt-1 w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center flex-shrink-0 ${isDarkMode ? 'border-slate-600 hover:border-orange-500 hover:bg-orange-900/30' : 'border-slate-300 hover:border-orange-500 hover:bg-orange-50'}`}
                      >
                        <Check size={14} className="text-transparent" />
                      </button>
                      <div className="flex-1">
                        <h4 className={`font-semibold mb-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{goal.title}</h4>
                        {goal.description && (
                          <p className={`text-sm mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{goal.description}</p>
                        )}
                        {/* Goal/Exam specific information */}
                        {goal.isExam ? (
                          <div className="space-y-2">
                            <div className={`flex flex-wrap items-center gap-3 text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                              {goal.subjectId && (
                                <div className="flex items-center gap-1">
                                  <div
                                    className="w-2 h-2 rounded-full"
                                    style={{
                                      backgroundColor: subjects.find((s) => s.id === goal.subjectId)?.color || '#6b7280',
                                    }}
                                  />
                                  <span>{subjects.find((s) => s.id === goal.subjectId)?.name}</span>
                                </div>
                              )}
                              {goal.examDate && (
                                <div className="flex items-center gap-1">
                                  <Calendar size={12} />
                                  <span>Exam: {new Date(goal.examDate).toLocaleDateString()}</span>
                                </div>
                              )}
                              {goal.examTime && (
                                <div className="flex items-center gap-1">
                                  <Clock size={12} />
                                  <span>{goal.examTime}</span>
                                </div>
                              )}
                              {goal.examLocation && (
                                <div className="flex items-center gap-1">
                                  <MapPin size={12} />
                                  <span>{goal.examLocation}</span>
                                </div>
                              )}
                            </div>
                            {/* Study Progress & Daily Insight */}
                            {goal.subjectId && goal.studyHoursTarget && (
                              <div className="mt-3 space-y-3">
                                {/* Overall Progress */}
                                {(() => {
                                  const studiedMinutes = getStudyTimeForSubject(goal.subjectId!);
                                  const studiedHours = Math.round(studiedMinutes / 60 * 10) / 10;
                                  const targetHours = goal.studyHoursTarget;
                                  const progress = Math.min((studiedHours / targetHours) * 100, 100);

                                  // Calculate Daily Progress (Insight)
                                  const today = new Date();
                                  today.setHours(0, 0, 0, 0);

                                  const todayMinutes = sessions
                                    .filter(s =>
                                      s.subjectId === goal.subjectId &&
                                      new Date(s.startTime) >= today &&
                                      s.completed
                                    )
                                    .reduce((sum, s) => sum + (s.durationMinutes || 0), 0);

                                  const todayHours = Math.round(todayMinutes / 60 * 10) / 10;

                                  // Recommend daily target based on remaining days
                                  const remainingHours = Math.max(0, targetHours - studiedHours);
                                  let dailyTarget = 1; // Default 1 hour

                                  if (goal.targetDate) {
                                    const daysLeft = Math.ceil((new Date(goal.targetDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                                    if (daysLeft > 0) {
                                      dailyTarget = Math.round((remainingHours / daysLeft) * 10) / 10;
                                    }
                                  } else if (goal.examDate) {
                                    const daysLeft = Math.ceil((new Date(goal.examDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                                    if (daysLeft > 0) {
                                      dailyTarget = Math.round((remainingHours / daysLeft) * 10) / 10;
                                    }
                                  }

                                  const dailyProgress = Math.min((todayHours / (dailyTarget || 1)) * 100, 100);

                                  return (
                                    <>
                                      <div>
                                        <div className="flex justify-between items-center mb-1">
                                          <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                            Total Progress
                                          </span>
                                          <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                            {studiedHours}h / {targetHours}h
                                          </span>
                                        </div>
                                        <div className={`w-full rounded-full h-2 ${isDarkMode ? 'bg-slate-700' : 'bg-slate-200'}`}>
                                          <div
                                            className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-600 transition-all duration-300"
                                            style={{ width: `${progress}%` }}
                                          />
                                        </div>
                                      </div>

                                      {/* Daily Insight Card */}
                                      <div className={`p-2 rounded-lg border flex items-center gap-3 ${isDarkMode
                                        ? 'bg-slate-700/50 border-slate-600'
                                        : 'bg-indigo-50 border-indigo-100'
                                        }`}>
                                        <div className={`p-1.5 rounded-full ${isDarkMode ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-600'
                                          }`}>
                                          <TrendingUp size={14} />
                                        </div>
                                        <div className="flex-1">
                                          <div className="flex justify-between items-center mb-1">
                                            <span className={`text-xs font-semibold ${isDarkMode ? 'text-indigo-200' : 'text-indigo-700'}`}>
                                              Today's Progress
                                            </span>
                                            <span className={`text-xs ${isDarkMode ? 'text-indigo-300' : 'text-indigo-600'}`}>
                                              {todayHours}h / {dailyTarget}h
                                            </span>
                                          </div>
                                          <div className={`w-full rounded-full h-1.5 ${isDarkMode ? 'bg-slate-600' : 'bg-indigo-200'}`}>
                                            <div
                                              className="h-full rounded-full bg-indigo-500 transition-all duration-300"
                                              style={{ width: `${dailyProgress}%` }}
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    </>
                                  );
                                })()}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className={`flex flex-wrap items-center gap-3 text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                            {goal.subjectId && (
                              <div className="flex items-center gap-1">
                                <div
                                  className="w-2 h-2 rounded-full"
                                  style={{
                                    backgroundColor: subjects.find((s) => s.id === goal.subjectId)?.color || '#6b7280',
                                  }}
                                />
                                <span>{subjects.find((s) => s.id === goal.subjectId)?.name}</span>
                              </div>
                            )}
                            {goal.targetDate && (
                              <span>Due: {new Date(goal.targetDate).toLocaleDateString()}</span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => startEdit(goal)}
                          className={`p-1 transition-colors ${isDarkMode ? 'text-slate-500 hover:text-blue-400' : 'text-slate-400 hover:text-blue-600'}`}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => onDeleteGoal(goal.id)}
                          className={`p-1 transition-colors ${isDarkMode ? 'text-slate-500 hover:text-red-400' : 'text-slate-400 hover:text-red-600'}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(activeTab === 'goals' ? completedRegularGoals : completedExamGoals).length > 0 && (
            <div>
              <h3 className={`text-lg font-semibold mb-3 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                Completed {activeTab === 'goals' ? 'Goals' : 'Exams'}
              </h3>
              <div className="space-y-3">
                {(activeTab === 'goals' ? completedRegularGoals : completedExamGoals).map((goal) => (
                  <div
                    key={goal.id}
                    className={`rounded-xl p-5 shadow-sm border ${isDarkMode ? 'bg-green-900/20 border-green-700/50' : 'bg-green-50 border-green-200'}`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => onToggleGoal(goal.id)}
                        className="mt-1 w-6 h-6 rounded-full bg-green-500 hover:bg-green-600 transition-all flex items-center justify-center flex-shrink-0"
                      >
                        <Check size={14} className="text-white" />
                      </button>
                      <div className="flex-1">
                        <h4 className={`font-semibold line-through mb-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-600'}`}>
                          {goal.title}
                        </h4>
                        {goal.completedAt && (
                          <p className={`text-xs ${isDarkMode ? 'text-slate-600' : 'text-slate-500'}`}>
                            Completed on {new Date(goal.completedAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => onDeleteGoal(goal.id)}
                        className={`p-1 transition-colors ${isDarkMode ? 'text-slate-500 hover:text-red-400' : 'text-slate-400 hover:text-red-600'}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(activeTab === 'goals' ? regularGoals : examGoals).length === 0 && (
            <div className={`rounded-xl p-12 shadow-md border text-center ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              {activeTab === 'goals' ? (
                <Target className={`mx-auto mb-4 ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`} size={48} />
              ) : (
                <Calendar className={`mx-auto mb-4 ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`} size={48} />
              )}
              <p className={`${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                No {activeTab === 'goals' ? 'goals' : 'exams'} yet. Add your first {activeTab === 'goals' ? 'goal' : 'exam'} to get started!
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
