import { useAuth } from '../contexts/AuthContext';
import { LoginPage } from './LoginPage';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  
  console.log('ProtectedRoute - loading:', loading, 'user:', user?.id);
  
  if (loading) {
    console.log('Showing loading screen');
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    console.log('No user, showing login page');
    return <LoginPage />;
  }

  console.log('User authenticated, rendering children');
  return <>{children}</>;
}