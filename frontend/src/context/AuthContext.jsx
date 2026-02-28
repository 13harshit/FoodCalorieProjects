import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    const initRef = useRef(false);

    useEffect(() => {
        let sessionInterval = null;
        let currentSessionId = null;

        // Track user session
        const startSession = async (userId) => {
            const sessionStartTime = Date.now();
            try {
                const { data, error } = await supabase.from('user_sessions').insert([{
                    user_id: userId,
                    login_at: new Date(sessionStartTime).toISOString(),
                    last_active_at: new Date(sessionStartTime).toISOString(),
                    duration_minutes: 0,
                    pages_visited: 1
                }]).select().single();

                if (error) console.error('Session insert error:', error);
                if (data) currentSessionId = data.id;
            } catch (e) { console.warn('Session tracking:', e); }

            // Update session every 1 minute
            sessionInterval = setInterval(async () => {
                if (currentSessionId) {
                    await supabase.from('user_sessions')
                        .update({
                            last_active_at: new Date().toISOString(),
                            duration_minutes: Math.round((Date.now() - sessionStartTime) / 60000)
                        })
                        .eq('id', currentSessionId).catch(() => { });
                }
            }, 60000);
        };

        // Get initial session
        const initializeAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setUser(session?.user ?? null);
            if (session?.user) {
                await fetchProfile(session.user.id);
                startSession(session.user.id);
            }
            setLoading(false);
            initRef.current = true;
        };

        initializeAuth();

        // Listen for auth changes (like logging in or out later)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
                if (!initRef.current) return; // Prevent double firing on mount

                setUser(session?.user ?? null);
                if (session?.user) {
                    await fetchProfile(session.user.id);
                    if (_event === 'SIGNED_IN') {
                        startSession(session.user.id);
                    }
                } else {
                    setUserProfile(null);
                    if (sessionInterval) clearInterval(sessionInterval);
                }
                setLoading(false);
            }
        );

        return () => {
            subscription.unsubscribe();
            if (sessionInterval) clearInterval(sessionInterval);
        };
    }, []);

    const fetchProfile = async (userId) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error && error.code === 'PGRST116') {
                // Profile doesn't exist yet, create one
                // Instead of failing if user variable is null here, use getSession directly or fallback email
                const { data: sessionData } = await supabase.auth.getSession();
                const sessionUser = sessionData?.session?.user;

                const { data: newProfile, error: createError } = await supabase
                    .from('profiles')
                    .insert([{
                        id: userId,
                        email: sessionUser?.email || '',
                        role: 'user',
                        created_at: new Date().toISOString()
                    }])
                    .select()
                    .single();

                if (!createError) {
                    setUserProfile(newProfile);
                    return;
                }
            }

            if (data) {
                setUserProfile(data);
            } else {
                // Failsafe: if no data and no error handled, just set a basic profile so app unblocks
                setUserProfile({ id: userId, role: 'user' });
            }
        } catch (err) {
            console.error('Error fetching profile:', err);
            // Block infinite loading
            setUserProfile({ id: userId, role: 'user' });
        }
    };

    const signUp = async (email, password, fullName) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { full_name: fullName }
            }
        });
        return { data, error };
    };

    const signIn = async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        return { data, error };
    };

    const signInWithGoogle = async () => {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin,
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent',
                },
            }
        });
        return { data, error };
    };

    const signOut = async () => {
        const { error } = await supabase.auth.signOut();
        return { error };
    };

    const resetPassword = async (email) => {
        const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + '/reset-password'
        });
        return { data, error };
    };

    const updatePassword = async (newPassword) => {
        const { data, error } = await supabase.auth.updateUser({
            password: newPassword
        });
        return { data, error };
    };

    const value = {
        user,
        userProfile,
        loading,
        signUp,
        signIn,
        signInWithGoogle,
        signOut,
        resetPassword,
        updatePassword,
        fetchProfile
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}
