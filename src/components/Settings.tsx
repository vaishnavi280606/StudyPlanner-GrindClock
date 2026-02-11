import { useState, useEffect } from 'react';
import { User, Mail, Phone, GraduationCap, Briefcase, Calendar, Hash, Save, Volume2, VolumeX, Trash2, Upload, LogOut, Send, Loader2 } from 'lucide-react';
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

interface SettingsProps {
  isDarkMode: boolean;
  onClose: () => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  soundVolume: number;
  setSoundVolume: (volume: number) => void;
  incomingCallSoundEnabled: boolean;
  setIncomingCallSoundEnabled: (enabled: boolean) => void;
  receiveMsgSoundEnabled: boolean;
  setReceiveMsgSoundEnabled: (enabled: boolean) => void;
  sendMsgSoundEnabled: boolean;
  setSendMsgSoundEnabled: (enabled: boolean) => void;
}

export function Settings({
  isDarkMode,
  onClose,
  soundEnabled,
  setSoundEnabled,
  soundVolume,
  setSoundVolume,
  incomingCallSoundEnabled,
  setIncomingCallSoundEnabled,
  receiveMsgSoundEnabled,
  setReceiveMsgSoundEnabled,
  sendMsgSoundEnabled,
  setSendMsgSoundEnabled
}: SettingsProps) {
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Sound preview functions using real audio files with Web Audio API fallback
  const playPreviewSound = () => {
    try {
      const a = new Audio('https://cdn.pixabay.com/audio/2024/11/04/audio_4956b4edd2.mp3');
      a.volume = soundVolume;
      a.play().catch(() => {
        try {
          const ctx = new AudioContext();
          const o1 = ctx.createOscillator(); const o2 = ctx.createOscillator();
          const g = ctx.createGain();
          o1.connect(g); o2.connect(g); g.connect(ctx.destination);
          o1.frequency.setValueAtTime(587, ctx.currentTime);
          o2.frequency.setValueAtTime(784, ctx.currentTime + 0.08);
          g.gain.setValueAtTime(soundVolume * 0.3, ctx.currentTime);
          g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
          o1.start(); o1.stop(ctx.currentTime + 0.12);
          o2.start(ctx.currentTime + 0.08); o2.stop(ctx.currentTime + 0.3);
        } catch (_) {}
      });
    } catch (_) {}
  };

  const playRingtonePreview = () => {
    try {
      const a = new Audio('https://cdn.pixabay.com/audio/2022/10/30/audio_f3f8e5a830.mp3');
      a.volume = soundVolume;
      a.play().catch(() => {
        try {
          const ctx = new AudioContext();
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.connect(g); g.connect(ctx.destination);
          osc.frequency.setValueAtTime(440, ctx.currentTime);
          osc.frequency.setValueAtTime(520, ctx.currentTime + 0.15);
          osc.frequency.setValueAtTime(440, ctx.currentTime + 0.30);
          g.gain.setValueAtTime(soundVolume * 0.4, ctx.currentTime);
          g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
          osc.start(); osc.stop(ctx.currentTime + 0.5);
        } catch (_) {}
      });
    } catch (_) {}
  };

  const playSendPreview = () => {
    try {
      const a = new Audio('https://cdn.pixabay.com/audio/2022/03/24/audio_4193bac9f8.mp3');
      a.volume = soundVolume;
      a.play().catch(() => {
        try {
          const ctx = new AudioContext();
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.connect(g); g.connect(ctx.destination);
          osc.frequency.setValueAtTime(880, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.08);
          g.gain.setValueAtTime(soundVolume * 0.3, ctx.currentTime);
          g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
          osc.start(); osc.stop(ctx.currentTime + 0.15);
        } catch (_) {}
      });
    } catch (_) {}
  };

  const handleMasterSoundToggle = () => {
    const newValue = !soundEnabled;
    setSoundEnabled(newValue);
    if (newValue) {
      playPreviewSound();
    }
  };

  const handleIncomingCallToggle = () => {
    const newValue = !incomingCallSoundEnabled;
    setIncomingCallSoundEnabled(newValue);
    if (newValue && soundEnabled) {
      playRingtonePreview();
    }
  };

  const handleReceiveMsgToggle = () => {
    const newValue = !receiveMsgSoundEnabled;
    setReceiveMsgSoundEnabled(newValue);
    if (newValue && soundEnabled) {
      playPreviewSound();
    }
  };

  const handleSendMsgToggle = () => {
    const newValue = !sendMsgSoundEnabled;
    setSendMsgSoundEnabled(newValue);
    if (newValue && soundEnabled) {
      playSendPreview();
    }
  };

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
      setMessage({ type: 'error', text: 'Failed to load profile' });
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      setMessage(null);

      if (!event.target.files || event.target.files.length === 0) {
        setUploading(false);
        return;
      }

      const file = event.target.files[0];

      if (!file.type.startsWith('image/')) {
        setMessage({ type: 'error', text: 'Please upload an image file' });
        setUploading(false);
        return;
      }

      if (file.size > 2 * 1024 * 1024) {
        setMessage({ type: 'error', text: 'Image size should be less than 2MB' });
        setUploading(false);
        return;
      }

      // Delete old image if exists
      if (profile.avatar_url) {
        try {
          const oldPath = profile.avatar_url.split('/').slice(-2).join('/');
          await supabase.storage.from('profiles').remove([oldPath]);
        } catch (err) {
          console.log('Could not delete old image:', err);
        }
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('profiles')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('profiles')
        .getPublicUrl(filePath);

      // Update database with new avatar URL
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ avatar_url: publicUrl })
        .eq('user_id', user?.id);

      if (updateError) throw updateError;

      setProfile(prev => ({ ...prev, avatar_url: publicUrl }));
      setMessage({ type: 'success', text: 'Image uploaded successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      console.error('Error uploading image:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to upload image' });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteImage = async () => {
    try {
      setUploading(true);
      setMessage(null);

      if (!profile.avatar_url) {
        setMessage({ type: 'error', text: 'No image to delete' });
        setUploading(false);
        return;
      }

      // Extract the file path from the URL
      const urlParts = profile.avatar_url.split('/');
      const filePath = urlParts.slice(-2).join('/'); // Gets "avatars/filename.ext"

      const { error: deleteError } = await supabase.storage
        .from('profiles')
        .remove([filePath]);

      if (deleteError) throw deleteError;

      // Update profile to remove avatar_url
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ avatar_url: null })
        .eq('user_id', user?.id);

      if (updateError) throw updateError;

      setProfile(prev => ({ ...prev, avatar_url: '' }));
      setMessage({ type: 'success', text: 'Image deleted successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      console.error('Error deleting image:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to delete image' });
    } finally {
      setUploading(false);
    }
  };
  const handleDeleteAccount = async () => {
    try {
      setLoading(true);
      setMessage(null);

      // Delete user's data from user_profiles
      const { error: profileError } = await supabase
        .from('user_profiles')
        .delete()
        .eq('user_id', user?.id);

      if (profileError) throw profileError;

      // Sign out and delete auth user
      await signOut();

      setMessage({ type: 'success', text: 'Account deleted successfully' });
    } catch (error: any) {
      console.error('Error deleting account:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to delete account' });
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      // Check if username is unique before updating (for both students and mentors)
      if (profile.username) {
        const { data: existingUsers, error: checkError } = await supabase
          .from('user_profiles')
          .select('user_id, username')
          .eq('username', profile.username)
          .neq('user_id', user!.id);

        if (checkError) throw checkError;

        if (existingUsers && existingUsers.length > 0) {
          setMessage({ type: 'error', text: 'This username is already taken. Please choose another one.' });
          setLoading(false);
          return;
        }
      }

      const { error } = await supabase
        .from('user_profiles')
        .update({
          full_name: profile.full_name,
          phone_number: profile.phone_number,
          gender: profile.gender,
          ...(profile.role === 'mentor'
            ? { profession: profile.profession, experience: profile.experience, username: profile.username }
            : { class: profile.class, course: profile.course, age: profile.age, username: profile.username }),
        })
        .eq('user_id', user!.id);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to update profile' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
      <div className={`relative overflow-hidden ${isDarkMode
        ? 'bg-gradient-to-br from-slate-800 via-slate-800 to-slate-900 border-b border-slate-700'
        : 'bg-gradient-to-br from-white via-amber-50/30 to-white border-b border-slate-200'
        }`}>
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl -translate-y-32 translate-x-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl translate-y-24 -translate-x-24"></div>

        <div className="relative max-w-4xl mx-auto px-6 py-5">
          <div className="flex items-center gap-3 mb-1.5">
            <div className={`p-2.5 rounded-xl ${isDarkMode ? 'bg-amber-500/10' : 'bg-amber-500/10'
              }`}>
              <User size={24} className="text-amber-500" />
            </div>
            <h2 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Profile Settings
            </h2>
          </div>
          <p className={`text-sm ml-14 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            Manage your account information and preferences
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto p-6 space-y-6">
        {message && (
          <div className={`p-4 rounded-lg border ${message.type === 'success'
            ? 'bg-green-500/10 border-green-500/20 text-green-400'
            : 'bg-red-500/10 border-red-500/20 text-red-400'
            }`}>
            {message.text}
          </div>
        )}

        {/* Profile Picture Section */}
        <div className={`rounded-2xl border p-6 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
          }`}>
          <div className="flex flex-col items-center gap-6">
            {/* Large Profile Picture - Centered */}
            <div className="relative">
              <div className={`w-64 h-64 rounded-full overflow-hidden ${isDarkMode ? 'bg-slate-700' : 'bg-slate-200'
                } flex items-center justify-center border-4 ${isDarkMode ? 'border-slate-600' : 'border-slate-300'
                }`}>
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User size={100} className={isDarkMode ? 'text-slate-400' : 'text-slate-500'} />
                )}
              </div>
              {uploading && (
                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white"></div>
                </div>
              )}
            </div>

            {/* Action Buttons Below Picture */}
            <div className="flex flex-wrap justify-center gap-3">
              <label className={`flex items-center justify-center gap-2 px-6 py-3 rounded-lg cursor-pointer transition-all ${uploading ? 'opacity-50 cursor-not-allowed' : ''
                } ${isDarkMode
                  ? 'bg-amber-500 hover:bg-amber-600 text-white'
                  : 'bg-amber-500 hover:bg-amber-600 text-white'
                }`}>
                <Upload size={18} />
                <span className="font-medium">Change Picture</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>

              {profile.avatar_url && (
                <button
                  type="button"
                  onClick={handleDeleteImage}
                  disabled={uploading}
                  className={`flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${uploading ? 'opacity-50 cursor-not-allowed' : ''
                    } ${isDarkMode
                      ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30'
                      : 'bg-red-50 hover:bg-red-100 text-red-600 border border-red-200'
                    }`}
                >
                  <Trash2 size={18} />
                  <span className="font-medium">Delete Picture</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Personal Information Section */}
        <div className={`rounded-2xl border p-6 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
          }`}>
          <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            Personal Information
          </h3>

          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                <User size={16} className="inline mr-2" />
                Full Name
              </label>
              <input
                type="text"
                value={profile.full_name}
                onChange={(e) => setProfile(prev => ({ ...prev, full_name: e.target.value }))}
                className={`w-full px-4 py-2 rounded-lg border ${isDarkMode
                  ? 'bg-slate-700 border-slate-600 text-white'
                  : 'bg-white border-slate-300 text-slate-900'
                  } focus:outline-none focus:ring-2 focus:ring-amber-500`}
                required
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                <Mail size={16} className="inline mr-2" />
                Email
              </label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className={`w-full px-4 py-2 rounded-lg border ${isDarkMode
                  ? 'bg-slate-700/50 border-slate-600 text-slate-400'
                  : 'bg-slate-100 border-slate-300 text-slate-500'
                  } cursor-not-allowed`}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                <Phone size={16} className="inline mr-2" />
                Phone Number
              </label>
              <input
                type="tel"
                value={profile.phone_number}
                onChange={(e) => setProfile(prev => ({ ...prev, phone_number: e.target.value }))}
                className={`w-full px-4 py-2 rounded-lg border ${isDarkMode
                  ? 'bg-slate-700 border-slate-600 text-white'
                  : 'bg-white border-slate-300 text-slate-900'
                  } focus:outline-none focus:ring-2 focus:ring-amber-500`}
                required
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                <User size={16} className="inline mr-2" />
                Gender
              </label>
              <select
                value={profile.gender || ''}
                onChange={(e) => setProfile(prev => ({ ...prev, gender: e.target.value as 'male' | 'female' | 'other' | undefined }))}
                className={`w-full px-4 py-2 rounded-lg border ${isDarkMode
                  ? 'bg-slate-700 border-slate-600 text-white'
                  : 'bg-white border-slate-300 text-slate-900'
                  } focus:outline-none focus:ring-2 focus:ring-amber-500`}
                required
              >
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Role
              </label>
              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${isDarkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-100 border-slate-300'}`}>
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
                <span className={`ml-auto text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Cannot be changed</span>
              </div>
            </div>
          </div>
        </div>

        {/* Role-specific fields */}
        {profile.role === 'mentor' ? (
          <div className={`rounded-2xl border p-6 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
            }`}>
            <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Professional Details
            </h3>

            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  <Briefcase size={16} className="inline mr-2" />
                  Profession
                </label>
                <input
                  type="text"
                  value={profile.profession || ''}
                  onChange={(e) => setProfile(prev => ({ ...prev, profession: e.target.value }))}
                  className={`w-full px-4 py-2 rounded-lg border ${isDarkMode
                    ? 'bg-slate-700 border-slate-600 text-white'
                    : 'bg-white border-slate-300 text-slate-900'
                    } focus:outline-none focus:ring-2 focus:ring-amber-500`}
                  required
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  <Calendar size={16} className="inline mr-2" />
                  Years of Experience
                </label>
                <input
                  type="text"
                  value={profile.experience || ''}
                  onChange={(e) => setProfile(prev => ({ ...prev, experience: e.target.value }))}
                  className={`w-full px-4 py-2 rounded-lg border ${isDarkMode
                    ? 'bg-slate-700 border-slate-600 text-white'
                    : 'bg-white border-slate-300 text-slate-900'
                    } focus:outline-none focus:ring-2 focus:ring-amber-500`}
                  required
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  <Hash size={16} className="inline mr-2" />
                  Username
                </label>
                <input
                  type="text"
                  value={profile.username || ''}
                  onChange={(e) => setProfile(prev => ({ ...prev, username: e.target.value }))}
                  className={`w-full px-4 py-2 rounded-lg border ${isDarkMode
                    ? 'bg-slate-700 border-slate-600 text-white'
                    : 'bg-white border-slate-300 text-slate-900'
                    } focus:outline-none focus:ring-2 focus:ring-amber-500`}
                  required
                  placeholder="Choose a unique username"
                />
                <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Usernames must be unique across all accounts
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className={`rounded-2xl border p-6 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
            }`}>
            <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Academic Details
            </h3>

            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  <GraduationCap size={16} className="inline mr-2" />
                  Class
                </label>
                <input
                  type="text"
                  value={profile.class || ''}
                  onChange={(e) => setProfile(prev => ({ ...prev, class: e.target.value }))}
                  className={`w-full px-4 py-2 rounded-lg border ${isDarkMode
                    ? 'bg-slate-700 border-slate-600 text-white'
                    : 'bg-white border-slate-300 text-slate-900'
                    } focus:outline-none focus:ring-2 focus:ring-amber-500`}
                  required
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Course
                </label>
                <input
                  type="text"
                  value={profile.course || ''}
                  onChange={(e) => setProfile(prev => ({ ...prev, course: e.target.value }))}
                  className={`w-full px-4 py-2 rounded-lg border ${isDarkMode
                    ? 'bg-slate-700 border-slate-600 text-white'
                    : 'bg-white border-slate-300 text-slate-900'
                    } focus:outline-none focus:ring-2 focus:ring-amber-500`}
                  required
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  <Calendar size={16} className="inline mr-2" />
                  Age
                </label>
                <input
                  type="number"
                  value={profile.age || ''}
                  onChange={(e) => setProfile(prev => ({ ...prev, age: parseInt(e.target.value) || undefined }))}
                  className={`w-full px-4 py-2 rounded-lg border ${isDarkMode
                    ? 'bg-slate-700 border-slate-600 text-white'
                    : 'bg-white border-slate-300 text-slate-900'
                    } focus:outline-none focus:ring-2 focus:ring-amber-500`}
                  required
                  min="1"
                  max="120"
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  <Hash size={16} className="inline mr-2" />
                  Username
                </label>
                <input
                  type="text"
                  value={profile.username || ''}
                  onChange={(e) => setProfile(prev => ({ ...prev, username: e.target.value }))}
                  className={`w-full px-4 py-2 rounded-lg border ${isDarkMode
                    ? 'bg-slate-700 border-slate-600 text-white'
                    : 'bg-white border-slate-300 text-slate-900'
                    } focus:outline-none focus:ring-2 focus:ring-amber-500`}
                  required
                  placeholder="Choose a unique username"
                />
                <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Usernames must be unique across all accounts
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            type="button"
            onClick={onClose}
            className={`flex-1 px-6 py-3 rounded-lg font-medium transition-colors ${isDarkMode
              ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
          >
            Back to Dashboard
          </button>
          <button
            type="submit"
            disabled={loading || uploading}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg font-medium hover:from-amber-600 hover:to-orange-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Save size={20} />
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {/* Notification Settings */}
        <div className={`rounded-2xl border p-6 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
          }`}>
          <h3 className={`text-lg font-semibold mb-6 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            Notification Settings
          </h3>

          {/* Master Sound Toggle */}
          <div className="flex items-center justify-between mb-6 pb-6 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              {soundEnabled ? (
                <Volume2 size={20} className="text-amber-500" />
              ) : (
                <VolumeX size={20} className="text-slate-500" />
              )}
              <div>
                <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  Master Sound Control
                </p>
                <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  Enable/disable all sounds globally
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleMasterSoundToggle}
              className={`relative w-14 h-7 rounded-full transition-colors ${soundEnabled ? 'bg-amber-500' : 'bg-slate-600'
                }`}
            >
              <span
                className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${soundEnabled ? 'translate-x-7' : ''
                  }`}
              />
            </button>
          </div>

          {/* Volume Control */}
          {soundEnabled && (
            <div className="mb-6 pb-6 border-b border-slate-200 dark:border-slate-700">
              <label className={`block text-sm font-medium mb-3 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Volume Level: {Math.round(soundVolume * 100)}%
              </label>
              <div className="flex items-center gap-3">
                <VolumeX size={16} className={isDarkMode ? 'text-slate-400' : 'text-slate-500'} />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={soundVolume}
                  onChange={(e) => setSoundVolume(parseFloat(e.target.value))}
                  className="flex-1 h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  style={{
                    background: `linear-gradient(to right, rgb(245, 158, 11) 0%, rgb(245, 158, 11) ${soundVolume * 100}%, rgb(71, 85, 105) ${soundVolume * 100}%, rgb(71, 85, 105) 100%)`
                  }}
                />
                <Volume2 size={16} className={isDarkMode ? 'text-slate-400' : 'text-slate-500'} />
                <button
                  type="button"
                  onClick={playPreviewSound}
                  className="ml-2 px-3 py-1 text-xs font-medium rounded-md bg-amber-500 text-white hover:bg-amber-600 transition-colors"
                >
                  Test Sound
                </button>
              </div>
            </div>
          )}

          {/* Individual Sound Controls */}
          <div className={`space-y-4 transition-opacity ${soundEnabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
            {/* Incoming Call Sound */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Phone size={18} className={incomingCallSoundEnabled ? 'text-green-500' : 'text-slate-400'} />
                <div>
                  <p className={`font-medium text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    Incoming Call Ringtone
                  </p>
                  <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    Play ringtone for incoming video calls
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleIncomingCallToggle}
                disabled={!soundEnabled}
                className={`relative w-12 h-6 rounded-full transition-colors ${incomingCallSoundEnabled ? 'bg-green-500' : 'bg-slate-600'
                  }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${incomingCallSoundEnabled ? 'translate-x-6' : ''
                    }`}
                />
              </button>
            </div>

            {/* Receive Message Sound */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Volume2 size={18} className={receiveMsgSoundEnabled ? 'text-blue-500' : 'text-slate-400'} />
                <div>
                  <p className={`font-medium text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    Receive Message Sound
                  </p>
                  <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    Play sound when receiving messages
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleReceiveMsgToggle}
                disabled={!soundEnabled}
                className={`relative w-12 h-6 rounded-full transition-colors ${receiveMsgSoundEnabled ? 'bg-blue-500' : 'bg-slate-600'
                  }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${receiveMsgSoundEnabled ? 'translate-x-6' : ''
                    }`}
                />
              </button>
            </div>

            {/* Send Message Sound */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Send size={18} className={sendMsgSoundEnabled ? 'text-purple-500' : 'text-slate-400'} />
                <div>
                  <p className={`font-medium text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    Send Message Sound
                  </p>
                  <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    Play sound when sending messages
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleSendMsgToggle}
                disabled={!soundEnabled}
                className={`relative w-12 h-6 rounded-full transition-colors ${sendMsgSoundEnabled ? 'bg-purple-500' : 'bg-slate-600'
                  }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${sendMsgSoundEnabled ? 'translate-x-6' : ''
                    }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Account Management */}
        <div className={`rounded-2xl border p-6 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
          }`}>
          <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            Account Management
          </h3>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={signOut}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${isDarkMode
                ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                }`}
            >
              <LogOut size={18} />
              Sign Out
            </button>

            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20"
            >
              <Trash2 size={18} />
              Delete Account
            </button>
          </div>
        </div>

        {/* Delete Account Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className={`w-full max-w-md rounded-3xl shadow-2xl overflow-hidden transform transition-all ${isDarkMode ? 'bg-gradient-to-br from-slate-800 to-slate-900' : 'bg-gradient-to-br from-white to-slate-50'
              }`}>
              {/* Header with gradient */}
              <div className="bg-gradient-to-r from-red-500 to-orange-500 p-6 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm mb-3">
                  <Trash2 size={32} className="text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">
                  Delete Account?
                </h3>
                <p className="text-white/90 text-sm">
                  This action is permanent and cannot be undone
                </p>
              </div>

              {/* Content */}
              <div className="p-6">
                <p className={`text-center mb-6 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                  All your data, including study sessions, goals, and connections will be permanently removed from our system.
                </p>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={loading}
                    className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-all ${isDarkMode
                      ? 'bg-slate-700 text-white hover:bg-slate-600'
                      : 'bg-slate-200 text-slate-900 hover:bg-slate-300'
                      } disabled:opacity-50`}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteAccount}
                    disabled={loading}
                    className="flex-1 px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-red-500 to-orange-500 text-white hover:from-red-600 hover:to-orange-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-red-500/30"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 size={18} />
                        Delete Forever
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
