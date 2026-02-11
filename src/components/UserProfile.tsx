import { useState, useEffect } from 'react';
import { User, ChevronDown, Mail, Phone, Settings, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../utils/supabase';

interface UserProfileProps {
  isDarkMode: boolean;
  variant?: 'sidebar' | 'header';
  onSettingsClick?: () => void;
}

interface ProfileData {
  full_name?: string;
  avatar_url?: string;
  phone_number?: string;
  gender?: string;
  role?: 'student' | 'mentor';
  profession?: string;
  experience?: string;
  class?: string;
  course?: string;
  age?: number;
  username?: string;
}

export function UserProfile({ isDarkMode, variant = 'header', onSettingsClick }: UserProfileProps) {
  const { user } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const [profile, setProfile] = useState<ProfileData>({});

  useEffect(() => {
    if (user) {
      loadUserProfile();
    }
  }, [user]);

  const loadUserProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (!error && data) {
        setProfile(data);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const displayName = profile.full_name || user?.email?.split('@')[0] || 'User';

  // Check if profile is complete
  const getIncompleteFields = () => {
    const incomplete: string[] = [];
    if (!profile.full_name) incomplete.push('Full Name');
    if (!profile.phone_number) incomplete.push('Phone Number');
    if (!profile.gender) incomplete.push('Gender');
    
    if (profile.role === 'mentor') {
      if (!profile.profession) incomplete.push('Profession');
      if (!profile.experience) incomplete.push('Experience');
    } else {
      if (!profile.class) incomplete.push('Class');
      if (!profile.course) incomplete.push('Course');
      if (!profile.age) incomplete.push('Age');
    }
    
    return incomplete;
  };

  const incompleteFields = getIncompleteFields();
  const isComplete = incompleteFields.length === 0;

  // Header variant - profile icon with detailed dropdown
  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className={`p-2 rounded-lg transition-all relative ${
          isDarkMode 
            ? 'text-slate-300 hover:bg-slate-700' 
            : 'text-slate-600 hover:bg-slate-100'
        }`}
        title={displayName}
      >
        <div className={`w-12 h-12 rounded-full overflow-hidden flex items-center justify-center ${
          isDarkMode ? 'bg-slate-700' : 'bg-slate-200'
        }`}>
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt={displayName} className="w-full h-full object-cover" />
          ) : (
            <User size={26} />
          )}
        </div>
        {!isComplete && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-800">
            <span className="text-white text-xs font-bold">!</span>
          </div>
        )}
      </button>

      {showDropdown && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setShowDropdown(false)}
          />
          <div className={`absolute right-0 top-full mt-2 w-80 rounded-xl shadow-2xl border z-20 ${
            isDarkMode 
              ? 'bg-slate-800 border-slate-700' 
              : 'bg-white border-slate-200'
          }`}>
            {/* Header */}
            <div className={`p-4 border-b ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-16 h-16 rounded-full overflow-hidden flex items-center justify-center ${
                  isDarkMode ? 'bg-slate-700' : 'bg-slate-200'
                }`}>
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt={displayName} className="w-full h-full object-cover" />
                  ) : (
                    <User size={32} />
                  )}
                </div>
                <div className="flex-1">
                  <p className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    {displayName}
                  </p>
                  {profile.username && (
                    <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                      @{profile.username}
                    </p>
                  )}
                  <p className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                    {user?.email}
                  </p>
                </div>
              </div>
            </div>

            {/* Profile Status - Only show if incomplete */}
            {!isComplete && (
              <div className={`p-4 border-b ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                <div>
                  <div className="flex items-center gap-2 text-amber-500 mb-2">
                    <AlertCircle size={18} />
                    <span className="text-sm font-medium">Profile Incomplete</span>
                  </div>
                  <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    Missing: {incompleteFields.join(', ')}
                  </p>
                </div>
              </div>
            )}

            {/* Profile Details */}
            <div className="p-4 space-y-3">
              <div className="flex items-start gap-3">
                <Mail size={16} className={`mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`} />
                <div className="flex-1">
                  <p className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>Email</p>
                  <p className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    {user?.email || 'Not set'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone size={16} className={`mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`} />
                <div className="flex-1">
                  <p className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>Phone</p>
                  <p className={`text-sm ${profile.phone_number ? (isDarkMode ? 'text-slate-300' : 'text-slate-700') : 'text-amber-500'}`}>
                    {profile.phone_number || 'Not set'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <User size={16} className={`mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`} />
                <div className="flex-1">
                  <p className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>Gender</p>
                  <p className={`text-sm ${profile.gender ? (isDarkMode ? 'text-slate-300' : 'text-slate-700') : 'text-amber-500'}`}>
                    {profile.gender ? profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1) : 'Not set'}
                  </p>
                </div>
              </div>

              {profile.role === 'mentor' ? (
                <>
                  <div className="flex items-start gap-3">
                    <User size={16} className={`mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`} />
                    <div className="flex-1">
                      <p className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>Profession</p>
                      <p className={`text-sm ${profile.profession ? (isDarkMode ? 'text-slate-300' : 'text-slate-700') : 'text-amber-500'}`}>
                        {profile.profession || 'Not set'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <User size={16} className={`mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`} />
                    <div className="flex-1">
                      <p className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>Experience</p>
                      <p className={`text-sm ${profile.experience ? (isDarkMode ? 'text-slate-300' : 'text-slate-700') : 'text-amber-500'}`}>
                        {profile.experience || 'Not set'}
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-3">
                    <User size={16} className={`mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`} />
                    <div className="flex-1">
                      <p className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>Class</p>
                      <p className={`text-sm ${profile.class ? (isDarkMode ? 'text-slate-300' : 'text-slate-700') : 'text-amber-500'}`}>
                        {profile.class || 'Not set'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <User size={16} className={`mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`} />
                    <div className="flex-1">
                      <p className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>Course</p>
                      <p className={`text-sm ${profile.course ? (isDarkMode ? 'text-slate-300' : 'text-slate-700') : 'text-amber-500'}`}>
                        {profile.course || 'Not set'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <User size={16} className={`mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`} />
                    <div className="flex-1">
                      <p className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>Age</p>
                      <p className={`text-sm ${profile.age ? (isDarkMode ? 'text-slate-300' : 'text-slate-700') : 'text-amber-500'}`}>
                        {profile.age ? `${profile.age} years` : 'Not set'}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Action Button */}
            <div className={`p-4 border-t ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
              <button
                onClick={() => {
                  setShowDropdown(false);
                  if (onSettingsClick) onSettingsClick();
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg font-medium hover:from-amber-600 hover:to-orange-700 transition-all"
              >
                <Settings size={16} />
                {isComplete ? 'Edit Profile' : 'Complete Profile'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
