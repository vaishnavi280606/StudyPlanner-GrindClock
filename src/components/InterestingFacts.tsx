import { useState, useEffect } from 'react';
import { Lightbulb, RefreshCw } from 'lucide-react';

interface InterestingFactsProps {
  isDarkMode: boolean;
}

const studyFacts = [
  {
    title: "The Pomodoro Effect",
    fact: "Studies show that 25-minute focused sessions followed by 5-minute breaks can increase productivity by up to 40%."
  },
  {
    title: "Memory Palace Technique",
    fact: "Ancient Greek and Roman orators used spatial memory techniques to memorize entire speeches. This method is still 6x more effective than rote learning."
  },
  {
    title: "The Testing Effect",
    fact: "Testing yourself on material increases retention by 50% compared to just re-reading. Your brain loves the challenge!"
  },
  {
    title: "Sleep & Learning",
    fact: "Your brain consolidates memories during sleep. Students who sleep 7-9 hours perform 40% better on tests than those who pull all-nighters."
  },
  {
    title: "The Spacing Effect",
    fact: "Reviewing material at increasing intervals (1 day, 3 days, 1 week, 2 weeks) can improve long-term retention by up to 200%."
  },
  {
    title: "Exercise Boost",
    fact: "Just 20 minutes of exercise before studying increases focus and memory formation by releasing BDNF (brain-derived neurotrophic factor)."
  },
  {
    title: "The Generation Effect",
    fact: "Information you generate yourself (like creating your own examples) is remembered 3x better than information you simply read."
  },
  {
    title: "Handwriting vs Typing",
    fact: "Students who take notes by hand retain information 34% better than those who type, due to the deeper processing required."
  },
  {
    title: "The Feynman Technique",
    fact: "If you can't explain something simply, you don't understand it well enough. Teaching concepts to others improves your own understanding by 90%."
  },
  {
    title: "Background Music",
    fact: "Instrumental music at 60-70 BPM can improve focus and retention, but lyrics can reduce comprehension by up to 60%."
  },
  {
    title: "The Zeigarnik Effect",
    fact: "Your brain remembers interrupted tasks 90% better than completed ones. Use this by taking breaks mid-chapter!"
  },
  {
    title: "Hydration Impact",
    fact: "Even 2% dehydration can reduce cognitive performance by 23%. Keep that water bottle handy during study sessions!"
  },
  {
    title: "The Protégé Effect",
    fact: "Students who expect to teach material to others learn 28% more effectively, even if they never actually teach it."
  },
  {
    title: "Dual Coding Theory",
    fact: "Combining visual and verbal information (like diagrams with text) can improve learning effectiveness by up to 89%."
  },
  {
    title: "The Reminiscence Bump",
    fact: "Information learned between ages 15-25 is remembered most vividly throughout life. You're in your prime learning years!"
  },
  {
    title: "The Google Effect",
    fact: "Your brain is less likely to remember information it knows it can easily access later. Write important points by hand to combat this!"
  },
  {
    title: "Chocolate & Cognition",
    fact: "Dark chocolate (70%+ cacao) can improve cognitive function by 23% within 2 hours due to flavonoids increasing blood flow to the brain."
  },
  {
    title: "The Doodling Advantage",
    fact: "People who doodle while listening retain 29% more information than those who don't. Your brain stays just engaged enough to focus!"
  },
  {
    title: "Temperature & Learning",
    fact: "The optimal room temperature for studying is 68-72°F (20-22°C). Too hot or cold reduces cognitive performance by up to 15%."
  },
  {
    title: "The Doorway Effect",
    fact: "Walking through doorways can cause you to forget what you were thinking about. Study in one location to maintain mental continuity!"
  },
  {
    title: "Mirror Neurons",
    fact: "Watching someone perform a skill activates the same brain regions as doing it yourself. Study videos can literally rewire your brain!"
  },
  {
    title: "The Reminiscence Effect",
    fact: "You remember the first and last items in a list best. Put the most important information at the beginning and end of study sessions."
  },
  {
    title: "Caffeine's Sweet Spot",
    fact: "100-200mg of caffeine (1-2 cups of coffee) peaks brain performance, but 400mg+ actually impairs memory formation by 40%."
  },
  {
    title: "The Isolation Effect",
    fact: "Information that stands out (different colors, fonts, or formats) is remembered 3x better. Make important concepts visually unique!"
  },
  {
    title: "Meditation & Memory",
    fact: "Just 8 weeks of meditation practice increases gray matter density in the hippocampus by 5%, dramatically improving memory formation."
  },
  {
    title: "The Curiosity Gap",
    fact: "When you're curious about something, your brain releases dopamine, making you 65% more likely to remember related information."
  },
  {
    title: "Smell & Memory",
    fact: "Studying with a specific scent (like peppermint) and using it again during tests can improve recall by 40% due to context-dependent memory."
  },
  {
    title: "The Forgetting Curve",
    fact: "You forget 50% of new information within an hour, but reviewing within 24 hours can retain 80% for weeks. Timing is everything!"
  },
  {
    title: "Blue Light & Focus",
    fact: "Blue light exposure increases alertness and cognitive performance by 25%, but avoid it 2 hours before sleep to protect memory consolidation."
  },
  {
    title: "The Elaboration Effect",
    fact: "Asking yourself 'why' and 'how' questions about material creates neural pathways that improve retention by 60%."
  },
  {
    title: "Multitasking Myth",
    fact: "Your brain can't actually multitask - it switches between tasks, reducing efficiency by 40% and increasing errors by 50%."
  },
  {
    title: "The Method of Loci",
    fact: "Memory champions use spatial memory to remember 1000+ digits of pi. Your brain evolved to remember locations better than abstract information."
  },
  {
    title: "Stress & Learning",
    fact: "Moderate stress improves learning by 15%, but high stress shrinks the hippocampus and can reduce memory formation by 50%."
  },
  {
    title: "The Picture Superiority Effect",
    fact: "Images are processed 60,000x faster than text by the brain. Visual learners aren't imagining it - pictures really do help!"
  },
  {
    title: "Interleaving Practice",
    fact: "Mixing different types of problems during study (instead of blocking) improves problem-solving skills by 43%."
  },
  {
    title: "The Einstellung Effect",
    fact: "Previous knowledge can blind you to better solutions. Taking breaks helps your brain find creative approaches to problems."
  },
  {
    title: "Neuroplasticity Peak",
    fact: "Your brain forms new neural connections fastest during the first 20 minutes of learning something new. Make those minutes count!"
  },
  {
    title: "The Contrast Effect",
    fact: "Studying difficult material before easier material makes the easy stuff seem 30% easier and improves confidence."
  },
  {
    title: "Chunking Power",
    fact: "Your working memory can hold 7±2 items, but chunking information (like phone numbers) can expand this to 20+ items effectively."
  },
  {
    title: "The Hawthorne Effect",
    fact: "Simply tracking your study habits can improve performance by 20% - your brain responds to being observed, even by yourself!"
  }
];

export function InterestingFacts({ isDarkMode }: InterestingFactsProps) {
  const [currentFact, setCurrentFact] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [recentlyShown, setRecentlyShown] = useState<number[]>([]);

  useEffect(() => {
    // Load previously shown facts from localStorage
    const stored = localStorage.getItem('grind_clock_recent_facts');
    const storedFacts = stored ? JSON.parse(stored) : [];
    setRecentlyShown(storedFacts);
    
    // Show a random fact that hasn't been shown recently
    const availableFacts = studyFacts
      .map((_, index) => index)
      .filter(index => !storedFacts.includes(index));
    
    const randomIndex = availableFacts.length > 0 
      ? availableFacts[Math.floor(Math.random() * availableFacts.length)]
      : Math.floor(Math.random() * studyFacts.length);
    
    setCurrentFact(randomIndex);
  }, []);

  const getNewFact = () => {
    setIsAnimating(true);
    setTimeout(() => {
      // Get facts that haven't been shown recently
      const maxRecentFacts = Math.min(15, Math.floor(studyFacts.length * 0.4)); // Remember last 15 facts or 40% of total
      const availableFacts = studyFacts
        .map((_, index) => index)
        .filter(index => index !== currentFact && !recentlyShown.includes(index));
      
      let newIndex;
      
      if (availableFacts.length === 0) {
        // If all facts have been shown recently, reset and exclude only current fact
        newIndex = studyFacts
          .map((_, index) => index)
          .filter(index => index !== currentFact)[Math.floor(Math.random() * (studyFacts.length - 1))];
        setRecentlyShown([currentFact]); // Reset with only current fact
      } else {
        // Pick from available facts
        newIndex = availableFacts[Math.floor(Math.random() * availableFacts.length)];
      }
      
      // Update recently shown facts
      const updatedRecent = [currentFact, ...recentlyShown].slice(0, maxRecentFacts);
      setRecentlyShown(updatedRecent);
      
      // Save to localStorage for persistence across sessions
      localStorage.setItem('grind_clock_recent_facts', JSON.stringify(updatedRecent));
      
      setCurrentFact(newIndex);
      setIsAnimating(false);
    }, 200);
  };

  const fact = studyFacts[currentFact];

  return (
    <div className={`rounded-xl p-6 shadow-md border transition-colors ${
      isDarkMode 
        ? 'bg-gradient-to-br from-indigo-900 to-purple-900 border-indigo-700' 
        : 'bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200'
    }`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Lightbulb className={`${isDarkMode ? 'text-yellow-400' : 'text-indigo-600'}`} size={24} />
          <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-indigo-900'}`}>
            Did You Know?
          </h3>
        </div>
        <button
          onClick={getNewFact}
          className={`p-2 rounded-lg transition-all hover:scale-110 ${
            isDarkMode 
              ? 'bg-indigo-800 text-indigo-200 hover:bg-indigo-700' 
              : 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'
          } ${isAnimating ? 'animate-spin' : ''}`}
          title="Get new fact"
        >
          <RefreshCw size={16} />
        </button>
      </div>
      
      <div className={`transition-opacity duration-200 ${isAnimating ? 'opacity-0' : 'opacity-100'}`}>
        <h4 className={`font-semibold mb-2 ${isDarkMode ? 'text-indigo-200' : 'text-indigo-800'}`}>
          {fact.title}
        </h4>
        <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-indigo-100' : 'text-indigo-700'}`}>
          {fact.fact}
        </p>
      </div>
    </div>
  );
}