import { useState, useEffect, useRef } from 'react';
import { X, Send, Bot, Search, HelpCircle, Book, Clock, Target, BarChart3, Calendar, Flame, Calculator, Atom, Globe, Beaker, Code, PenTool, ArrowRight, LucideIcon } from 'lucide-react';

interface DoubtSolverProps {
  isDarkMode: boolean;
}

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  icon: LucideIcon;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
}

const faqs: FAQ[] = [
  {
    id: 'timer',
    question: 'How do I start a study timer?',
    answer: 'Go to the Study Timer section, select a subject, set your desired duration, and click "Start Timer".',
    category: 'timer',
    icon: Clock
  },
  {
    id: 'subjects',
    question: 'How do I add new subjects?',
    answer: 'Navigate to Subject Manager, click "Add Subject", enter the subject name, choose a color, and set your target study hours.',
    category: 'subjects',
    icon: Book
  },
  {
    id: 'goals',
    question: 'How do I create study goals?',
    answer: 'Go to Goals Manager, click "Add Goal", fill in the details, select subjects, and set target date.',
    category: 'goals',
    icon: Target
  }
];

const categories = [
  { id: 'all', name: 'All Topics', icon: HelpCircle },
  { id: 'timer', name: 'Study Timer', icon: Clock },
  { id: 'subjects', name: 'Subjects', icon: Book },
  { id: 'goals', name: 'Goals', icon: Target },
  { id: 'math', name: 'Mathematics', icon: Calculator },
  { id: 'physics', name: 'Physics', icon: Atom },
  { id: 'chemistry', name: 'Chemistry', icon: Beaker }
];

// Gemini API Integration
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

async function askGemini(question: string, history: ChatMessage[] = []): Promise<string> {
  if (!GEMINI_API_KEY) {
    return "⚠️ **Gemini AI not configured**\n\nTo enable AI responses:\n1. Get free API key: https://makersuite.google.com/app/apikey\n2. Add to .env: VITE_GEMINI_API_KEY=your-key\n3. Restart server\n\nFor now, try browsing the FAQ section!";
  }

  try {
    const systemPrompt = `You are an expert AI study assistant for students. Provide clear, accurate, and helpful responses about:
- Math, Physics, Chemistry, Biology (with step-by-step solutions)
- Programming and Computer Science
- Study techniques and strategies
- Time management and productivity
- Using the Grind Clock study app

Be friendly, encouraging, and provide detailed explanations with examples.`;

    const contents = [
      {
        role: 'user',
        parts: [{ text: systemPrompt }]
      },
      {
        role: 'model',
        parts: [{ text: 'I understand. I will provide accurate, detailed, and helpful responses to students.' }]
      },
      ...history.slice(-4).map(msg => ({
        role: msg.type === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      })),
      {
        role: 'user',
        parts: [{ text: question }]
      }
    ];

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.4,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        }
      })
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
      return data.candidates[0].content.parts[0].text;
    }
    
    throw new Error('No response from Gemini');
  } catch (error) {
    console.error('Gemini Error:', error);
    return "I'm having trouble connecting right now. Please try again in a moment. 🔄";
  }
}

export function DoubtSolver({ isDarkMode }: DoubtSolverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [customQuestion, setCustomQuestion] = useState('');
  const [activeTab, setActiveTab] = useState<'faq' | 'chat'>('chat');
  const [isTyping, setIsTyping] = useState(false);
  const chatMessagesRef = useRef<HTMLDivElement>(null);

  const welcomeMessage = GEMINI_API_KEY 
    ? "Hello! I'm your AI study assistant powered by Google Gemini! 🤖✨\n\nI can help you with:\n📐 Math, Physics, Chemistry\n💻 Programming\n📚 Study strategies\n🎯 Grind Clock features\n\nAsk me anything!"
    : "Hello! I'm your AI study assistant! 🤖\n\n⚠️ Gemini AI is not configured yet.\n\nGet your FREE API key:\n1. Visit: https://makersuite.google.com/app/apikey\n2. Add to .env file\n3. Restart server\n\nFor now, check out the FAQ section!";

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'bot',
      content: welcomeMessage,
      timestamp: new Date()
    }
  ]);

  const filteredFAQs = faqs.filter(faq => {
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    const matchesSearch = faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleSubmitQuestion = async () => {
    const question = customQuestion.trim();
    if (!question) return;
    
    // Add user message
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: question,
      timestamp: new Date()
    };
    
    setChatMessages(prev => [...prev, userMsg]);
    setCustomQuestion('');
    setIsTyping(true);
    
    // Get AI response
    const aiResponse = await askGemini(question, chatMessages);
    
    const botMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      type: 'bot',
      content: aiResponse,
      timestamp: new Date()
    };
    
    setChatMessages(prev => [...prev, botMsg]);
    setIsTyping(false);
  };

  const clearChat = () => {
    setChatMessages([
      {
        id: '1',
        type: 'bot',
        content: welcomeMessage,
        timestamp: new Date()
      }
    ]);
  };

  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [chatMessages, isTyping]);

  return (
    <>
      {/* Floating Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setIsOpen(true)}
          className={`relative w-16 h-16 rounded-full shadow-2xl transition-all duration-300 hover:scale-110 ${
            isDarkMode
              ? 'bg-gradient-to-br from-blue-600 to-purple-700'
              : 'bg-gradient-to-br from-blue-500 to-purple-600'
          }`}
        >
          <Bot className="text-white mx-auto" size={28} />
          <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
            AI
          </div>
        </button>
      </div>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-2xl h-[80vh] rounded-2xl shadow-2xl flex flex-col ${
            isDarkMode ? 'bg-slate-800' : 'bg-white'
          }`}>
            {/* Header */}
            <div className={`p-6 border-b ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bot className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} size={24} />
                  <div>
                    <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      AI Study Assistant
                    </h2>
                    <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                      {GEMINI_API_KEY ? '✅ Gemini AI Active' : '⚠️ Limited Mode'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className={`flex border-b ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
              <button
                onClick={() => setActiveTab('chat')}
                className={`flex-1 px-6 py-3 font-medium ${
                  activeTab === 'chat'
                    ? isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
                    : isDarkMode ? 'text-slate-300' : 'text-slate-600'
                }`}
              >
                💬 AI Chat
              </button>
              <button
                onClick={() => setActiveTab('faq')}
                className={`flex-1 px-6 py-3 font-medium ${
                  activeTab === 'faq'
                    ? isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
                    : isDarkMode ? 'text-slate-300' : 'text-slate-600'
                }`}
              >
                📚 FAQ
              </button>
            </div>

            {/* Chat Tab */}
            {activeTab === 'chat' && (
              <div className="flex flex-col flex-1 min-h-0">
                {/* Messages */}
                <div 
                  ref={chatMessagesRef}
                  className="flex-1 overflow-y-auto p-4 space-y-4"
                >
                  {chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] p-3 rounded-lg ${
                          msg.type === 'user'
                            ? 'bg-blue-500 text-white'
                            : isDarkMode ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        {msg.type === 'bot' && (
                          <div className="flex items-center gap-2 mb-2">
                            <Bot size={16} />
                            <span className="text-xs font-medium">AI Assistant</span>
                          </div>
                        )}
                        <div className="whitespace-pre-line text-sm">{msg.content}</div>
                        <div className="text-xs mt-2 opacity-70">
                          {msg.timestamp.toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {isTyping && (
                    <div className="flex justify-start">
                      <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Input */}
                <div className={`p-4 border-t ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                  <button
                    onClick={clearChat}
                    className={`text-xs px-3 py-1 rounded mb-2 ${
                      isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    Clear Chat
                  </button>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Ask me anything..."
                      value={customQuestion}
                      onChange={(e) => setCustomQuestion(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && !isTyping && handleSubmitQuestion()}
                      disabled={isTyping}
                      className={`flex-1 px-3 py-2 rounded-lg border ${
                        isDarkMode
                          ? 'bg-slate-700 border-slate-600 text-white'
                          : 'bg-slate-50 border-slate-200 text-slate-900'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    />
                    <button
                      onClick={handleSubmitQuestion}
                      disabled={!customQuestion.trim() || isTyping}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg disabled:opacity-50"
                    >
                      <Send size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* FAQ Tab */}
            {activeTab === 'faq' && (
              <div className="flex-1 overflow-y-auto p-4">
                <input
                  type="text"
                  placeholder="Search FAQs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full px-4 py-2 rounded-lg border mb-4 ${
                    isDarkMode
                      ? 'bg-slate-700 border-slate-600 text-white'
                      : 'bg-white border-slate-200 text-slate-900'
                  }`}
                />
                
                <div className="space-y-4">
                  {filteredFAQs.map((faq) => {
                    const Icon = faq.icon;
                    return (
                      <div
                        key={faq.id}
                        className={`p-4 rounded-lg ${
                          isDarkMode ? 'bg-slate-700' : 'bg-slate-50'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <Icon size={20} className="text-blue-500 mt-1" />
                          <div>
                            <h3 className={`font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                              {faq.question}
                            </h3>
                            <p className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                              {faq.answer}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
