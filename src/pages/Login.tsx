import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [invitationToken, setInvitationToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [settingUpDemo, setSettingUpDemo] = useState(false);
  const [validatingInvitation, setValidatingInvitation] = useState(false);
  const [invitationValid, setInvitationValid] = useState<boolean | null>(null);
  const [showSignupForm, setShowSignupForm] = useState(false);
  const { signIn, signUp, validateInvitation, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (user) {
      console.log('User logged in, redirecting to dashboard');
      navigate('/');
    }
  }, [user, navigate]);

  useEffect(() => {
    // Check if there's an invitation token in the URL
    const tokenFromUrl = searchParams.get('token');
    const emailFromUrl = searchParams.get('email');
    
    if (tokenFromUrl) {
      setInvitationToken(tokenFromUrl);
      setShowSignupForm(true);
    }
    if (emailFromUrl) {
      setEmail(emailFromUrl);
    }
  }, [searchParams]);

  const handleSetupDemoAccounts = async () => {
    setSettingUpDemo(true);
    try {
      const { data, error } = await supabase.functions.invoke('setup-demo-accounts');
      
      if (error) {
        console.error('Demo setup error:', error);
        toast({
          title: "Error setting up demo accounts",
          description: error.message || "Failed to create demo accounts",
          variant: "destructive"
        });
      } else {
        console.log('Demo setup successful:', data);
        toast({
          title: "Demo accounts created successfully",
          description: "You can now sign in with kumulus@kumuluswater.com using password 000000",
        });
        // Pre-fill the login form
        setEmail('kumulus@kumuluswater.com');
        setPassword('000000');
      }
    } catch (err) {
      console.error('Demo setup error:', err);
      toast({
        title: "Error setting up demo accounts",
        description: "Failed to create demo accounts",
        variant: "destructive"
      });
    }
    setSettingUpDemo(false);
  };

  const handleValidateInvitation = async () => {
    if (!email || !invitationToken) {
      toast({
        title: "Missing information",
        description: "Please enter both email and invitation token",
        variant: "destructive"
      });
      return;
    }

    setValidatingInvitation(true);
    const { valid, error } = await validateInvitation(email, invitationToken);
    
    if (valid) {
      setInvitationValid(true);
      toast({
        title: "Invitation validated",
        description: "You can now create your account!",
      });
    } else {
      setInvitationValid(false);
      toast({
        title: "Invalid invitation",
        description: error || "Please check your invitation token and email",
        variant: "destructive"
      });
    }
    setValidatingInvitation(false);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    console.log('Attempting sign in with:', email);
    const { error } = await signIn(email, password);
    
    if (error) {
      console.error('Sign in error:', error);
      toast({
        title: "Error signing in",
        description: error.message,
        variant: "destructive"
      });
    } else {
      console.log('Sign in successful');
      toast({
        title: "Success",
        description: "You have successfully signed in!",
      });
    }
    
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!invitationValid) {
      toast({
        title: "Invitation required",
        description: "Please validate your invitation first",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    const { error } = await signUp(email, password, username, invitationToken);
    
    if (error) {
      toast({
        title: "Error signing up",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Account created successfully",
        description: "Please check your email to verify your account.",
      });
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <img 
              src="/lovable-uploads/913ab43b-9664-4082-88da-18b2190e49c2.png" 
              alt="KUMULUS" 
              className="h-24 w-auto object-contain dark:hidden block"
              onError={(e) => {
                const target = e.currentTarget;
                target.style.display = 'none';
                const fallback = target.nextElementSibling as HTMLElement;
                if (fallback) {
                  fallback.style.display = 'block';
                }
              }}
            />
            <img 
              src="/lovable-uploads/6b2020dd-160c-4c6a-bac9-5f824123d5d1.png" 
              alt="KUMULUS" 
              className="h-24 w-auto object-contain dark:block hidden"
              onError={(e) => {
                const target = e.currentTarget;
                target.style.display = 'none';
              }}
            />
            <CardTitle className="text-3xl font-poppins">KUMULUS AWG</CardTitle>
          </div>
          <CardDescription className="font-poppins">
            {showSignupForm ? 'Create your account' : 'Sign in to access your dashboard'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* Demo Setup Section */}
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
              Demo Mode: Click below to create demo accounts for testing
            </p>
            <Button 
              onClick={handleSetupDemoAccounts}
              disabled={settingUpDemo}
              className="w-full mb-2"
              variant="outline"
            >
              {settingUpDemo ? 'Setting up demo accounts...' : 'Setup Demo Accounts'}
            </Button>
            <p className="text-xs text-blue-600 dark:text-blue-400">
              This will create kumulus@kumuluswater.com with password 000000
            </p>
          </div>

          {!showSignupForm ? (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
              
              <div className="text-center pt-4">
                <Button 
                  type="button" 
                  variant="link" 
                  onClick={() => setShowSignupForm(true)}
                  className="text-sm"
                >
                  Have an invitation? Create account
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                  Account creation requires a valid invitation. Please enter your invitation details below.
                </p>
                
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email Address</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setInvitationValid(null);
                      }}
                      placeholder="Your email address"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invitation-token">Invitation Token</Label>
                    <Input
                      id="invitation-token"
                      value={invitationToken}
                      onChange={(e) => {
                        setInvitationToken(e.target.value);
                        setInvitationValid(null);
                      }}
                      placeholder="Enter your invitation token"
                      required
                    />
                  </div>
                  <Button 
                    type="button" 
                    onClick={handleValidateInvitation}
                    disabled={validatingInvitation || !email || !invitationToken}
                    className="w-full"
                    variant="outline"
                  >
                    {validatingInvitation ? 'Validating...' : 'Validate Invitation'}
                  </Button>
                </div>
              </div>

              {invitationValid && (
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-username">Username</Label>
                    <Input
                      id="signup-username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Creating account...' : 'Create Account'}
                  </Button>
                </form>
              )}
              
              <div className="text-center pt-4">
                <Button 
                  type="button" 
                  variant="link" 
                  onClick={() => setShowSignupForm(false)}
                  className="text-sm"
                >
                  Already have an account? Sign in
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
