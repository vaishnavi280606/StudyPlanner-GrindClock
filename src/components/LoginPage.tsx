import { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, Zap, User, GraduationCap, Briefcase, Phone, Hash, Calendar } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);


  // Auth States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Profile States
  const [role, setRole] = useState<'student' | 'mentor'>('student');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other' | ''>('');
  const [profession, setProfession] = useState('');
  const [experience, setExperience] = useState('');
  const [className, setClassName] = useState('');
  const [course, setCourse] = useState('');
  const [age, setAge] = useState('');
  const [username, setUsername] = useState('');

  const { signIn, signUp, continueAsGuest } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        const result = await signIn(email, password);
        if (result.error) setError(result.error.message);
      } else {
        const metadata = {
          full_name: fullName,
          role,
          phone_number: phoneNumber,
          gender,
          ...(role === 'mentor'
            ? { profession, experience, username }
            : { class: className, course, age: parseInt(age), username }
          )
        };
        const result = await signUp(email, password, metadata);
        if (result.error) {
          setError(result.error.message);
        } else {
          setError('Check your email for the confirmation link!');
        }
      }
    } catch (err) {
      setError('An unexpected error occurred: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-md">
        {/* Settings Toggle */}


        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-4 rounded-2xl shadow-2xl inline-block mb-4">
            <Zap className="text-white" size={40} />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Grind Clock</h1>
          <p className="text-slate-400">Push Your Limits Every Day</p>
        </div>

        {/* Configuration Form */}


        {/* Auth Form */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-8 shadow-2xl">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
            <p className="text-slate-400">{isLogin ? 'Sign in to continue your grind' : 'Start your productivity journey'}</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {!isLogin && (
            <div className="flex p-1 bg-slate-900/50 rounded-xl mb-6 border border-slate-700">
              <button
                onClick={() => setRole('student')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${role === 'student' ? 'bg-amber-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <GraduationCap size={18} />
                Student
              </button>
              <button
                onClick={() => setRole('mentor')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${role === 'mentor' ? 'bg-amber-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <Briefcase size={18} />
                Mentor
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                    <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-amber-500 outline-none" placeholder="John Doe" required />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                    <input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-amber-500 outline-none" placeholder="+1 234 567 890" required />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as 'male' | 'female' | 'other' | '')}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-amber-500 outline-none"
                    required
                  >
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {role === 'mentor' ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Profession</label>
                      <div className="relative">
                        <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                        <input type="text" value={profession} onChange={(e) => setProfession(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-amber-500 outline-none" placeholder="Mathematics Professor" required />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Experience</label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                        <input type="text" value={experience} onChange={(e) => setExperience(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-amber-500 outline-none" placeholder="10+ years" required />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Class</label>
                        <input type="text" value={className} onChange={(e) => setClassName(e.target.value)} className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-amber-500 outline-none" placeholder="12th Grade" required />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Age</label>
                        <input type="number" value={age} onChange={(e) => setAge(e.target.value)} className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-amber-500 outline-none" placeholder="18" required />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Course</label>
                      <input type="text" value={course} onChange={(e) => setCourse(e.target.value)} className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-amber-500 outline-none" placeholder="Science / Engineering" required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Username</label>
                      <div className="relative">
                        <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                        <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-amber-500 outline-none" placeholder="grind_master" required />
                      </div>
                    </div>
                  </>
                )}
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-amber-500 outline-none" placeholder="Enter your email" required />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-10 pr-12 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-amber-500 outline-none" placeholder="Enter your password" required minLength={6} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors">
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-white py-3 rounded-lg font-semibold hover:from-amber-600 hover:to-orange-700 transition-all disabled:opacity-50">
              {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-slate-400">
              {isLogin ? "Don't have an account?" : 'Already have an account?'}
              <button onClick={() => { setIsLogin(!isLogin); setError(''); }} className="ml-2 text-amber-400 hover:text-amber-300 font-semibold transition-colors">
                {isLogin ? 'Sign Up' : 'Sign In'}
              </button>
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-700">
            <button onClick={continueAsGuest} className="w-full py-3 px-4 rounded-lg border border-slate-600 text-slate-300 font-medium hover:bg-slate-700 hover:text-white transition-all flex items-center justify-center gap-2">
              <Zap size={18} className="text-amber-500" />
              Continue as Guest (Offline Mode)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}