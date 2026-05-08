import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const { login, signup, isAuthenticated } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/home', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isSignUp) {
        if (!name.trim()) {
          toast.error('Please enter your name');
          setIsLoading(false);
          return;
        }
        await signup(name, email, password);
        toast.success('Account created successfully');
      } else {
        await login(email, password);
        toast.success('Signed in successfully');
      }
      navigate('/home');
    } catch (error: any) {
      const message = error?.message || 'Authentication failed';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50">
      {/* Left side - Brand panel */}
      <div className="hidden xl:flex xl:w-5/12 bg-gradient-to-br from-[#095859] to-[#0f5d56] p-12 flex-col justify-between text-white">
        <div>
          <div className="rounded-2xl bg-white/10 p-4 inline-flex items-center gap-3 mb-8">
            <span className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center text-xl font-semibold">
              AI
            </span>
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-white/70">Audit Intelligence</p>
              <p className="text-lg font-semibold">General Ledger Scrutiny</p>
            </div>
          </div>

          <h1 className="text-4xl font-semibold leading-tight mb-4">
            Securely uncover irregularities in your audit ledger.
          </h1>
          <p className="text-base text-white/75 max-w-xl">
            Enterprise audit intelligence for your finance team. Analyze transactions, identify risk, and keep your controls strong.
          </p>

          <div className="mt-10 space-y-4 text-sm text-white/80 max-w-md">
            <div className="flex items-start gap-3">
              <span className="mt-1 h-2.5 w-2.5 rounded-full bg-emerald-300" />
              <p>Risk-aware ledger review with intelligent rule checks.</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="mt-1 h-2.5 w-2.5 rounded-full bg-emerald-300" />
              <p>Fast onboarding for auditors and finance professionals.</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="mt-1 h-2.5 w-2.5 rounded-full bg-emerald-300" />
              <p>Secure access, clean reporting, and actionable insights.</p>
            </div>
          </div>
        </div>

        <div className="text-sm text-white/70">
          <p>© 2024 Audit Intelligence. All rights reserved.</p>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="flex-1 flex items-center justify-center px-6 py-10 lg:py-16">
        <div className="w-full max-w-xl">
          <div className="bg-white rounded-[30px] border border-slate-200 shadow-[0_20px_80px_rgba(15,23,42,0.08)] p-10">
            <div className="mb-8">
              <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]">
                Audit Workspace
              </span>
              <h2 className="mt-4 text-3xl font-semibold text-slate-900 mb-2">
                {isSignUp ? 'Create Account' : 'Sign In'}
              </h2>
              <p className="text-sm text-slate-600">
                {isSignUp ? 'Register for audit workspace access' : 'Access your audit workspace'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {isSignUp && (
                <div>
                  <label htmlFor="name" className="block text-sm text-slate-700 mb-2">
                    Full Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required={isSignUp}
                    className="w-full px-4 py-3 border border-slate-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#095859] focus:border-transparent"
                    placeholder="John Doe"
                  />
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm text-slate-700 mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-slate-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#095859] focus:border-transparent"
                  placeholder="you@company.com"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="password" className="block text-sm text-slate-700">
                    Password
                  </label>
                </div>
                <input
                  id="password"
                  type="password"
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full px-4 py-3 border border-slate-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#095859] focus:border-transparent"
                  placeholder="Enter your password"
                />
                <p className="text-xs text-slate-500 mt-1">Must be at least 8 characters</p>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full px-4 py-3 bg-[#095859] text-white rounded-2xl hover:bg-[#0B6B6A] transition-colors font-medium disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>{isSignUp ? 'Creating account...' : 'Signing in...'}</span>
                  </>
                ) : (
                  <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-sm text-[#095859] hover:text-[#0B6B6A]"
              >
                {isSignUp ? 'Already have an account? Sign In' : 'Create Account'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
