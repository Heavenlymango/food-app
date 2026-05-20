import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription } from './ui/alert';
import { AlertCircle } from 'lucide-react';
import { supabase, toEmail } from '../utils/supabase/client';
import logo from 'figma:asset/4b19b246aa3bf4bb775a1c4bcd3c068341bc26c6.png';

interface AuthFormProps {
  onAuthSuccess: (user: any) => void;
}

export function AuthForm({ onAuthSuccess }: AuthFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Student registration
  const [studentId, setStudentId] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [studentPassword, setStudentPassword] = useState('');

  // Login
  const [loginId, setLoginId] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Password reset
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const email = toEmail(loginId.trim());
      const { error } = await supabase.auth.signInWithPassword({ email, password: loginPassword });
      if (error) throw error;
      // App.tsx onAuthStateChange will update user automatically
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (studentPassword.length < 6) {
      setError('Password must be at least 6 characters');
      setIsLoading(false);
      return;
    }

    try {
      const campus = studentEmail.toLowerCase().includes('ifl') ? 'IFL' : 'RUPP';
      const authEmail = `${studentId.trim()}@student.local`;

      const { data, error } = await supabase.auth.signUp({
        email: authEmail,
        password: studentPassword,
        options: {
          data: {
            name: studentName.trim(),
            student_id: studentId.trim(),
            campus,
            role: 'student',
            school_email: studentEmail.trim(),
          },
        },
      });
      if (error) throw error;

      if (!data.session) {
        // Email confirmation required
        alert('Account created! Check your email to confirm, then log in.');
      }
      // If auto-confirmed, onAuthStateChange fires in App.tsx
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
        redirectTo: `${window.location.origin}/food-app/`,
      });
      if (error) throw error;
      setResetSent(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email');
    } finally {
      setIsLoading(false);
    }
  };

  if (showReset) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-red-50 p-4">
        <Card className="w-full max-w-md p-6">
          <Button variant="ghost" size="sm" onClick={() => { setShowReset(false); setResetSent(false); setError(''); }} className="mb-4">
            ← Back to Login
          </Button>
          <h2 className="text-xl font-bold mb-4">Reset Password</h2>
          {resetSent ? (
            <p className="text-green-600">Check your email for a reset link.</p>
          ) : (
            <>
              {error && <Alert variant="destructive" className="mb-4"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}
              <form onSubmit={handlePasswordReset} className="space-y-4">
                <div className="space-y-2">
                  <Label>School Email</Label>
                  <Input type="email" placeholder="your.email@rupp.edu.kh" value={resetEmail} onChange={e => setResetEmail(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700" disabled={isLoading}>
                  {isLoading ? 'Sending…' : 'Send Reset Link'}
                </Button>
              </form>
            </>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-red-50 p-4">
      <Card className="w-full max-w-md p-6">
        <div className="text-center mb-6">
          <img src={logo} alt="Campus Food" className="w-48 h-auto mx-auto mb-4" />
          <p className="text-gray-600">Register or Login to continue</p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="register">Register</TabsTrigger>
          </TabsList>

          {/* ── Login ─────────────────────────────────────────────────────── */}
          <TabsContent value="login">
            <form onSubmit={handleLogin} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Student ID, Seller ID, or Email</Label>
                <Input
                  placeholder="e.g., 20230001 or A1"
                  value={loginId}
                  onChange={e => setLoginId(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Password</Label>
                  <button type="button" onClick={() => { setShowReset(true); setError(''); }}
                    className="text-xs text-orange-600 hover:underline">
                    Forgot password?
                  </button>
                </div>
                <Input type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700" disabled={isLoading}>
                {isLoading ? 'Logging in…' : 'Login'}
              </Button>
              <p className="text-xs text-gray-500 text-center">
                Sellers: use your shop code (A1, B1, IFL-NC, IFL-DMC…) · default password: <strong>campus123</strong>
              </p>
            </form>
          </TabsContent>

          {/* ── Student Register ───────────────────────────────────────────── */}
          <TabsContent value="register">
            <form onSubmit={handleRegister} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Student ID</Label>
                <Input placeholder="e.g., 20230001" value={studentId} onChange={e => setStudentId(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input placeholder="Your full name" value={studentName} onChange={e => setStudentName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>School Email</Label>
                <Input type="email" placeholder="your.email@rupp.edu.kh" value={studentEmail} onChange={e => setStudentEmail(e.target.value)} required />
                <p className="text-xs text-muted-foreground">Used to determine your campus (RUPP / IFL)</p>
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input type="password" placeholder="Min 6 characters" value={studentPassword} onChange={e => setStudentPassword(e.target.value)} required minLength={6} />
              </div>
              <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700" disabled={isLoading}>
                {isLoading ? 'Creating account…' : 'Create Account'}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
