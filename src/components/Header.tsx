import React from 'react';
import { Menu, Zap, Sun, Moon, LayoutDashboard, Clock, BookOpen, Users, GraduationCap, History, User } from 'lucide-react';
import { NotificationCenter } from './NotificationCenter';
import { UserProfile } from './UserProfile';

interface HeaderProps {
    isDarkMode: boolean;
    setIsDarkMode: (isDark: boolean) => void;
    isSidebarOpen: boolean;
    setIsSidebarOpen: (isOpen: boolean) => void;
    currentView: string;
    setCurrentView: (view: any) => void;
    totalUnreadMessages: number;
    onNotificationClick: (type: 'message' | 'call' | 'friend_request', data?: any) => void;
    userRole?: 'student' | 'mentor';
    // Timer props
    timerState?: {
        isRunning: boolean;
        isPaused: boolean;
        elapsedSeconds: number;
        selectedSubjectId: string;
    };
    formatTime?: (seconds: number) => string;
    onTimerPause?: () => void;
    onTimerResume?: () => void;
    subjects?: Array<{ id: string; name: string; color: string }>;
}

export const Header: React.FC<HeaderProps> = ({
    isDarkMode,
    setIsDarkMode,
    isSidebarOpen,
    setIsSidebarOpen,
    currentView,
    setCurrentView,
    totalUnreadMessages,
    onNotificationClick,
    userRole = 'student',
    timerState,
    formatTime,
    onTimerPause,
    onTimerResume,
    subjects
}) => {
    // Different navigation for mentors vs students
    const mainNavigation = userRole === 'mentor'
        ? [
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'mentors', label: 'My Students', icon: GraduationCap },
            { id: 'profile', label: 'My Profile', icon: User },
        ]
        : [
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'timer', label: 'Study Timer', icon: Clock },
            { id: 'subjects', label: 'Subjects', icon: BookOpen },
            { id: 'friends', label: 'Friends', icon: Users },
            { id: 'mentors', label: 'Mentors', icon: GraduationCap },
            { id: 'history', label: 'History', icon: History },
        ];

    const showTimer = timerState?.isRunning && currentView !== 'timer' && userRole === 'student';

    return (
        <nav className={`shadow-md border-b transition-colors relative z-40 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <div className="w-full px-6 py-4">
                <div className="flex items-center justify-between">
                    {/* Logo and Text */}
                    <div className="flex items-center gap-3">
                        {/* Menu Toggle Button - Only visible when sidebar is closed */}
                        {!isSidebarOpen && (
                            <button
                                onClick={() => setIsSidebarOpen(true)}
                                className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-600'
                                    }`}
                                title="Show menu"
                            >
                                <Menu size={24} />
                            </button>
                        )}

                        {!isSidebarOpen && (
                            <>
                                <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-2 rounded-xl shadow-lg">
                                    <Zap className="text-white" size={28} />
                                </div>
                                <div>
                                    <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Grind Clock</h1>
                                    <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Push Your Limits</p>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Main Navigation - Desktop */}
                    <div className="hidden lg:flex gap-2 items-center">
                        {mainNavigation.map((item) => {
                            const Icon = item.icon;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => setCurrentView(item.id)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${currentView === item.id
                                        ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md'
                                        : isDarkMode ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-100'
                                        }`}
                                >
                                    <Icon size={18} />
                                    <span>{item.label}</span>
                                    {item.id === 'friends' && totalUnreadMessages > 0 && (
                                        <span className="ml-1 min-w-[18px] h-[18px] flex items-center justify-center px-1 rounded-full bg-amber-500 text-white text-[10px] font-bold leading-none">
                                            {totalUnreadMessages > 99 ? '99+' : totalUnreadMessages}
                                        </span>
                                    )}
                                </button>
                            );
                        })}

                        {/* Timer Display - Only when timer is running and not on timer page */}
                        {showTimer && formatTime && (
                            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
                                <div
                                    className="w-2 h-2 rounded-full animate-pulse"
                                    style={{
                                        backgroundColor: subjects?.find((s) => s.id === timerState.selectedSubjectId)?.color || '#f59e0b',
                                    }}
                                />
                                <span className={`text-sm font-mono font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                    {formatTime(timerState.elapsedSeconds)}
                                </span>
                                {timerState.isPaused ? (
                                    <button
                                        onClick={onTimerResume}
                                        className="p-1 hover:bg-amber-500/20 rounded transition-colors"
                                        title="Resume"
                                    >
                                        <svg className="w-3 h-3 text-amber-500" fill="currentColor" viewBox="0 0 16 16">
                                            <path d="M3 1.5A1.5 1.5 0 0 1 4.5 0h7A1.5 1.5 0 0 1 13 1.5v13a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 3 14.5v-13zM4.5 1a.5.5 0 0 0-.5.5v13a.5.5 0 0 0 .5.5h7a.5.5 0 0 0 .5-.5v-13a.5.5 0 0 0-.5-.5h-7z" />
                                            <path d="m5.5 4 4.5 3.5-4.5 3.5V4z" />
                                        </svg>
                                    </button>
                                ) : (
                                    <button
                                        onClick={onTimerPause}
                                        className="p-1 hover:bg-yellow-500/20 rounded transition-colors"
                                        title="Pause"
                                    >
                                        <svg className="w-3 h-3 text-yellow-500" fill="currentColor" viewBox="0 0 16 16">
                                            <path d="M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5zm5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5z" />
                                        </svg>
                                    </button>
                                )}
                                <button
                                    onClick={() => setCurrentView('timer')}
                                    className={`text-xs px-2 py-1 rounded font-medium transition-colors ${isDarkMode ? 'hover:bg-slate-600 text-slate-300' : 'hover:bg-slate-200 text-slate-600'}`}
                                >
                                    View
                                </button>
                            </div>
                        )}

                        {/* Dark Mode Toggle */}
                        <button
                            onClick={() => setIsDarkMode(!isDarkMode)}
                            className={`p-2 rounded-lg transition-all ${isDarkMode ? 'bg-slate-700 text-yellow-400' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                        >
                            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                        </button>

                        <NotificationCenter isDarkMode={isDarkMode} onNotificationClick={onNotificationClick} />

                        {/* Profile Icon */}
                        <UserProfile
                            isDarkMode={isDarkMode}
                            variant="header"
                            onSettingsClick={() => setCurrentView('settings')}
                        />
                    </div>

                    {/* Mobile Navigation */}
                    <div className="flex lg:hidden items-center gap-2">
                        <NotificationCenter isDarkMode={isDarkMode} onNotificationClick={onNotificationClick} />

                        {/* Profile Icon - Mobile */}
                        <UserProfile
                            isDarkMode={isDarkMode}
                            variant="header"
                            onSettingsClick={() => setCurrentView('settings')}
                        />

                        <button
                            onClick={() => setIsDarkMode(!isDarkMode)}
                            className={`p-2 rounded-lg transition-all ${isDarkMode ? 'bg-slate-700 text-yellow-400' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                        >
                            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
};
