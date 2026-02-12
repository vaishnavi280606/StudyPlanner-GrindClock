import React, { useState, useEffect, useCallback } from 'react';
import { Users, MessageCircle, Video, Search, Loader2, Calendar } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { fetchSessionRequests, fetchUnreadCounts } from '../utils/supabase-queries';
import { ChatBox } from './ChatBox';

interface MentorStudentsPageProps {
  isDarkMode: boolean;
  onStartVideoCall?: (name: string, avatar?: string, friendId?: string) => void;
}

export const MentorStudentsPage: React.FC<MentorStudentsPageProps> = ({ isDarkMode, onStartVideoCall }) => {
  const { user } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [selectedChat, setSelectedChat] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const dark = isDarkMode;

  const loadStudents = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const sessions = await fetchSessionRequests(user.id, 'mentor');
      // Deduplicate students from sessions
      const studentMap = new Map<string, any>();
      for (const sess of sessions) {
        if (sess.studentId && sess.studentProfile && !studentMap.has(sess.studentId)) {
          studentMap.set(sess.studentId, {
            id: sess.studentId,
            name: sess.studentProfile.fullName || 'Student',
            avatarUrl: sess.studentProfile.avatarUrl,
            status: 'online',
            role: 'student',
            lastSession: sess.preferredDate || '',
            sessionTopic: sess.topic || '',
            sessionStatus: sess.status,
          });
        }
      }
      setStudents(Array.from(studentMap.values()));
    } catch (err) {
      console.error('Error loading students:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadUnreadCounts = useCallback(async () => {
    if (!user) return;
    const counts = await fetchUnreadCounts(user.id);
    setUnreadCounts(counts);
  }, [user]);

  useEffect(() => {
    if (user) {
      loadStudents();
      loadUnreadCounts();
    }
  }, [user, loadStudents, loadUnreadCounts]);

  const openChat = (student: any) => {
    setUnreadCounts(prev => {
      const next = { ...prev };
      delete next[student.id];
      return next;
    });
    setSelectedChat(student);
  };

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.sessionTopic && s.sessionTopic.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // If a chat is open, show ChatBox full screen
  if (selectedChat) {
    return (
      <ChatBox
        friend={selectedChat}
        friends={students}
        groups={[]}
        onClose={() => setSelectedChat(null)}
        onSelectFriend={(f: any) => openChat(f)}
        onStartVideoCall={onStartVideoCall || (() => {})}
        isDarkMode={isDarkMode}
        unreadCounts={unreadCounts}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 sm:px-6 lg:px-8">
      <div>
        <h2 className={`text-3xl font-bold ${dark ? 'text-white' : 'text-slate-900'}`}>My Students</h2>
        <p className={dark ? 'text-slate-400' : 'text-slate-600'}>Students you've connected with through sessions</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${dark ? 'text-slate-400' : 'text-slate-500'}`} size={18} />
        <input
          type="text"
          placeholder="Search students..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className={`w-full pl-10 pr-4 py-3 rounded-xl border transition-all ${dark ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-amber-500' : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-amber-500'}`}
        />
      </div>

      {/* Student List */}
      {filteredStudents.length === 0 ? (
        <div className={`text-center py-16 rounded-2xl border ${dark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}`}>
          <Users className={`mx-auto mb-3 ${dark ? 'text-slate-600' : 'text-slate-300'}`} size={48} />
          <p className={dark ? 'text-slate-400' : 'text-slate-600'}>
            {searchQuery ? 'No students match your search' : 'No students yet. Accept session requests to connect with students.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredStudents.map(student => {
            const unread = unreadCounts[student.id] || 0;
            return (
              <button
                key={student.id}
                onClick={() => openChat(student)}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left group ${
                  unread > 0
                    ? (dark
                      ? 'bg-gradient-to-r from-purple-500/15 via-blue-500/10 to-transparent border-purple-500/30 shadow-sm shadow-purple-500/10'
                      : 'bg-gradient-to-r from-purple-50 via-blue-50 to-transparent border-purple-300 shadow-sm')
                    : dark
                      ? 'bg-slate-800 border-slate-700 hover:border-amber-500/40 hover:bg-slate-750'
                      : 'bg-white border-slate-200 hover:border-amber-500/40 hover:shadow-md'
                }`}
              >
                <div className="relative shrink-0">
                  <img
                    src={student.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(student.name)}&background=random`}
                    alt={student.name}
                    className="w-12 h-12 rounded-full object-cover border-2 border-amber-500/20"
                  />
                  {unread > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[20px] h-5 flex items-center justify-center px-1 rounded-full text-[10px] font-bold bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-sm shadow-purple-500/30">
                      {unread > 99 ? '99+' : unread}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className={`font-bold truncate ${dark ? 'text-white' : 'text-slate-900'}`}>{student.name}</h4>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full capitalize ${
                      student.sessionStatus === 'accepted' ? 'bg-green-500/10 text-green-500' :
                      student.sessionStatus === 'completed' ? 'bg-blue-500/10 text-blue-500' :
                      student.sessionStatus === 'pending' ? 'bg-amber-500/10 text-amber-500' :
                      'bg-slate-500/10 text-slate-500'
                    }`}>
                      {student.sessionStatus}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    {student.sessionTopic && (
                      <p className={`text-sm truncate ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
                        {student.sessionTopic}
                      </p>
                    )}
                    {student.lastSession && (
                      <span className={`text-[11px] flex items-center gap-1 shrink-0 ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
                        <Calendar size={11} /> {student.lastSession}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className={`p-2 rounded-lg ${dark ? 'bg-slate-700 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                    <MessageCircle size={16} />
                  </span>
                  {onStartVideoCall && (
                    <span
                      onClick={e => { e.stopPropagation(); onStartVideoCall(student.name, student.avatarUrl, student.id); }}
                      className={`p-2 rounded-lg cursor-pointer ${dark ? 'bg-slate-700 text-green-400' : 'bg-green-50 text-green-600'}`}
                    >
                      <Video size={16} />
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
