import { Play, Pause, Square, Clock } from 'lucide-react';
import { Subject } from '../types';

interface TimerState {
  isRunning: boolean;
  isPaused: boolean;
  selectedSubjectId: string;
  startTime: Date | null;
  elapsedSeconds: number;
  notes: string;
  focusRating: number;
}

interface StudyTimerProps {
  subjects: Subject[];
  timerState: TimerState;
  onTimerStart: (subjectId: string) => void;
  onTimerPause: () => void;
  onTimerResume: () => void;
  onTimerStop: () => void;
  onTimerUpdate: (updates: Partial<TimerState>) => void;
  formatTime: (seconds: number) => string;
  isDarkMode: boolean;
}

export function StudyTimer({ 
  subjects, 
  timerState, 
  onTimerStart, 
  onTimerPause, 
  onTimerResume, 
  onTimerStop, 
  onTimerUpdate, 
  formatTime, 
  isDarkMode 
}: StudyTimerProps) {
  const handleStart = () => {
    if (!timerState.selectedSubjectId) {
      alert('Please select a subject first');
      return;
    }
    onTimerStart(timerState.selectedSubjectId);
  };

  const handleSubjectChange = (subjectId: string) => {
    onTimerUpdate({ selectedSubjectId: subjectId });
  };

  const handleNotesChange = (notes: string) => {
    onTimerUpdate({ notes });
  };

  const handleFocusRatingChange = (focusRating: number) => {
    onTimerUpdate({ focusRating });
  };

  return (
    <div className={`rounded-xl p-8 shadow-md border transition-colors ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
      <div className="flex items-center gap-3 mb-6">
        <Clock className="text-amber-600" size={28} />
        <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Grind Timer</h2>
      </div>

      {!timerState.isRunning && !timerState.startTime && (
        <div className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              Select Subject
            </label>
            <select
              value={timerState.selectedSubjectId}
              onChange={(e) => handleSubjectChange(e.target.value)}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'border-slate-300'}`}
            >
              <option value="">Choose a subject...</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleStart}
            disabled={!timerState.selectedSubjectId}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg hover:from-amber-600 hover:to-orange-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed text-lg font-semibold"
          >
            <Play size={24} />
            Start Session
          </button>
        </div>
      )}

      {timerState.startTime && (
        <div className="space-y-6">
          <div className="text-center">
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg mb-4 ${isDarkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
              <div
                className="w-3 h-3 rounded-full"
                style={{
                  backgroundColor: subjects.find((s) => s.id === timerState.selectedSubjectId)?.color,
                }}
              />
              <span className={`font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                {subjects.find((s) => s.id === timerState.selectedSubjectId)?.name}
              </span>
            </div>
            <div className={`text-6xl font-bold mb-6 font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'} ${timerState.isPaused ? 'opacity-60' : ''}`}>
              {formatTime(timerState.elapsedSeconds)}
            </div>
            {timerState.isPaused && (
              <div className={`text-center mb-4 ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                <div className="flex items-center justify-center gap-2">
                  <Pause size={16} />
                  <span className="text-sm font-medium">Timer Paused</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            {timerState.isRunning && !timerState.isPaused ? (
              <button
                onClick={onTimerPause}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors font-semibold"
              >
                <Pause size={20} />
                Pause
              </button>
            ) : timerState.startTime ? (
              <button
                onClick={onTimerResume}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg hover:from-amber-600 hover:to-orange-700 transition-colors font-semibold"
              >
                <Play size={20} />
                Resume
              </button>
            ) : null}
            <button
              onClick={onTimerStop}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
            >
              <Square size={20} />
              Stop & Save
            </button>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              Session Notes
            </label>
            <textarea
              value={timerState.notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'border-slate-300'}`}
              rows={3}
              placeholder="What did you grind? Any key takeaways?"
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              Focus Rating: {timerState.focusRating}/5
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  type="button"
                  onClick={() => handleFocusRatingChange(rating)}
                  className={`flex-1 py-2 rounded-lg font-medium transition-all ${
                    timerState.focusRating >= rating
                      ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white'
                      : isDarkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {rating}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
