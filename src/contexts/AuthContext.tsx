import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../utils/supabase';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<{ error: any }>;
    signUp: (email: string, password: string, metadata?: any) => Promise<{ error: any }>;
    signOut: () => Promise<void>;
    continueAsGuest: () => void;
    isGuest: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [isGuest, setIsGuest] = useState(false);

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session }, error }) => {
            if (error) {
                console.error('Error getting session:', error);
            }
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        }).catch((err) => {
            console.error('Failed to get session:', err);
            setLoading(false);
        });

        // Listen for auth changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const signIn = async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        return { error };
    };

    const signUp = async (email: string, password: string, metadata?: any) => {
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: metadata
            }
        });
        return { error };
    };

    // Sign out user
    // NOTE: This only clears the authentication session
    // User data (subjects, sessions, goals) persists in:
    // 1. localStorage with user-specific keys (study_planner_subjects_${userId})
    // 2. Supabase database (synced automatically)
    // Data will be restored when user logs back in
    const signOut = async () => {
        setIsGuest(false);
        await supabase.auth.signOut();
    };

    const continueAsGuest = () => {
        setIsGuest(true);
        setUser({ id: 'guest', email: 'guest@example.com' } as User);
    };

    const value = {
        user,
        session,
        loading,
        signIn,
        signUp,
        signOut,
        continueAsGuest,
        isGuest,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}