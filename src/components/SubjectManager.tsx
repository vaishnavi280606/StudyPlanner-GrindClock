import { useState } from 'react';
import { Plus, BookOpen, Trash2, Edit2, Clock, TrendingUp } from 'lucide-react';
import { Subject, StudySession } from '../types';

interface SubjectManagerProps {
  subjects: Subject[];
  sessions: StudySession[];
  onAddSubject: (subject: Omit<Subject, 'id'>) => void;
  onUpdateSubject: (id: string, subject: Partial<Subject>) => void;
  onDeleteSubject: (id: string) => void;
  isDarkMode: boolean;
}

const COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
];

export function SubjectManager({
  subjects,
  sessions,
  onAddSubject,
  onUpdateSubject,
  onDeleteSubject,
  isDarkMode,
}: SubjectManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    color: COLORS[0],
    difficulty: 3,
    priority: 3,
    targetHoursPerWeek: 5,
    targetHoursPerDay: 1,
  });

  // Calculate time spent for each subject
  const getSubjectStats = (subjectId: string) => {
    const subjectSessions = sessions.filter(session => 
      session.subjectId === subjectId && session.completed
    );
    
    const totalMinutes = subjectSessions.reduce((total, session) => 
      total + (session.durationMinutes || 0), 0
    );
    
    const totalHours = Math.round(totalMinutes / 60 * 10) / 10;
    const sessionCount = subjectSessions.length;
    
    // Calculate this week's hours
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const thisWeekMinutes = subjectSessions
      .filter(session => new Date(session.startTime) >= oneWeekAgo)
      .reduce((total, session) => total + (session.durationMinutes || 0), 0);
    
    const thisWeekHours = Math.round(thisWeekMinutes / 60 * 10) / 10;
    
    return {
      totalHours,
      sessionCount,
      thisWeekHours,
    };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      onUpdateSubject(editingId, formData);
      setEditingId(null);
    } else {
      onAddSubject(formData);
    }
    setFormData({
      name: '',
      color: COLORS[0],
      difficulty: 3,
      priority: 3,
      targetHoursPerWeek: 5,
      targetHoursPerDay: 1,
    });
    setIsAdding(false);
  };

  const handleEdit = (subject: Subject) => {
    setFormData({
      name: subject.name,
      color: subject.color,
      difficulty: subject.difficulty,
      priority: subject.priority,
      targetHoursPerWeek: subject.targetHoursPerWeek,
      targetHoursPerDay: subject.targetHoursPerDay || 1,
    });
    setEditingId(subject.id);
    setIsAdding(true);
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({
      name: '',
      color: COLORS[0],
      difficulty: 3,
      priority: 3,
      targetHoursPerWeek: 5,
      targetHoursPerDay: 1,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>My Subjects</h2>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg hover:from-amber-600 hover:to-orange-700 transition-colors"
          >
            <Plus size={20} />
            Add Subject
          </button>
        )}
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className={`rounded-xl p-6 shadow-md border transition-colors ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
          <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            {editingId ? 'Edit Subject' : 'New Subject'}
          </h3>
          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Subject Name
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'border-slate-300'}`}
                placeholder="e.g., Mathematics"
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Color
              </label>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData({ ...formData, color })}
                    className={`w-10 h-10 rounded-lg transition-all ${
                      formData.color === color ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : ''
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Difficulty (1-5)
                </label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  required
                  value={formData.difficulty}
                  onChange={(e) => setFormData({ ...formData, difficulty: parseInt(e.target.value) })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'border-slate-300'}`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Priority (1-5)
                </label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  required
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'border-slate-300'}`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Target hrs/week
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={formData.targetHoursPerWeek}
                  onChange={(e) => setFormData({ ...formData, targetHoursPerWeek: parseInt(e.target.value) })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'border-slate-300'}`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Target hrs/day
                </label>
                <select
                  value={formData.targetHoursPerDay}
                  onChange={(e) => setFormData({ ...formData, targetHoursPerDay: parseFloat(e.target.value) })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'border-slate-300'}`}
                >
                  <option value={0.5}>30 min</option>
                  <option value={1}>1 hour</option>
                  <option value={1.5}>1.5 hours</option>
                  <option value={2}>2 hours</option>
                  <option value={2.5}>2.5 hours</option>
                  <option value={3}>3 hours</option>
                  <option value={3.5}>3.5 hours</option>
                  <option value={4}>4 hours</option>
                  <option value={4.5}>4.5 hours</option>
                  <option value={5}>5 hours</option>
                  <option value={6}>6 hours</option>
                  <option value={8}>8 hours</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg hover:from-amber-600 hover:to-orange-700 transition-colors"
              >
                {editingId ? 'Update' : 'Add'} Subject
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className={`px-4 py-2 rounded-lg transition-colors ${isDarkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      {subjects.length === 0 ? (
        <div className={`rounded-xl p-12 shadow-md border text-center ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
          <BookOpen className={`mx-auto mb-4 ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`} size={48} />
          <p className={`${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>No subjects yet. Add your first subject to get started!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map((subject) => (
            <div
              key={subject.id}
              className={`rounded-xl p-6 shadow-md border hover:shadow-lg transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: subject.color }}
                  />
                  <h3 className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{subject.name}</h3>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleEdit(subject)}
                    className={`p-1 transition-colors ${isDarkMode ? 'text-slate-500 hover:text-amber-400' : 'text-slate-400 hover:text-blue-600'}`}
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => onDeleteSubject(subject.id)}
                    className={`p-1 transition-colors ${isDarkMode ? 'text-slate-500 hover:text-red-400' : 'text-slate-400 hover:text-red-600'}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              {(() => {
                const stats = getSubjectStats(subject.id);
                const weeklyProgress = subject.targetHoursPerWeek > 0 
                  ? Math.min((stats.thisWeekHours / subject.targetHoursPerWeek) * 100, 100)
                  : 0;
                
                return (
                  <div className="space-y-3">
                    {/* Time Spent Section */}
                    <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-slate-700' : 'bg-slate-50'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="text-amber-500" size={16} />
                        <span className={`text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                          Time Spent
                        </span>
                      </div>
                      <div className={`space-y-1 text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        <div className="flex justify-between">
                          <span>Total:</span>
                          <span className="font-medium">{stats.totalHours}h ({stats.sessionCount} sessions)</span>
                        </div>
                        <div className="flex justify-between">
                          <span>This week:</span>
                          <span className="font-medium">{stats.thisWeekHours}h</span>
                        </div>
                      </div>
                      
                      {/* Weekly Progress Bar */}
                      <div className="mt-2">
                        <div className="flex justify-between items-center mb-1">
                          <span className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                            Weekly Goal
                          </span>
                          <span className={`text-xs font-medium ${
                            weeklyProgress >= 100 
                              ? 'text-green-500' 
                              : weeklyProgress >= 75 
                                ? 'text-amber-500' 
                                : 'text-slate-500'
                          }`}>
                            {Math.round(weeklyProgress)}%
                          </span>
                        </div>
                        <div className={`w-full rounded-full h-2 ${isDarkMode ? 'bg-slate-600' : 'bg-slate-200'}`}>
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              weeklyProgress >= 100 
                                ? 'bg-gradient-to-r from-green-500 to-emerald-600' 
                                : 'bg-gradient-to-r from-amber-500 to-orange-600'
                            }`}
                            style={{ width: `${weeklyProgress}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Subject Details */}
                    <div className={`space-y-2 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                      <div className="flex justify-between">
                        <span>Difficulty:</span>
                        <span className="font-medium">{'⭐'.repeat(subject.difficulty)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Priority:</span>
                        <span className="font-medium">{'🔥'.repeat(subject.priority)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Target:</span>
                        <span className="font-medium">{subject.targetHoursPerWeek}h/week</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
