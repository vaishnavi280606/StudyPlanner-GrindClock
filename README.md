# 🔥 Grind Clock - AI-Powered Study Planner

> Your personal study companion to track progress, manage exams, and boost productivity with AI assistance.

[![React](https://img.shields.io/badge/React-18.3.1-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5.3-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4.2-646CFF.svg)](https://vitejs.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth-green.svg)](https://supabase.com/)
[![Gemini AI](https://img.shields.io/badge/Gemini-AI-orange.svg)](https://ai.google.dev/)

## ✨ Features

### 📊 **Performance Analytics**
- Real-time performance tracking with interactive line graphs
- Monthly focus rating trends
- Study hours visualization
- Progress insights and statistics

### 📅 **Exam Management**
- Smart exam countdown with urgency indicators
- Auto-completion when exams pass
- Exam date, time, and location tracking
- Color-coded urgency levels (urgent, soon, upcoming)

### 🎯 **Goals & Tracking**
- Create study goals and exam schedules
- Track completion progress
- Goal reminders and notifications
- Separate tabs for goals and exams

### ⏱️ **Study Timer**
- Draggable floating timer
- Focus rating system (1-5 scale)
- Session notes and tracking
- Persistent timer across pages

### 🤖 **AI Study Assistant**
- Powered by Google Gemini 2.0 Flash
- Get instant help with math, science, programming
- Study tips and concept explanations
- Rate limit handling with auto-retry

### 🎨 **User Experience**
- Dark/Light theme with persistence
- Customizable user profile
- Auto-hiding sidebar
- Responsive design for all devices
- Clean, modern UI with Tailwind CSS

### 📈 **Dashboard**
- Overview of study statistics
- Active goals display
- Weekly progress tracking
- Interesting study facts

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Supabase account
- Google Gemini API key

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/vaishnavi280606/StudyPlanner-GrindClock.git
cd StudyPlanner-GrindClock
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GEMINI_API_KEY=your_gemini_api_key
```

4. **Run the development server**
```bash
npm run dev
```

5. **Open your browser**
Navigate to `http://localhost:5173`

## 🛠️ Tech Stack

- **Frontend:** React 18, TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **Authentication:** Supabase Auth
- **AI Integration:** Google Gemini 2.0 Flash
- **Icons:** Lucide React
- **State Management:** React Hooks

## 📦 Project Structure

```
StudyPlanner-GrindClock/
├── src/
│   ├── components/          # React components
│   │   ├── Dashboard.tsx
│   │   ├── ExamCountdown.tsx
│   │   ├── StudyTimer.tsx
│   │   ├── AIChatbot.tsx
│   │   ├── AdvancedAnalytics.tsx
│   │   └── ...
│   ├── contexts/            # React contexts
│   │   └── AuthContext.tsx
│   ├── utils/               # Utility functions
│   │   ├── storage.ts
│   │   └── supabase.ts
│   ├── types.ts             # TypeScript types
│   ├── App.tsx              # Main app component
│   └── main.tsx             # Entry point
├── .env.example             # Environment variables template
├── package.json
└── README.md
```

## 🎯 Key Features Explained

### Exam Countdown
- Displays the nearest upcoming exam on the dashboard
- Shows days/hours remaining with color-coded urgency
- Includes motivational messages and study tips
- Automatically hides after exam completion
- Click to navigate to exam details

### Performance Chart
- Tracks focus ratings from the start of the month
- Interactive line graph with hover tooltips
- Shows all dates with corresponding performance
- Horizontal scrolling for easy navigation
- Clean visualization without grid lines

### AI Study Assistant
- Context-aware responses for study help
- Supports math, science, programming queries
- Provides study tips and techniques
- Clear chat functionality
- Rate limit handling with exponential backoff

## 🔧 Configuration

### Supabase Setup
1. Create a project at [supabase.com](https://supabase.com)
2. Enable Email authentication
3. Copy your project URL and anon key
4. Add to `.env` file

### Gemini API Setup
1. Get API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Add to `.env` file as `VITE_GEMINI_API_KEY`

## 📱 Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import project on [Vercel](https://vercel.com)
3. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_GEMINI_API_KEY`
4. Deploy!

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/vaishnavi280606/StudyPlanner-GrindClock)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 👤 Author

**Vaishnavi**
- GitHub: [@vaishnavi280606](https://github.com/vaishnavi280606)

## 🙏 Acknowledgments

- [React](https://reactjs.org/) - UI Framework
- [Vite](https://vitejs.dev/) - Build Tool
- [Supabase](https://supabase.com/) - Backend & Auth
- [Google Gemini](https://ai.google.dev/) - AI Integration
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Lucide](https://lucide.dev/) - Icons

---

<div align="center">
  <strong>⭐ Star this repo if you find it helpful!</strong>
  <br>
  Made with ❤️ and ☕
</div>
