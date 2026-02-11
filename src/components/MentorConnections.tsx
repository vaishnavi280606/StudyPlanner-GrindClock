import React, { useState, useEffect } from 'react';
import { User, MessageCircle, Video, Search, GraduationCap, Briefcase, UserPlus, Users, UserMinus, X, AlertTriangle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../utils/supabase';
import { createNotification } from '../utils/supabase-queries';

interface MentorConnectionsProps {
  isDarkMode: boolean;
  onStartVideoCall?: (name: string, avatar: string, userId: string) => void;
  onStartChat?: (participant: any) => void;
  onViewProfile?: (userId: string) => void;
}

interface ConnectionUser {
  user_id: string;
  full_name: string;
  avatar_url: string;
  role: 'student' | 'mentor';
  username?: string;
  bio?: string;
  domain?: string[];
  profession?: string;
  experience?: string;
  class?: string;
  course?: string;
  hasActiveSession?: boolean;
  sessionTopic?: string;
  sessionDate?: string;
  sessionTime?: string;
  sessionMode?: 'chat' | 'call' | 'video';
  sessionId?: string;
}

const MentorConnections: React.FC<MentorConnectionsProps> = ({ 
  isDarkMode, 
  onStartVideoCall,
  onStartChat,
  onViewProfile 
}) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'students' | 'mentors' | 'all'>('students');
  const [existingConnections, setExistingConnections] = useState<ConnectionUser[]>([]);
  const [availableUsers, setAvailableUsers] = useState<ConnectionUser[]>([]);
  const [existingSearchQuery, setExistingSearchQuery] = useState('');
  const [findSearchQuery, setFindSearchQuery] = useState('');
  const [showRemoveModal, setShowRemoveModal] = useState<ConnectionUser | null>(null);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    if (user) {
      loadExistingConnections();
      if (activeTab !== 'all') {
        loadAvailableUsers();
      }
    }
  }, [user, activeTab]);

  const loadExistingConnections = async () => {
    if (!user) return;
    try {
      if (activeTab === 'students' || activeTab === 'all') {
        // Load students with accepted sessions
        const { data: sessionsData, error: sessionsError } = await supabase
          .from('session_requests')
          .select('id, student_id, topic, preferred_date, preferred_time, status, mode')
          .eq('mentor_id', user.id)
          .eq('status', 'accepted');
        if (sessionsError) throw sessionsError;
        const studentIds = [...new Set(sessionsData?.map(s => s.student_id) || [])];
        let studentConnections: ConnectionUser[] = [];
        if (studentIds.length > 0) {
          const { data: profilesData } = await supabase
            .from('user_profiles')
            .select('user_id, full_name, avatar_url, username, bio, class, course, role')
            .in('user_id', studentIds);
          const profileMap = new Map();
          profilesData?.forEach(profile => profileMap.set(profile.user_id, profile));
          studentConnections = sessionsData?.map((session: any) => {
            const profile = profileMap.get(session.student_id);
            return {
              user_id: session.student_id,
              full_name: profile?.full_name || 'Student',
              avatar_url: profile?.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=student',
              role: 'student' as const,
              username: profile?.username,
              bio: profile?.bio,
              class: profile?.class,
              course: profile?.course,
              hasActiveSession: true,
            };
          }) || [];
        }

        // Also load student friends (students who are friends but may not have sessions)
        const { data: studentFriendsData } = await supabase
          .from('friends')
          .select('user_id, friend_id')
          .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
          .eq('status', 'accepted');
        const studentFriendIds = studentFriendsData?.map(f => f.user_id === user.id ? f.friend_id : f.user_id) || [];
        
        if (studentFriendIds.length > 0) {
          const { data: studentFriendProfiles } = await supabase
            .from('user_profiles')
            .select('*')
            .in('user_id', studentFriendIds)
            .eq('role', 'student');
          
          const studentFriendConnections = studentFriendProfiles?.map(profile => ({
            user_id: profile.user_id,
            full_name: profile.full_name,
            avatar_url: profile.avatar_url,
            role: 'student' as const,
            username: profile.username,
            bio: profile.bio,
            class: profile.class,
            course: profile.course,
            hasActiveSession: false,
          })) || [];

          // Merge student connections, avoiding duplicates
          const existingStudentIds = new Set(studentConnections.map(s => s.user_id));
          studentFriendConnections.forEach(friend => {
            if (!existingStudentIds.has(friend.user_id)) {
              studentConnections.push(friend);
            }
          });
        }

        if (activeTab === 'students') {
          setExistingConnections(studentConnections);
          return;
        }
        const { data: friendsData } = await supabase
          .from('friends')
          .select('user_id, friend_id')
          .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
          .eq('status', 'accepted');
        const friendIds = friendsData?.map(f => f.user_id === user.id ? f.friend_id : f.user_id) || [];
        let mentorConnections: ConnectionUser[] = [];
        if (friendIds.length > 0) {
          const { data: mentorProfiles } = await supabase
            .from('user_profiles')
            .select('*')
            .in('user_id', friendIds)
            .eq('role', 'mentor');
          mentorConnections = mentorProfiles?.map(profile => ({
            user_id: profile.user_id,
            full_name: profile.full_name,
            avatar_url: profile.avatar_url,
            role: 'mentor' as const,
            username: profile.username,
            bio: profile.bio,
            profession: profile.profession,
            experience: profile.experience,
          })) || [];
        }
        setExistingConnections([...studentConnections, ...mentorConnections]);
      } else if (activeTab === 'mentors') {
        const { data: friendsData } = await supabase
          .from('friends')
          .select('user_id, friend_id')
          .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
          .eq('status', 'accepted');
        const friendIds = friendsData?.map(f => f.user_id === user.id ? f.friend_id : f.user_id) || [];
        if (friendIds.length === 0) {
          setExistingConnections([]);
          return;
        }
        const { data: mentorProfiles } = await supabase
          .from('user_profiles')
          .select('*')
          .in('user_id', friendIds)
          .eq('role', 'mentor');
        setExistingConnections(mentorProfiles?.map(profile => ({
          user_id: profile.user_id,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
          role: 'mentor' as const,
          username: profile.username,
          bio: profile.bio,
          profession: profile.profession,
          experience: profile.experience,
        })) || []);
      }
    } catch (error) {
      console.error('Error loading existing connections:', error);
      setExistingConnections([]);
    }
  };

  const loadAvailableUsers = async () => {
    if (!user) return;
    try {
      let excludeIds: string[] = [user.id];
      if (activeTab === 'students') {
        // Exclude students with accepted sessions
        const { data: sessionsData } = await supabase
          .from('session_requests')
          .select('student_id')
          .eq('mentor_id', user.id)
          .eq('status', 'accepted');
        excludeIds = [...excludeIds, ...(sessionsData?.map(s => s.student_id) || [])];

        // Also exclude student friends
        const { data: studentFriendsData } = await supabase
          .from('friends')
          .select('user_id, friend_id')
          .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
          .eq('status', 'accepted');
        const studentFriendIds = studentFriendsData?.map(f => f.user_id === user.id ? f.friend_id : f.user_id) || [];
        
        if (studentFriendIds.length > 0) {
          const { data: studentFriends } = await supabase
            .from('user_profiles')
            .select('user_id')
            .in('user_id', studentFriendIds)
            .eq('role', 'student');
          excludeIds = [...excludeIds, ...(studentFriends?.map(s => s.user_id) || [])];
        }

        const { data: availableStudents } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('role', 'student')
          .not('user_id', 'in', `(${excludeIds.join(',')})`)
          .limit(20);
        setAvailableUsers(availableStudents?.map(profile => ({
          user_id: profile.user_id,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
          role: 'student' as const,
          username: profile.username,
          bio: profile.bio,
          class: profile.class,
          course: profile.course,
        })) || []);
      } else if (activeTab === 'mentors') {
        const { data: friendsData } = await supabase
          .from('friends')
          .select('user_id, friend_id')
          .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
          .eq('status', 'accepted');
        const friendIds = friendsData?.map(f => f.user_id === user.id ? f.friend_id : f.user_id) || [];
        excludeIds = [...excludeIds, ...friendIds];
        const { data: pendingData } = await supabase
          .from('friends')
          .select('user_id, friend_id')
          .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
          .eq('status', 'pending');
        const pendingIds = pendingData?.map(f => f.user_id === user.id ? f.friend_id : f.user_id) || [];
        excludeIds = [...excludeIds, ...pendingIds];
        const { data: availableMentors } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('role', 'mentor')
          .not('user_id', 'in', `(${excludeIds.join(',')})`)
          .limit(20);
        setAvailableUsers(availableMentors?.map(profile => ({
          user_id: profile.user_id,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
          role: 'mentor' as const,
          username: profile.username,
          bio: profile.bio,
          profession: profile.profession,
          experience: profile.experience,
        })) || []);
      }
    } catch (error) {
      console.error('Error loading available users:', error);
      setAvailableUsers([]);
    }
  };

  const sendFriendRequest = async (targetUserId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase.from('friends').insert({ user_id: user.id, friend_id: targetUserId, status: 'pending' });
      if (error) throw error;
      setAvailableUsers(prev => prev.filter(u => u.user_id !== targetUserId));
    } catch (error) {
      console.error('Error sending friend request:', error);
    }
  };

  const removeStudent = async (studentId: string) => {
    if (!user) return;
    setRemoving(true);
    try {
      // Delete session requests between mentor and student
      const { error: sessionError } = await supabase
        .from('session_requests')
        .delete()
        .eq('mentor_id', user.id)
        .eq('student_id', studentId);

      if (sessionError) throw sessionError;

      // Delete friend relationship in both directions
      const { error: friendError } = await supabase
        .from('friends')
        .delete()
        .or(`and(user_id.eq.${user.id},friend_id.eq.${studentId}),and(user_id.eq.${studentId},friend_id.eq.${user.id})`);

      if (friendError) throw friendError;

      // Send notification to student
      await createNotification(studentId, user.id, 'friend_request', 'has removed you as their student. Your mentorship session has been cancelled.');

      // Remove from local state
      setExistingConnections(prev => prev.filter(c => c.user_id !== studentId));
      setShowRemoveModal(null);
    } catch (error) {
      console.error('Error removing student:', error);
      alert('Failed to remove student. Please try again.');
    } finally {
      setRemoving(false);
    }
  };

  const filteredExisting = existingConnections.filter(conn => {
    if (!existingSearchQuery) return true;
    const query = existingSearchQuery.toLowerCase();
    return conn.full_name?.toLowerCase().includes(query) || conn.username?.toLowerCase().includes(query) || conn.profession?.toLowerCase().includes(query) || conn.class?.toLowerCase().includes(query);
  });

  const filteredAvailable = availableUsers.filter(conn => {
    if (!findSearchQuery) return true;
    const query = findSearchQuery.toLowerCase();
    return conn.full_name?.toLowerCase().includes(query) || conn.username?.toLowerCase().includes(query) || conn.profession?.toLowerCase().includes(query) || conn.class?.toLowerCase().includes(query);
  });

  const handleStartChat = (connection: ConnectionUser) => {
    if (onStartChat) onStartChat({ id: connection.user_id, name: connection.full_name, avatar: connection.avatar_url });
  };

  const handleStartVideoCall = (connection: ConnectionUser) => {
    if (onStartVideoCall) onStartVideoCall(connection.full_name, connection.avatar_url, connection.user_id);
  };

  const renderUserCard = (connection: ConnectionUser, showActions: 'chat' | 'add') => (
    <div 
      key={connection.user_id} 
      onClick={showActions === 'chat' ? () => handleStartChat(connection) : undefined}
      className={`p-4 flex items-center justify-between transition-colors ${showActions === 'chat' ? 'cursor-pointer' : ''} ${isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-50'}`}
    >
      <div className="flex items-center gap-4">
        <div 
          className={`w-12 h-12 rounded-full overflow-hidden flex-shrink-0 cursor-pointer border-2 border-amber-500/20 hover:border-amber-500 transition-all ${isDarkMode ? 'bg-slate-700' : 'bg-slate-200'}`}
          onClick={(e) => {
            e.stopPropagation();
            onViewProfile?.(connection.user_id);
          }}
          title="View Profile"
        >
          {connection.avatar_url ? (
            <img src={connection.avatar_url} alt={connection.full_name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <User size={20} className={isDarkMode ? 'text-slate-500' : 'text-slate-400'} />
            </div>
          )}
        </div>
        <div>
          <h3 className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{connection.full_name}</h3>
          {connection.username && (
            <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>@{connection.username}</p>
          )}
        </div>
      </div>
      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
        {showActions === 'chat' ? (
          <>
            <button 
              onClick={() => handleStartChat(connection)} 
              className={`p-2 rounded-lg transition-all ${isDarkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`} 
              title="Chat"
            >
              <MessageCircle size={18} />
            </button>
            <button 
              onClick={() => handleStartVideoCall(connection)} 
              className={`p-2 rounded-lg transition-all ${isDarkMode ? 'bg-slate-700 text-blue-400 hover:bg-slate-600' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`} 
              title="Video Call"
            >
              <Video size={18} />
            </button>
            {connection.role === 'student' && activeTab === 'students' && (
              <button 
                onClick={() => setShowRemoveModal(connection)} 
                className={`p-2 rounded-lg transition-all ${isDarkMode ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50' : 'bg-red-50 text-red-600 hover:bg-red-100'}`} 
                title="Remove Student"
              >
                <UserMinus size={18} />
              </button>
            )}
          </>
        ) : (
          <button 
            onClick={() => sendFriendRequest(connection.user_id)} 
            className="px-3 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 text-white text-sm font-medium hover:shadow-md transition-all flex items-center gap-1"
          >
            <UserPlus size={16} />
            <span>Add</span>
          </button>
        )}
      </div>
    </div>
  );

  const renderConnectionsList = (
    connections: ConnectionUser[], 
    searchQuery: string,
    setSearchQuery: (q: string) => void,
    emptyTitle: string,
    emptySubtitle: string,
    showActions: 'chat' | 'add',
    searchPlaceholder: string,
    showOnlyOnSearch: boolean = false,
    isCompact: boolean = false
  ) => {
    const shouldShowResults = !showOnlyOnSearch || searchQuery.trim().length > 0;
    return (
      <div className={`rounded-xl border ${isCompact ? 'h-[300px]' : 'h-full'} ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        <div className={`p-3 border-b ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`} size={16} />
            <input 
              type="text" 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              placeholder={searchPlaceholder} 
              className={`w-full pl-9 pr-3 py-2 text-sm rounded-lg border ${isDarkMode ? 'bg-slate-900 border-slate-600 text-white placeholder-slate-400' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-500'} focus:outline-none focus:ring-2 focus:ring-amber-500`} 
            />
          </div>
        </div>
        <div className={`${isCompact ? 'max-h-[240px]' : 'max-h-[400px]'} overflow-y-auto`}>
          {!shouldShowResults ? (
            <div className="p-6 text-center">
              <Search size={32} className={`mx-auto mb-2 ${isDarkMode ? 'text-slate-600' : 'text-slate-300'}`} />
              <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Type to search {activeTab}</p>
            </div>
          ) : connections.length === 0 ? (
            <div className="p-6 text-center">
              <User size={32} className={`mx-auto mb-2 ${isDarkMode ? 'text-slate-600' : 'text-slate-300'}`} />
              <h3 className={`text-sm font-semibold mb-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{emptyTitle}</h3>
              <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{emptySubtitle}</p>
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {connections.map(conn => renderUserCard(conn, showActions))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className={`rounded-2xl border p-6 ${isDarkMode ? 'bg-gradient-to-br from-slate-800 via-slate-800 to-slate-900 border-slate-700' : 'bg-gradient-to-br from-white via-amber-50/30 to-white border-slate-200'}`}>
        <div className="flex items-center gap-3 mb-2">
          <div className={`p-3 rounded-xl ${isDarkMode ? 'bg-amber-500/10' : 'bg-amber-500/10'}`}>
            <GraduationCap size={28} className="text-amber-500" />
          </div>
          <div>
            <h2 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>My Students & Mentors</h2>
            <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Connect with your students and fellow mentors</p>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <button 
          onClick={() => setActiveTab('students')} 
          className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${activeTab === 'students' ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md' : isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}
        >
          <div className="flex items-center justify-center gap-2">
            <GraduationCap size={18} />
            <span>Students</span>
          </div>
        </button>
        <button 
          onClick={() => setActiveTab('mentors')} 
          className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${activeTab === 'mentors' ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md' : isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}
        >
          <div className="flex items-center justify-center gap-2">
            <Briefcase size={18} />
            <span>Mentors</span>
          </div>
        </button>
        <button 
          onClick={() => setActiveTab('all')} 
          className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${activeTab === 'all' ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md' : isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}
        >
          <div className="flex items-center justify-center gap-2">
            <Users size={18} />
            <span>All</span>
          </div>
        </button>
      </div>

      {activeTab === 'all' ? (
        renderConnectionsList(
          filteredExisting, 
          existingSearchQuery, 
          setExistingSearchQuery, 
          'No connections yet', 
          'Your students and mentor friends will appear here', 
          'chat', 
          'Search all connections...'
        )
      ) : (
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <h3 className={`text-lg font-semibold mb-3 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              <Users size={20} className="text-amber-500" />
              My {activeTab === 'students' ? 'Students' : 'Mentors'}
            </h3>
            {renderConnectionsList(
              filteredExisting, 
              existingSearchQuery, 
              setExistingSearchQuery, 
              `No ${activeTab} yet`, 
              activeTab === 'students' ? 'Students with accepted sessions will appear here' : 'Your mentor friends will appear here', 
              'chat', 
              `Search my ${activeTab}...`
            )}
          </div>
          <div>
            <h3 className={`text-lg font-semibold mb-3 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              <UserPlus size={20} className="text-green-500" />
              Find {activeTab === 'students' ? 'Students' : 'Mentors'}
            </h3>
            {renderConnectionsList(
              filteredAvailable, 
              findSearchQuery, 
              setFindSearchQuery, 
              `No ${activeTab} found`, 
              activeTab === 'students' ? 'Try a different search term' : 'Try a different search term', 
              'add', 
              `Search ${activeTab}...`,
              true,
              true
            )}
          </div>
        </div>
      )}

      {/* Remove Student Modal */}
      {showRemoveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className={`w-full max-w-md rounded-2xl shadow-2xl border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <div className={`p-4 border-b flex items-center justify-between ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-red-500/10">
                  <AlertTriangle size={24} className="text-red-500" />
                </div>
                <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Remove Student</h3>
              </div>
              <button 
                onClick={() => setShowRemoveModal(null)}
                className={`p-2 rounded-lg transition-all ${isDarkMode ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className={`w-14 h-14 rounded-full overflow-hidden flex-shrink-0 ${isDarkMode ? 'bg-slate-700' : 'bg-slate-200'}`}>
                  {showRemoveModal.avatar_url ? (
                    <img src={showRemoveModal.avatar_url} alt={showRemoveModal.full_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User size={24} className={isDarkMode ? 'text-slate-500' : 'text-slate-400'} />
                    </div>
                  )}
                </div>
                <div>
                  <h4 className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{showRemoveModal.full_name}</h4>
                  {showRemoveModal.username && (
                    <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>@{showRemoveModal.username}</p>
                  )}
                </div>
              </div>
              <p className={`text-sm mb-6 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                Are you sure you want to remove this student? This will:
              </p>
              <ul className={`text-sm mb-6 space-y-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                  Cancel their mentorship session
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                  Remove you from their Mentors list
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                  Send them a notification about this change
                </li>
              </ul>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowRemoveModal(null)}
                  disabled={removing}
                  className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-all ${isDarkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                >
                  Cancel
                </button>
                <button
                  onClick={() => removeStudent(showRemoveModal.user_id)}
                  disabled={removing}
                  className="flex-1 px-4 py-2.5 rounded-lg font-medium bg-red-500 text-white hover:bg-red-600 transition-all flex items-center justify-center gap-2"
                >
                  {removing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div>
                      Removing...
                    </>
                  ) : (
                    <>
                      <UserMinus size={18} />
                      Remove Student
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MentorConnections;
