import { useState, useEffect } from 'react';
import { User, Calendar, ArrowLeft, MessageCircle, Video, UserPlus, UserCheck, Clock, X, GraduationCap, BookOpen, Briefcase, Award, Flame, Heart, Star } from 'lucide-react';
import { supabase } from '../utils/supabase';
import { useAuth } from '../contexts/AuthContext';
import { fetchMentorReviews } from '../utils/supabase-queries';

interface ViewProfileProps {
  userId: string;
  isDarkMode: boolean;
  onBack: () => void;
  onStartChat?: (friend: any) => void;
  onStartVideoCall?: (name: string, avatar: string, friendId: string) => void;
}

interface ProfileData {
  user_id: string;
  full_name: string;
  username: string;
  avatar_url: string;
  created_at: string;
  bio?: string;
  class?: string;
  course?: string;
  age?: number;
  phone_number?: string;
  role?: string;
  profession?: string;
  experience?: string;
  academic_info?: {
    school?: string;
    university?: string;
    major?: string;
    graduation_year?: string;
  };
}

export function ViewProfile({ userId, isDarkMode, onBack, onStartChat, onStartVideoCall }: ViewProfileProps) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [friendshipStatus, setFriendshipStatus] = useState<'none' | 'pending' | 'friends'>('none');
  const [totalStudyTime, setTotalStudyTime] = useState(0);
  const [showLargePhoto, setShowLargePhoto] = useState(false);
  const [totalSessions, setTotalSessions] = useState(0);
  const [studyStreak, setStudyStreak] = useState(0);
  const [friendsSince, setFriendsSince] = useState<Date | null>(null);
  const [mentorReviews, setMentorReviews] = useState<any[]>([]);

  useEffect(() => {
    if (userId) {
      loadProfile();
      checkFriendship();
      loadStudyStats();
      loadMentorReviews();
    }
  }, [userId]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkFriendship = async () => {
    if (!user) return;

    try {
      // Check if they are friends - using 'friends' table (not 'friendships')
      const { data: friendships, error } = await supabase
        .from('friends')
        .select('status, created_at')
        .or(`and(user_id.eq.${user.id},friend_id.eq.${userId}),and(user_id.eq.${userId},friend_id.eq.${user.id})`);

      if (error) {
        console.error('Error checking friendship:', error);
        setFriendshipStatus('none');
        return;
      }

      console.log('Friendship check result:', friendships);

      if (friendships && friendships.length > 0) {
        const friendship = friendships[0];
        if (friendship.status === 'accepted') {
          setFriendshipStatus('friends');
          if (friendship.created_at) {
            setFriendsSince(new Date(friendship.created_at));
          }
        } else if (friendship.status === 'pending') {
          setFriendshipStatus('pending');
        } else {
          setFriendshipStatus('none');
        }
      } else {
        setFriendshipStatus('none');
      }
    } catch (error) {
      console.error('Friendship check error:', error);
      setFriendshipStatus('none');
    }
  };
  const loadMentorReviews = async () => {
    try {
      const reviews = await fetchMentorReviews(userId);
      setMentorReviews(reviews || []);
    } catch (error) {
      console.error('Error loading mentor reviews:', error);
    }
  };
  const loadStudyStats = async () => {
    try {
      const { data } = await supabase
        .from('study_sessions')
        .select('duration_minutes, start_time, created_at, focus_rating')
        .eq('user_id', userId)
        .order('start_time', { ascending: false });

      if (data) {
        const total = data.reduce((sum, session) => sum + (session.duration_minutes || 0), 0);
        setTotalStudyTime(total);
        setTotalSessions(data.length);

        // Calculate streak - consecutive days with study sessions (same as Dashboard's calculateStreak, using getTime for local timezone)
        if (data.length > 0) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          // Get unique study dates using getTime() for local timezone comparison
          const sessionDates = new Set<number>();
          data.forEach(session => {
            const date = new Date(session.start_time || session.created_at);
            date.setHours(0, 0, 0, 0);
            sessionDates.add(date.getTime());
          });

          // Count streak starting from today or yesterday
          let streak = 0;
          let checkDate = new Date(today);

          // Check if studied today
          if (sessionDates.has(checkDate.getTime())) {
            streak = 1;
            checkDate.setDate(checkDate.getDate() - 1);
          } else {
            // Check yesterday
            checkDate.setDate(checkDate.getDate() - 1);
            if (!sessionDates.has(checkDate.getTime())) {
              setStudyStreak(0);
              return;
            }
            streak = 1;
            checkDate.setDate(checkDate.getDate() - 1);
          }

          // Count consecutive days
          while (sessionDates.has(checkDate.getTime())) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
          }

          setStudyStreak(streak);
        }
      }
    } catch (error) {
      console.error('Error loading study stats:', error);
    }
  };

  const sendFriendRequest = async () => {
    if (!user) return;

    try {
      await supabase.from('friends').insert({
        user_id: user.id,
        friend_id: userId,
        status: 'pending'
      });
      setFriendshipStatus('pending');
    } catch (error) {
      console.error('Error sending friend request:', error);
    }
  };

  const formatStudyTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-64 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className={`flex flex-col items-center justify-center h-64 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
        <User size={48} className="opacity-50 mb-4" />
        <p>User not found</p>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  const isOwnProfile = user?.id === userId;
  const avatarUrl = profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.full_name || 'U')}&background=random&size=400`;

  return (
    <div className={`max-w-2xl mx-auto ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
      {/* Large Photo Modal */}
      {showLargePhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={() => setShowLargePhoto(false)}
        >
          <div className="relative max-w-md w-full mx-4 flex flex-col items-center">
            <button
              onClick={() => setShowLargePhoto(false)}
              className="absolute -top-14 right-0 p-2.5 bg-white/10 hover:bg-white/20 rounded-full transition-colors border border-white/20"
            >
              <X size={24} className="text-white" />
            </button>
            <img
              src={avatarUrl}
              alt={profile.full_name}
              className="w-96 h-96 rounded-full object-cover shadow-2xl ring-4 ring-white/20"
            />
            {/* Name and username below picture */}
            <div className="mt-6 text-center">
              <h3 className="text-white font-bold text-2xl">{profile.full_name}</h3>
              <p className="text-white/60 text-base mt-1">@{profile.username || 'user'}</p>
              {friendshipStatus === 'friends' && (
                <div className="flex items-center justify-center gap-2 mt-3 text-green-400">
                  <Heart size={16} className="fill-current" />
                  <span className="text-sm font-medium">Friends</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={onBack}
          className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-2xl font-bold">Profile</h1>
      </div>

      {/* Profile Card */}
      <div className={`rounded-2xl overflow-hidden ${isDarkMode ? 'bg-slate-900/50 border border-slate-800' : 'bg-white border border-slate-200 shadow-lg'}`}>
        {/* Banner/Cover with Name and Avatar */}
        <div className="h-48 bg-gradient-to-r from-amber-500 via-orange-500 to-pink-500 relative flex items-center py-4">
          {/* Avatar - vertically centered in banner */}
          <div className="absolute left-6 top-1/2 -translate-y-1/2">
            <button
              onClick={() => setShowLargePhoto(true)}
              className="relative group"
            >
              <img
                src={avatarUrl}
                alt={profile.full_name}
                className="w-36 h-36 rounded-full object-cover border-4 border-white/30 shadow-xl cursor-pointer transition-transform group-hover:scale-105"
              />
              <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <span className="text-white text-xs font-bold">VIEW</span>
              </div>
            </button>
          </div>

          {/* Text vertically centered */}
          <div className="ml-48 sm:ml-52">
            <h2 className="text-4xl font-extrabold text-slate-900 drop-shadow-sm">
              {profile.full_name}
            </h2>
            <p className="text-slate-800/80 text-lg font-semibold mt-1">
              @{profile.username || 'user'}
            </p>
            {profile.role && (
              <span className={`inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-full font-bold mt-2 ${profile.role === 'mentor'
                  ? 'bg-white/30 text-slate-900 border border-white/40'
                  : 'bg-white/30 text-slate-900 border border-white/40'
                }`}>
                {profile.role === 'mentor' ? '🎓 Mentor' : '📚 Student'}
              </span>
            )}
          </div>
        </div>

        {/* Content below banner */}
        <div className="px-6 pb-6 pt-4">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
            {/* Mobile only: Name shown below since banner shows on desktop */}
            <div className="flex-1 text-center sm:text-left sm:hidden">
              {/* Name shown on mobile only since it's in banner on desktop */}
              <div className="flex flex-col items-center gap-2">
                <h2 className="text-2xl font-extrabold text-amber-500">
                  {profile.full_name}
                </h2>
                <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  @{profile.username || 'user'}
                </p>
                {profile.role && (
                  <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-bold ${profile.role === 'mentor'
                      ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-400 border border-purple-500/30'
                      : 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-400 border border-blue-500/30'
                    }`}>
                    {profile.role === 'mentor' ? '🎓 Mentor' : '📚 Student'}
                  </span>
                )}
              </div>
            </div>

            {/* Friend Status Badge */}
            {!isOwnProfile && friendshipStatus === 'friends' && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/20 text-green-500 rounded-full text-sm font-bold sm:mt-0 mt-2">
                <UserCheck size={16} />
                Friends
              </div>
            )}
          </div>

          {/* Bio */}
          {profile.bio && (
            <p className={`mt-4 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
              {profile.bio}
            </p>
          )}

          {/* Stats Row */}
          <div className="flex flex-wrap gap-3 mt-4">
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
              <Clock size={16} className="text-amber-500" />
              <div>
                <p className="text-xs opacity-70">Study Time</p>
                <p className="text-sm font-bold">{formatStudyTime(totalStudyTime)}</p>
              </div>
            </div>
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
              <BookOpen size={16} className="text-blue-500" />
              <div>
                <p className="text-xs opacity-70">Sessions</p>
                <p className="text-sm font-bold">{totalSessions}</p>
              </div>
            </div>
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${studyStreak > 0 ? 'bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30' : isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
              <Flame size={16} className={studyStreak > 0 ? 'text-orange-500' : 'text-slate-400'} />
              <div>
                <p className="text-xs opacity-70">Streak</p>
                <p className={`text-sm font-bold ${studyStreak > 0 ? 'text-orange-500' : ''}`}>
                  {studyStreak} {studyStreak === 1 ? 'day' : 'days'}
                </p>
              </div>
            </div>
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
              <Calendar size={16} className="text-purple-500" />
              <div>
                <p className="text-xs opacity-70">Joined</p>
                <p className="text-sm font-bold">
                  {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </p>
              </div>
            </div>
            {!isOwnProfile && friendsSince && friendshipStatus === 'friends' && (
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30`}>
                <Heart size={16} className="text-green-500" />
                <div>
                  <p className="text-xs opacity-70">Friends Since</p>
                  <p className="text-sm font-bold text-green-500">
                    {friendsSince.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Details Section */}
          <div className={`mt-6 pt-6 border-t ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <User size={18} className="text-amber-500" />
              Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {profile.class && (
                <div className={`flex items-center gap-3 p-3 rounded-xl ${isDarkMode ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                  <GraduationCap size={20} className="text-blue-500" />
                  <div>
                    <p className="text-xs opacity-70">Class</p>
                    <p className="font-semibold">{profile.class}</p>
                  </div>
                </div>
              )}
              {profile.course && (
                <div className={`flex items-center gap-3 p-3 rounded-xl ${isDarkMode ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                  <BookOpen size={20} className="text-green-500" />
                  <div>
                    <p className="text-xs opacity-70">Course</p>
                    <p className="font-semibold">{profile.course}</p>
                  </div>
                </div>
              )}
              {profile.age && (
                <div className={`flex items-center gap-3 p-3 rounded-xl ${isDarkMode ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                  <Calendar size={20} className="text-purple-500" />
                  <div>
                    <p className="text-xs opacity-70">Age</p>
                    <p className="font-semibold">{profile.age} years</p>
                  </div>
                </div>
              )}
              {profile.profession && (
                <div className={`flex items-center gap-3 p-3 rounded-xl ${isDarkMode ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                  <Briefcase size={20} className="text-amber-500" />
                  <div>
                    <p className="text-xs opacity-70">Profession</p>
                    <p className="font-semibold">{profile.profession}</p>
                  </div>
                </div>
              )}
              {profile.experience && (
                <div className={`flex items-center gap-3 p-3 rounded-xl ${isDarkMode ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                  <Award size={20} className="text-pink-500" />
                  <div>
                    <p className="text-xs opacity-70">Experience</p>
                    <p className="font-semibold">{profile.experience}</p>
                  </div>
                </div>
              )}
              {profile.academic_info?.school && (
                <div className={`flex items-center gap-3 p-3 rounded-xl ${isDarkMode ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                  <GraduationCap size={20} className="text-indigo-500" />
                  <div>
                    <p className="text-xs opacity-70">School</p>
                    <p className="font-semibold">{profile.academic_info.school}</p>
                  </div>
                </div>
              )}
              {profile.academic_info?.university && (
                <div className={`flex items-center gap-3 p-3 rounded-xl ${isDarkMode ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                  <GraduationCap size={20} className="text-teal-500" />
                  <div>
                    <p className="text-xs opacity-70">University</p>
                    <p className="font-semibold">{profile.academic_info.university}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Mentor Reviews Section */}
          {profile?.role === 'mentor' && mentorReviews.length > 0 && (
            <div className={`mt-6 pt-6 border-t ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
              <h3 className={`text-lg font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                Reviews ({mentorReviews.length})
              </h3>
              <div className="max-h-96 overflow-y-auto space-y-4 pr-2">
                {mentorReviews.map((review) => (
                  <div
                    key={review.id}
                    className={`p-4 rounded-xl ${isDarkMode ? 'bg-slate-800/50' : 'bg-slate-50'}`}
                  >
                    <div className="flex items-start gap-3">
                      <img
                        src={review.studentAvatarUrl || review.student_profile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(review.studentName || review.student_profile?.full_name || 'U')}&background=random`}
                        alt={review.studentName || review.student_profile?.full_name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            {review.studentName || review.student_profile?.full_name || 'Anonymous student'}
                          </span>
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-4 h-4 ${i < review.rating
                                    ? 'fill-amber-500 text-amber-500'
                                    : isDarkMode
                                      ? 'text-slate-600'
                                      : 'text-slate-300'
                                  }`}
                              />
                            ))}
                          </div>
                        </div>
                        {(review.review_text || review.reviewText) && (
                          <p className={`text-sm mt-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'} italic ${isDarkMode ? 'bg-slate-900/40' : 'bg-white'} p-2 rounded-lg`}>
                            "{review.review_text || review.reviewText}"
                          </p>
                        )}
                        <p className={`text-xs mt-2 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                          {new Date(review.created_at || review.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {!isOwnProfile && (
            <div className={`flex flex-wrap gap-3 mt-6 pt-6 border-t ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
              {friendshipStatus === 'friends' ? (
                <>
                  <button
                    onClick={() => onStartChat?.({
                      id: userId,
                      name: profile.full_name,
                      avatarUrl: profile.avatar_url,
                      status: 'online',
                      isMentor: profile.role === 'mentor'
                    })}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl hover:opacity-90 transition-opacity font-bold"
                  >
                    <MessageCircle size={18} />
                    Send Message
                  </button>
                  <button
                    onClick={() => onStartVideoCall?.(profile.full_name, profile.avatar_url || '', userId)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:opacity-90 transition-opacity font-bold"
                  >
                    <Video size={18} />
                    Video Call
                  </button>
                </>
              ) : profile.role === 'mentor' ? (
                <>
                  <button
                    onClick={() => onStartChat?.({
                      id: userId,
                      name: profile.full_name,
                      avatarUrl: profile.avatar_url,
                      status: 'online',
                      isMentor: true
                    })}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl hover:opacity-90 transition-opacity font-bold"
                  >
                    <MessageCircle size={18} />
                    Chat with Mentor
                  </button>
                </>
              ) : friendshipStatus === 'pending' ? (
                <div className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-amber-500/20 text-amber-500 rounded-xl font-bold">
                  <Clock size={18} />
                  Friend Request Pending
                </div>
              ) : (
                <button
                  onClick={sendFriendRequest}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl hover:opacity-90 transition-opacity font-bold"
                >
                  <UserPlus size={18} />
                  Add Friend
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
