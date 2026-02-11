import { useState, useEffect } from 'react';
import { User, Mail, Phone, GraduationCap, Briefcase, Calendar, Hash, Settings as SettingsIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../utils/supabase';

interface UserProfile {
  full_name: string;
  avatar_url: string;
  role: 'student' | 'mentor';
  phone_number: string;
  gender?: 'male' | 'female' | 'other';
  profession?: string;
  experience?: string;
  class?: string;
  course?: string;
  age?: number;
  username?: string;
}

interface MyProfileProps {
  isDarkMode: boolean;
  onEditClick: () => void;
}

export function MyProfile({ isDarkMode, onEditClick }: MyProfileProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile>({
    full_name: '',
    avatar_url: '',
    role: 'student',
    phone_number: '',
    gender: undefined,
    profession: '',
    experience: '',
    class: '',
    course: '',
    age: undefined,
    username: '',
  });

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;

      if (data) {
        setProfile({
          full_name: data.full_name || '',
          avatar_url: data.avatar_url || '',
          role: data.role || 'student',
          phone_number: data.phone_number || '',
          gender: data.gender || undefined,
          profession: data.profession || '',
          experience: data.experience || '',
          class: data.class || '',
          course: data.course || '',
          age: data.age || undefined,
          username: data.username || '',
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-64 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Edit Button */}
      <div className={`relative overflow-hidden rounded-2xl border ${
        isDarkMode 
          ? 'bg-gradient-to-br from-slate-800 via-slate-800 to-slate-900 border-slate-700' 
          : 'bg-gradient-to-br from-white via-amber-50/30 to-white border-slate-200'
      }`}>
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl -translate-y-32 translate-x-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl translate-y-24 -translate-x-24"></div>
        
        <div className="relative p-8">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${
                isDarkMode ? 'bg-amber-500/10' : 'bg-amber-500/10'
              }`}>
                <User size={32} className="text-amber-500" />
              </div>
              <div>
                <h2 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  My Profile
                </h2>
                <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  View your account information
                </p>
              </div>
            </div>
            <button
              onClick={onEditClick}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg font-medium hover:from-amber-600 hover:to-orange-700 transition-all shadow-md"
            >
              <SettingsIcon size={18} />
              Edit Profile
            </button>
          </div>
        </div>
      </div>

      {/* Profile Picture Section */}
      <div className={`rounded-2xl border p-8 ${
        isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
      }`}>
        <div className="flex flex-col items-center">
          <div className={`w-48 h-48 rounded-full overflow-hidden ${
            isDarkMode ? 'bg-slate-700' : 'bg-slate-200'
          } flex items-center justify-center border-4 ${
            isDarkMode ? 'border-slate-600' : 'border-slate-300'
          } shadow-xl`}>
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <User size={80} className={isDarkMode ? 'text-slate-400' : 'text-slate-500'} />
            )}
          </div>
          <h3 className={`text-2xl font-bold mt-4 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            {profile.full_name || 'No name set'}
          </h3>
          {profile.username && (
            <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              @{profile.username}
            </p>
          )}
          <div className={`flex items-center gap-2 mt-3 px-4 py-2 rounded-full ${
            isDarkMode ? 'bg-slate-700' : 'bg-slate-100'
          }`}>
            {profile.role === 'student' ? (
              <>
                <GraduationCap size={18} className="text-amber-500" />
                <span className={`font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Student</span>
              </>
            ) : (
              <>
                <Briefcase size={18} className="text-amber-500" />
                <span className={`font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Mentor</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Personal Information */}
      <div className={`rounded-2xl border p-6 ${
        isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
      }`}>
        <h3 className={`text-xl font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
          Personal Information
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <Mail size={20} className="text-amber-500 mt-1 flex-shrink-0" />
            <div className="flex-1">
              <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Email
              </p>
              <p className={`text-base mt-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {user?.email || 'Not set'}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Phone size={20} className="text-amber-500 mt-1 flex-shrink-0" />
            <div className="flex-1">
              <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Phone Number
              </p>
              <p className={`text-base mt-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {profile.phone_number || 'Not set'}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <User size={20} className="text-amber-500 mt-1 flex-shrink-0" />
            <div className="flex-1">
              <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Gender
              </p>
              <p className={`text-base mt-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {profile.gender ? profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1) : 'Not set'}
              </p>
            </div>
          </div>

          {profile.username && (
            <div className="flex items-start gap-3">
              <Hash size={20} className="text-amber-500 mt-1 flex-shrink-0" />
              <div className="flex-1">
                <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  Username
                </p>
                <p className={`text-base mt-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  @{profile.username}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Role-specific Information */}
      {profile.role === 'mentor' ? (
        <div className={`rounded-2xl border p-6 ${
          isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
        }`}>
          <h3 className={`text-xl font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            Professional Details
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Briefcase size={20} className="text-amber-500 mt-1 flex-shrink-0" />
              <div className="flex-1">
                <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  Profession
                </p>
                <p className={`text-base mt-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {profile.profession || 'Not set'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar size={20} className="text-amber-500 mt-1 flex-shrink-0" />
              <div className="flex-1">
                <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  Years of Experience
                </p>
                <p className={`text-base mt-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {profile.experience || 'Not set'}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className={`rounded-2xl border p-6 ${
          isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
        }`}>
          <h3 className={`text-xl font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            Academic Details
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <GraduationCap size={20} className="text-amber-500 mt-1 flex-shrink-0" />
              <div className="flex-1">
                <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  Class
                </p>
                <p className={`text-base mt-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {profile.class || 'Not set'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <GraduationCap size={20} className="text-amber-500 mt-1 flex-shrink-0" />
              <div className="flex-1">
                <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  Course
                </p>
                <p className={`text-base mt-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {profile.course || 'Not set'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar size={20} className="text-amber-500 mt-1 flex-shrink-0" />
              <div className="flex-1">
                <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  Age
                </p>
                <p className={`text-base mt-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {profile.age ? `${profile.age} years` : 'Not set'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
