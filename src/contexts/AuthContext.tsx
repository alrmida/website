
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  username: string;
  role: 'client' | 'commercial' | 'admin';
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, username: string, role: 'client' | 'commercial' | 'admin') => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper function to map database roles to frontend roles
const mapDatabaseRoleToFrontend = (dbRole: string): 'client' | 'commercial' | 'admin' => {
  switch (dbRole) {
    case 'kumulus_personnel':
      return 'admin'; // Map kumulus_personnel to admin instead of commercial
    case 'client':
      return 'client';
    default:
      return 'client'; // Default fallback
  }
};

// Helper function to map frontend roles to database roles
const mapFrontendRoleToDatabase = (frontendRole: 'client' | 'commercial' | 'admin'): string => {
  switch (frontendRole) {
    case 'commercial':
    case 'admin':
      return 'kumulus_personnel'; // Map both commercial and admin to kumulus_personnel in DB
    case 'client':
      return 'client';
    default:
      return 'client';
  }
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Fetch user profile
          setTimeout(async () => {
            try {
              const { data: profileData, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();
              
              console.log('Profile data:', profileData, 'Error:', error);
              if (profileData) {
                // Map the database role to frontend role
                const mappedProfile: Profile = {
                  id: profileData.id,
                  username: profileData.username,
                  role: mapDatabaseRoleToFrontend(profileData.role)
                };
                setProfile(mappedProfile);
              }
            } catch (err) {
              console.error('Error fetching profile:', err);
            }
          }, 0);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session check:', session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    console.log('Attempting to sign in with:', email);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    console.log('Sign in result:', error ? 'Error: ' + error.message : 'Success');
    return { error };
  };

  const signUp = async (email: string, password: string, username: string, role: 'client' | 'commercial' | 'admin') => {
    const dbRole = mapFrontendRoleToDatabase(role);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          role: dbRole
        }
      }
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    user,
    session,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
