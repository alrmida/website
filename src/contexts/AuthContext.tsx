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
  signUp: (email: string, password: string, username: string, invitationToken: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  validateInvitation: (email: string, token: string) => Promise<{ valid: boolean; error?: any; role?: string }>;
  // Impersonation features
  isImpersonating: boolean;
  impersonatedProfile: Profile | null;
  startImpersonation: (targetProfile: Profile) => void;
  stopImpersonation: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper function to map database roles to frontend roles
const mapDatabaseRoleToFrontend = (dbRole: string): 'client' | 'commercial' | 'admin' => {
  switch (dbRole) {
    case 'kumulus_personnel':
      return 'commercial'; // Sales/personnel role - no admin access
    case 'kumulus_admin':
      return 'admin'; // True admin role
    case 'client':
      return 'client';
    default:
      return 'client';
  }
};

// Helper function to map frontend roles to database roles
const mapFrontendRoleToDatabase = (frontendRole: 'client' | 'commercial' | 'admin'): string => {
  switch (frontendRole) {
    case 'commercial':
      return 'kumulus_personnel';
    case 'admin':
      return 'kumulus_admin';
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
  
  // Impersonation state
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [impersonatedProfile, setImpersonatedProfile] = useState<Profile | null>(null);
  const [originalProfile, setOriginalProfile] = useState<Profile | null>(null);

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
                // Reset impersonation on auth change
                setIsImpersonating(false);
                setImpersonatedProfile(null);
                setOriginalProfile(null);
              }
            } catch (err) {
              console.error('Error fetching profile:', err);
            }
          }, 0);
        } else {
          setProfile(null);
          setIsImpersonating(false);
          setImpersonatedProfile(null);
          setOriginalProfile(null);
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

  const validateInvitation = async (email: string, token: string) => {
    try {
      const { data: invitation, error } = await supabase
        .from('invitations')
        .select('*')
        .eq('email', email.toLowerCase())
        .eq('token', token)
        .is('used_at', null)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error || !invitation) {
        return { valid: false, error: 'Invalid or expired invitation' };
      }

      return { 
        valid: true, 
        role: mapDatabaseRoleToFrontend(invitation.role)
      };
    } catch (error: any) {
      return { valid: false, error: error.message };
    }
  };

  const signIn = async (email: string, password: string) => {
    console.log('Attempting to sign in with:', email);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    console.log('Sign in result:', error ? 'Error: ' + error.message : 'Success');
    return { error };
  };

  const signUp = async (email: string, password: string, username: string, invitationToken: string) => {
    try {
      // First validate the invitation
      const { valid, error: invitationError, role } = await validateInvitation(email, invitationToken);
      
      if (!valid) {
        return { error: { message: invitationError || 'Invalid invitation' } };
      }

      // Convert role to database format
      const dbRole = mapFrontendRoleToDatabase(role as 'client' | 'commercial' | 'admin');
      
      // Sign up the user
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            role: dbRole
          }
        }
      });

      if (signUpError) {
        return { error: signUpError };
      }

      // Mark invitation as used
      if (data.user) {
        await supabase
          .from('invitations')
          .update({ used_at: new Date().toISOString() })
          .eq('email', email.toLowerCase())
          .eq('token', invitationToken);
      }

      return { error: null };
    } catch (error: any) {
      return { error: { message: error.message } };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setIsImpersonating(false);
    setImpersonatedProfile(null);
    setOriginalProfile(null);
  };

  const startImpersonation = (targetProfile: Profile) => {
    if (profile?.role === 'admin' && !isImpersonating) {
      console.log('Starting impersonation of:', targetProfile.username);
      setOriginalProfile(profile);
      setImpersonatedProfile(targetProfile);
      setIsImpersonating(true);
    }
  };

  const stopImpersonation = () => {
    console.log('Stopping impersonation');
    setIsImpersonating(false);
    setImpersonatedProfile(null);
    setOriginalProfile(null);
  };

  // Return the impersonated profile if impersonating, otherwise the original profile
  const currentProfile = isImpersonating ? impersonatedProfile : profile;

  const value = {
    user,
    session,
    profile: currentProfile,
    loading,
    signIn,
    signUp,
    signOut,
    validateInvitation,
    isImpersonating,
    impersonatedProfile,
    startImpersonation,
    stopImpersonation,
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
