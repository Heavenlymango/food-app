import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription } from './ui/alert';
import { User, Store, Shield, AlertCircle, Mail } from 'lucide-react';
import { api } from '../utils/api';
import { OTPVerification } from './OTPVerification';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import logo from 'figma:asset/4b19b246aa3bf4bb775a1c4bcd3c068341bc26c6.png';

interface AuthFormProps {
  onAuthSuccess: (user: any) => void;
}

export function AuthForm({ onAuthSuccess }: AuthFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showOTPVerification, setShowOTPVerification] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [otpEmail, setOtpEmail] = useState('');
  const [otpName, setOtpName] = useState('');
  const [otpStudentId, setOtpStudentId] = useState('');
  const [otpType, setOtpType] = useState<'register' | 'login' | 'reset'>('register');
  
  // Student Registration
  const [studentId, setStudentId] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  
  // Login
  const [loginId, setLoginId] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginMethod, setLoginMethod] = useState<'password' | 'otp'>('password');
  const [loginEmail, setLoginEmail] = useState('');
  
  // Forgot Password
  const [resetIdentifier, setResetIdentifier] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetStep, setResetStep] = useState<'request' | 'verify' | 'reset'>('request');

  const handleStudentRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(studentEmail)) {
      setError('Please enter a valid email address');
      setIsLoading(false);
      return;
    }

    try {
      // Send OTP to email
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-36162e30/api/auth/send-otp`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            email: studentEmail,
            name: studentName,
            studentId,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send OTP');
      }

      const data = await response.json();
      
      // For demo: Show OTP in alert (REMOVE IN PRODUCTION!)
      if (data.debug?.otp) {
        alert(`📧 Demo Mode: Your OTP is ${data.debug.otp}\n\nIn production, this would be sent to your email.`);
      }

      // Show OTP verification screen
      setOtpEmail(studentEmail);
      setOtpName(studentName);
      setOtpStudentId(studentId);
      setOtpType('register');
      setShowOTPVerification(true);
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const data = await api.post('/api/auth/login', {
        userId: loginId,
        password: loginPassword,
      });

      onAuthSuccess(data.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginWithOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(loginEmail)) {
      setError('Please enter a valid email address');
      setIsLoading(false);
      return;
    }

    try {
      // Send OTP to email for login
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-36162e30/api/auth/send-login-otp`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            email: loginEmail,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send OTP');
      }

      const data = await response.json();
      
      // For demo: Show OTP in alert (REMOVE IN PRODUCTION!)
      if (data.debug?.otp) {
        alert(`📧 Demo Mode: Your OTP is ${data.debug.otp}\n\nIn production, this would be sent to your email.`);
      }

      // Show OTP verification screen
      setOtpEmail(loginEmail);
      setOtpName(data.name || '');
      setOtpStudentId(data.studentId || '');
      setOtpType('login');
      setShowOTPVerification(true);
    } catch (err: any) {
      console.error('Login OTP error:', err);
      setError(err.message || 'Failed to send login code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPasswordRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(resetIdentifier)) {
      setError('Please enter a valid email address');
      setIsLoading(false);
      return;
    }

    try {
      // Send OTP for password reset
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-36162e30/api/auth/send-otp`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            email: resetIdentifier,
            type: 'reset',
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send reset code');
      }

      const data = await response.json();
      
      // For demo: Show OTP in alert (REMOVE IN PRODUCTION!)
      if (data.debug?.otp) {
        alert(`📧 Demo Mode: Your OTP is ${data.debug.otp}\n\nIn production, this would be sent to your email.`);
      }

      // Show OTP verification screen
      setOtpEmail(resetIdentifier);
      setOtpName('');
      setOtpStudentId('');
      setOtpType('reset');
      setShowOTPVerification(true);
      setShowForgotPassword(false);
    } catch (err: any) {
      console.error('Forgot password error:', err);
      setError(err.message || 'Failed to send reset code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    try {
      const data = await api.post('/api/auth/reset-password', {
        email: otpEmail,
        otp: otpStudentId, // Reusing otpStudentId for OTP
        newPassword,
      });

      onAuthSuccess(data.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {showOTPVerification ? (
        <OTPVerification
          email={otpEmail}
          name={otpName}
          studentId={otpStudentId}
          otpType={otpType}
          onVerificationSuccess={onAuthSuccess}
          onBack={() => {
            setShowOTPVerification(false);
            setShowForgotPassword(false);
          }}
        />
      ) : showForgotPassword ? (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-red-50 p-4">
          <Card className="w-full max-w-md p-6">
            <div className="mb-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowForgotPassword(false)}
                className="mb-4"
              >
                ← Back to Login
              </Button>
              <h2 className="text-2xl font-bold text-center">Forgot Password</h2>
              <p className="text-center text-muted-foreground mt-2">
                Enter your email to receive a verification code
              </p>
            </div>

            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleForgotPasswordRequest} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="resetIdentifier">Email Address</Label>
                <Input
                  id="resetIdentifier"
                  type="email"
                  placeholder="your.email@rupp.edu.kh"
                  value={resetIdentifier}
                  onChange={(e) => setResetIdentifier(e.target.value)}
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-orange-600 hover:bg-orange-700"
                disabled={isLoading}
              >
                {isLoading ? 'Sending Code...' : 'Send Reset Code'}
              </Button>
            </form>
          </Card>
        </div>
      ) : (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-red-50 p-4">
          <Card className="w-full max-w-md p-6">
            <div className="text-center mb-6">
              <img 
                src={logo} 
                alt="Campus Food Ordering System" 
                className="w-48 h-auto mx-auto mb-4"
              />
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
                <TabsTrigger value="student">Student Register</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <User className="h-5 w-5 text-orange-600" />
                    <h3>Login</h3>
                  </div>

                  {/* Login Method Toggle */}
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <Button
                      type="button"
                      variant={loginMethod === 'password' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setLoginMethod('password')}
                      className={loginMethod === 'password' ? 'bg-orange-600 hover:bg-orange-700' : ''}
                    >
                      Password
                    </Button>
                    <Button
                      type="button"
                      variant={loginMethod === 'otp' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setLoginMethod('otp')}
                      className={loginMethod === 'otp' ? 'bg-orange-600 hover:bg-orange-700' : ''}
                    >
                      Email OTP
                    </Button>
                  </div>

                  {loginMethod === 'password' ? (
                    <form onSubmit={handleLogin} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="loginId">Student ID or Seller ID</Label>
                        <Input
                          id="loginId"
                          placeholder="e.g., 20230001 or A1"
                          value={loginId}
                          onChange={(e) => setLoginId(e.target.value)}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="loginPassword">Password</Label>
                          <Button
                            type="button"
                            variant="link"
                            size="sm"
                            onClick={() => setShowForgotPassword(true)}
                            className="text-xs text-orange-600 p-0 h-auto"
                          >
                            Forgot Password?
                          </Button>
                        </div>
                        <Input
                          id="loginPassword"
                          type="password"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          required
                        />
                      </div>

                      <Button
                        type="submit"
                        className="w-full bg-orange-600 hover:bg-orange-700"
                        disabled={isLoading}
                      >
                        {isLoading ? 'Logging in...' : 'Login'}
                      </Button>

                      <p className="text-sm text-gray-500 text-center mt-4">
                        Sellers: Login with your shop ID (e.g., A1, B2, IFL-1)
                        <br />
                        Default password: campus123
                      </p>
                    </form>
                  ) : (
                    <form onSubmit={handleLoginWithOTP} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="loginEmail">Email Address</Label>
                        <Input
                          id="loginEmail"
                          type="email"
                          placeholder="your.email@rupp.edu.kh"
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          required
                        />
                        <p className="text-xs text-muted-foreground">
                          We'll send a verification code to this email
                        </p>
                      </div>

                      <Button
                        type="submit"
                        className="w-full bg-orange-600 hover:bg-orange-700"
                        disabled={isLoading}
                      >
                        {isLoading ? 'Sending Code...' : 'Send Login Code'}
                      </Button>

                      <p className="text-sm text-gray-500 text-center mt-4">
                        For students only. Sellers must use password login.
                      </p>
                    </form>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="student">
                <form onSubmit={handleStudentRegister} className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Mail className="h-5 w-5 text-orange-600" />
                    <h3>Student Registration</h3>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="studentId">Student ID</Label>
                    <Input
                      id="studentId"
                      placeholder="e.g., 20230001"
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="studentName">Full Name</Label>
                    <Input
                      id="studentName"
                      placeholder="Your full name"
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="studentEmail">Email Address *</Label>
                    <Input
                      id="studentEmail"
                      type="email"
                      placeholder="your.email@rupp.edu.kh"
                      value={studentEmail}
                      onChange={(e) => setStudentEmail(e.target.value)}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      We'll send a verification code to this email
                    </p>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-orange-600 hover:bg-orange-700"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Sending Code...' : 'Continue with Email'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </Card>
        </div>
      )}
    </>
  );
}