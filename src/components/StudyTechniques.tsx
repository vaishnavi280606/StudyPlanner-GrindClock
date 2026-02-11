import { useState } from 'react';
import { BookOpen, Brain, Clock, Target, Lightbulb, Zap, Users, FileText, Calculator, Beaker, Globe, Palette, Music } from 'lucide-react';
import { Subject, StudySession } from '../types';

interface StudyTechniquesProps {
  subjects: Subject[];
  sessions: StudySession[];
  isDarkMode: boolean;
}

interface StudyTechnique {
  id: string;
  name: string;
  description: string;
  bestFor: string[];
  timeRequired: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  effectiveness: number;
  steps: string[];
  tips: string[];
  icon: any;
  color: string;
}

interface SubjectCategory {
  name: string;
  keywords: string[];
  icon: any;
  color: string;
  techniques: string[];
}

export function StudyTechniques({ subjects, sessions, isDarkMode }: StudyTechniquesProps) {
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');

  const subjectCategories: SubjectCategory[] = [
    {
      name: 'Mathematics',
      keywords: ['math', 'calculus', 'algebra', 'geometry', 'statistics', 'physics'],
      icon: Calculator,
      color: 'text-blue-500',
      techniques: ['practice-problems', 'spaced-repetition', 'concept-mapping', 'peer-teaching']
    },
    {
      name: 'Sciences',
      keywords: ['biology', 'chemistry', 'physics', 'science', 'lab', 'experiment'],
      icon: Beaker,
      color: 'text-green-500',
      techniques: ['active-recall', 'visual-learning', 'concept-mapping', 'case-studies']
    },
    {
      name: 'Languages',
      keywords: ['english', 'spanish', 'french', 'language', 'literature', 'writing'],
      icon: Globe,
      color: 'text-purple-500',
      techniques: ['immersion', 'spaced-repetition', 'active-recall', 'peer-teaching']
    },
    {
      name: 'Arts & Humanities',
      keywords: ['art', 'history', 'philosophy', 'literature', 'music', 'culture'],
      icon: Palette,
      color: 'text-pink-500',
      techniques: ['visual-learning', 'storytelling', 'concept-mapping', 'case-studies']
    },
    {
      name: 'General',
      keywords: [],
      icon: BookOpen,
      color: 'text-gray-500',
      techniques: ['pomodoro', 'active-recall', 'spaced-repetition', 'concept-mapping']
    }
  ];

  const studyTechniques: StudyTechnique[] = [
    {
      id: 'pomodoro',
      name: 'Pomodoro Technique',
      description: 'Work in focused 25-minute intervals with 5-minute breaks',
      bestFor: ['Focus improvement', 'Time management', 'Avoiding burnout'],
      timeRequired: '25-50 minutes',
      difficulty: 'beginner',
      effectiveness: 85,
      steps: [
        'Choose a task to work on',
        'Set a timer for 25 minutes',
        'Work on the task until the timer rings',
        'Take a 5-minute break',
        'Repeat 3-4 times, then take a longer 15-30 minute break'
      ],
      tips: [
        'Turn off all distractions during the 25-minute work period',
        'Use the breaks to stretch, hydrate, or do light movement',
        'Track how many pomodoros you complete each day'
      ],
      icon: Clock,
      color: 'text-red-500'
    },
    {
      id: 'active-recall',
      name: 'Active Recall',
      description: 'Test yourself on material without looking at notes',
      bestFor: ['Memory retention', 'Exam preparation', 'Long-term learning'],
      timeRequired: '20-45 minutes',
      difficulty: 'intermediate',
      effectiveness: 92,
      steps: [
        'Study material for 10-15 minutes',
        'Close your books and notes',
        'Write down everything you remember',
        'Check your notes to see what you missed',
        'Focus extra attention on forgotten material',
        'Repeat the process'
      ],
      tips: [
        'Use flashcards or practice questions',
        'Explain concepts out loud as if teaching someone',
        'Focus on understanding, not just memorization'
      ],
      icon: Brain,
      color: 'text-purple-500'
    },
    {
      id: 'spaced-repetition',
      name: 'Spaced Repetition',
      description: 'Review material at increasing intervals over time',
      bestFor: ['Long-term retention', 'Vocabulary', 'Facts and formulas'],
      timeRequired: '15-30 minutes daily',
      difficulty: 'intermediate',
      effectiveness: 88,
      steps: [
        'Learn new material thoroughly',
        'Review after 1 day',
        'Review after 3 days',
        'Review after 1 week',
        'Review after 2 weeks',
        'Continue with increasing intervals'
      ],
      tips: [
        'Use apps like Anki or create a simple schedule',
        'Focus more time on difficult concepts',
        'Be consistent with daily reviews'
      ],
      icon: Target,
      color: 'text-green-500'
    },
    {
      id: 'concept-mapping',
      name: 'Concept Mapping',
      description: 'Create visual diagrams showing relationships between ideas',
      bestFor: ['Complex topics', 'Visual learners', 'Understanding connections'],
      timeRequired: '30-60 minutes',
      difficulty: 'intermediate',
      effectiveness: 78,
      steps: [
        'Identify the main concept or topic',
        'List related subtopics and concepts',
        'Draw connections between related ideas',
        'Use colors and symbols to categorize',
        'Add examples and details to each concept',
        'Review and refine the map'
      ],
      tips: [
        'Start with pen and paper, then digitize if needed',
        'Use different colors for different types of relationships',
        'Keep it simple and avoid overcrowding'
      ],
      icon: Lightbulb,
      color: 'text-yellow-500'
    },
    {
      id: 'practice-problems',
      name: 'Practice Problems',
      description: 'Solve problems similar to those you\'ll encounter on exams',
      bestFor: ['Math and sciences', 'Skill development', 'Exam preparation'],
      timeRequired: '45-90 minutes',
      difficulty: 'beginner',
      effectiveness: 90,
      steps: [
        'Start with easier problems to build confidence',
        'Work through problems step-by-step',
        'Check your answers and understand mistakes',
        'Gradually increase difficulty',
        'Time yourself on practice exams',
        'Focus on problem-solving strategies'
      ],
      tips: [
        'Don\'t just memorize solutions, understand the process',
        'Create a problem bank for regular practice',
        'Explain your solution process out loud'
      ],
      icon: Calculator,
      color: 'text-blue-500'
    },
    {
      id: 'peer-teaching',
      name: 'Peer Teaching',
      description: 'Explain concepts to others or study in groups',
      bestFor: ['Deep understanding', 'Communication skills', 'Social learners'],
      timeRequired: '60-120 minutes',
      difficulty: 'advanced',
      effectiveness: 85,
      steps: [
        'Form a study group with 2-4 people',
        'Assign different topics to each person',
        'Prepare to teach your assigned topic',
        'Take turns explaining concepts to the group',
        'Ask questions and discuss difficult points',
        'Quiz each other on the material'
      ],
      tips: [
        'Choose study partners who are committed',
        'Prepare thoroughly before group sessions',
        'Don\'t let social time dominate study time'
      ],
      icon: Users,
      color: 'text-indigo-500'
    },
    {
      id: 'visual-learning',
      name: 'Visual Learning',
      description: 'Use diagrams, charts, and visual aids to understand concepts',
      bestFor: ['Visual learners', 'Complex processes', 'Data interpretation'],
      timeRequired: '30-60 minutes',
      difficulty: 'beginner',
      effectiveness: 75,
      steps: [
        'Convert text information into visual formats',
        'Create flowcharts for processes',
        'Use colors and symbols consistently',
        'Draw diagrams and illustrations',
        'Make infographics or posters',
        'Use visual mnemonics for memory'
      ],
      tips: [
        'Don\'t worry about artistic quality, focus on clarity',
        'Use online tools for digital visual aids',
        'Combine visuals with other study methods'
      ],
      icon: Palette,
      color: 'text-pink-500'
    },
    {
      id: 'case-studies',
      name: 'Case Study Analysis',
      description: 'Apply theoretical knowledge to real-world scenarios',
      bestFor: ['Applied learning', 'Critical thinking', 'Professional subjects'],
      timeRequired: '60-90 minutes',
      difficulty: 'advanced',
      effectiveness: 82,
      steps: [
        'Read the case study thoroughly',
        'Identify key issues and problems',
        'Apply relevant theories and concepts',
        'Analyze different perspectives',
        'Develop solutions or recommendations',
        'Present your analysis clearly'
      ],
      tips: [
        'Look for patterns across different cases',
        'Connect theory to practical applications',
        'Consider multiple solutions and their trade-offs'
      ],
      icon: FileText,
      color: 'text-orange-500'
    },
    {
      id: 'immersion',
      name: 'Immersion Learning',
      description: 'Surround yourself with the subject matter in daily life',
      bestFor: ['Languages', 'Cultural studies', 'Skill development'],
      timeRequired: 'Throughout the day',
      difficulty: 'advanced',
      effectiveness: 88,
      steps: [
        'Change device languages to target language',
        'Watch movies/shows in the subject area',
        'Listen to podcasts or music related to the topic',
        'Join online communities or forums',
        'Practice thinking in the target language/subject',
        'Use the subject in daily conversations'
      ],
      tips: [
        'Start gradually and increase exposure over time',
        'Keep a vocabulary journal for new terms',
        'Don\'t be afraid to make mistakes'
      ],
      icon: Globe,
      color: 'text-teal-500'
    },
    {
      id: 'storytelling',
      name: 'Storytelling Method',
      description: 'Create narratives to remember facts and concepts',
      bestFor: ['History', 'Literature', 'Sequential information'],
      timeRequired: '30-45 minutes',
      difficulty: 'intermediate',
      effectiveness: 73,
      steps: [
        'Identify key facts or events to remember',
        'Create a logical sequence or timeline',
        'Add characters, emotions, and vivid details',
        'Connect events with cause and effect',
        'Practice telling the story out loud',
        'Refine and embellish the narrative'
      ],
      tips: [
        'Make stories personal and emotionally engaging',
        'Use humor and unusual details for better recall',
        'Create visual scenes in your mind'
      ],
      icon: Music,
      color: 'text-rose-500'
    }
  ];

  const getSubjectCategory = (subject: Subject): SubjectCategory => {
    const subjectName = subject.name.toLowerCase();
    
    for (const category of subjectCategories) {
      if (category.keywords.some(keyword => subjectName.includes(keyword))) {
        return category;
      }
    }
    
    return subjectCategories[subjectCategories.length - 1]; // Return 'General' as default
  };

  const getRecommendedTechniques = (subject?: Subject): StudyTechnique[] => {
    if (!subject) return studyTechniques;
    
    const category = getSubjectCategory(subject);
    const subjectSessions = sessions.filter(s => s.subjectId === subject.id);
    
    // Get base techniques for the subject category
    let recommendedTechniques = studyTechniques.filter(technique => 
      category.techniques.includes(technique.id)
    );

    // Add performance-based recommendations
    if (subjectSessions.length > 0) {
      const avgFocus = subjectSessions.filter(s => s.focusRating).length > 0
        ? subjectSessions.reduce((sum, s) => sum + (s.focusRating || 0), 0) / subjectSessions.filter(s => s.focusRating).length
        : 0;
      
      const avgSessionLength = subjectSessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0) / subjectSessions.length;

      // If focus is low, recommend Pomodoro
      if (avgFocus < 3 && !recommendedTechniques.find(t => t.id === 'pomodoro')) {
        recommendedTechniques.unshift(studyTechniques.find(t => t.id === 'pomodoro')!);
      }

      // If sessions are very long, recommend active recall
      if (avgSessionLength > 90 && !recommendedTechniques.find(t => t.id === 'active-recall')) {
        recommendedTechniques.push(studyTechniques.find(t => t.id === 'active-recall')!);
      }
    }

    // Add difficulty-based recommendations
    if (subject.difficulty >= 4) {
      // High difficulty subjects benefit from spaced repetition and active recall
      ['spaced-repetition', 'active-recall'].forEach(techniqueId => {
        if (!recommendedTechniques.find(t => t.id === techniqueId)) {
          const technique = studyTechniques.find(t => t.id === techniqueId);
          if (technique) recommendedTechniques.push(technique);
        }
      });
    }

    return recommendedTechniques.slice(0, 6); // Limit to 6 recommendations
  };

  const filteredSubjects = selectedSubject === 'all' ? subjects : subjects.filter(s => s.id === selectedSubject);
  const filteredTechniques = selectedDifficulty === 'all' 
    ? studyTechniques 
    : studyTechniques.filter(t => t.difficulty === selectedDifficulty);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'text-green-500 bg-green-100 dark:bg-green-900/20';
      case 'intermediate': return 'text-yellow-500 bg-yellow-100 dark:bg-yellow-900/20';
      case 'advanced': return 'text-red-500 bg-red-100 dark:bg-red-900/20';
      default: return 'text-gray-500 bg-gray-100 dark:bg-gray-900/20';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <Lightbulb className="w-8 h-8 text-yellow-500" />
        <div>
          <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Study Techniques
          </h2>
          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Discover effective study methods tailored to your subjects
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Filter by Subject
          </label>
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className={`w-full px-3 py-2 rounded-lg border ${
              isDarkMode 
                ? 'bg-gray-700 border-gray-600 text-white' 
                : 'bg-white border-gray-300 text-gray-900'
            } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
          >
            <option value="all">All Subjects</option>
            {subjects.map(subject => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1">
          <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Filter by Difficulty
          </label>
          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            className={`w-full px-3 py-2 rounded-lg border ${
              isDarkMode 
                ? 'bg-gray-700 border-gray-600 text-white' 
                : 'bg-white border-gray-300 text-gray-900'
            } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
          >
            <option value="all">All Levels</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>
      </div>

      {/* Subject-Specific Recommendations */}
      {selectedSubject !== 'all' && (
        <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-blue-50'} border ${isDarkMode ? 'border-gray-700' : 'border-blue-200'}`}>
          {filteredSubjects.map(subject => {
            const category = getSubjectCategory(subject);
            const recommendedTechniques = getRecommendedTechniques(subject);
            const IconComponent = category.icon;

            return (
              <div key={subject.id}>
                <div className="flex items-center space-x-3 mb-4">
                  <IconComponent className={`w-6 h-6 ${category.color}`} />
                  <div>
                    <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      Recommended for {subject.name}
                    </h3>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Category: {category.name} • Difficulty: {subject.difficulty}/5
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recommendedTechniques.slice(0, 6).map(technique => {
                    const TechniqueIcon = technique.icon;
                    return (
                      <div
                        key={technique.id}
                        className={`p-4 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}
                      >
                        <div className="flex items-center space-x-2 mb-2">
                          <TechniqueIcon className={`w-5 h-5 ${technique.color}`} />
                          <h4 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            {technique.name}
                          </h4>
                        </div>
                        <p className={`text-sm mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          {technique.description}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className={`text-xs px-2 py-1 rounded-full ${getDifficultyColor(technique.difficulty)}`}>
                            {technique.difficulty}
                          </span>
                          <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {technique.effectiveness}% effective
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* All Techniques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredTechniques.map(technique => {
          const IconComponent = technique.icon;
          return (
            <div
              key={technique.id}
              className={`p-6 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} hover:shadow-lg transition-shadow`}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <IconComponent className={`w-6 h-6 ${technique.color}`} />
                  <div>
                    <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {technique.name}
                    </h3>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {technique.timeRequired}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${getDifficultyColor(technique.difficulty)}`}>
                    {technique.difficulty}
                  </span>
                  <div className={`text-sm font-medium ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                    {technique.effectiveness}%
                  </div>
                </div>
              </div>

              {/* Description */}
              <p className={`mb-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                {technique.description}
              </p>

              {/* Best For */}
              <div className="mb-4">
                <h4 className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Best for:
                </h4>
                <div className="flex flex-wrap gap-2">
                  {technique.bestFor.map((item, index) => (
                    <span
                      key={index}
                      className={`text-xs px-2 py-1 rounded-full ${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              {/* Steps */}
              <div className="mb-4">
                <h4 className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  How to do it:
                </h4>
                <ol className="space-y-1">
                  {technique.steps.map((step, index) => (
                    <li key={index} className={`text-sm flex ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      <span className={`mr-2 font-medium ${technique.color}`}>
                        {index + 1}.
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>

              {/* Tips */}
              <div>
                <h4 className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  💡 Pro Tips:
                </h4>
                <ul className="space-y-1">
                  {technique.tips.map((tip, index) => (
                    <li key={index} className={`text-sm flex ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      <span className="mr-2">•</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>

      {filteredTechniques.length === 0 && (
        <div className={`p-8 rounded-lg text-center ${isDarkMode ? 'bg-gray-800' : 'bg-white'} border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <BookOpen className={`w-16 h-16 mx-auto mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} />
          <h3 className={`text-xl font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            No techniques found
          </h3>
          <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Try adjusting your filters to see more study techniques.
          </p>
        </div>
      )}
    </div>
  );
}