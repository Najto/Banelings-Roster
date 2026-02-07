import React, { useState } from 'react';
import { authService } from '../services/authService';
import { X, Mail, Lock, User, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';

interface AuthModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onClose, onSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!email || (!password && mode !== 'reset')) {
      setError('Please fill in all fields');
      return;
    }

    if (mode === 'register' && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (mode !== 'reset' && password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'login') {
        const { error } = await authService.signIn(email, password);
        if (error) throw error;
        onSuccess();
      } else if (mode === 'register') {
        const { error } = await authService.signUp(email, password);
        if (error) throw error;
        setSuccess('Account created successfully! You can now log in.');
        setMode('login');
      } else if (mode === 'reset') {
        const { error } = await authService.resetPassword(email);
        if (error) throw error;
        setSuccess('Password reset email sent! Check your inbox.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#050507] border border-white/10 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <h2 className="text-xl font-black text-white uppercase tracking-wider">
            {mode === 'login' ? 'Login' : mode === 'register' ? 'Create Account' : 'Reset Password'}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-xs font-bold flex items-center gap-2">
              <AlertTriangle size={16} />
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-3 rounded-lg text-xs font-bold flex items-center gap-2">
              <CheckCircle size={16} />
              {success}
            </div>
          )}

          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-10 py-3 text-white text-sm focus:outline-none focus:border-indigo-500/50 transition-colors"
                placeholder="your@email.com"
                disabled={loading}
              />
            </div>
          </div>

          {mode !== 'reset' && (
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-10 py-3 text-white text-sm focus:outline-none focus:border-indigo-500/50 transition-colors"
                  placeholder="••••••••"
                  disabled={loading}
                />
              </div>
            </div>
          )}

          {mode === 'register' && (
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-10 py-3 text-white text-sm focus:outline-none focus:border-indigo-500/50 transition-colors"
                  placeholder="••••••••"
                  disabled={loading}
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-lg font-black text-sm uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Processing...
              </>
            ) : (
              <>
                {mode === 'login' ? 'Sign In' : mode === 'register' ? 'Create Account' : 'Send Reset Link'}
              </>
            )}
          </button>

          <div className="flex flex-col gap-2 pt-4 border-t border-white/5">
            {mode === 'login' && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setError(null);
                    setSuccess(null);
                  }}
                  className="text-xs text-slate-400 hover:text-indigo-400 transition-colors text-center"
                >
                  Don't have an account? <span className="font-bold">Register</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('reset');
                    setError(null);
                    setSuccess(null);
                  }}
                  className="text-xs text-slate-400 hover:text-indigo-400 transition-colors text-center"
                >
                  Forgot password? <span className="font-bold">Reset</span>
                </button>
              </>
            )}
            {(mode === 'register' || mode === 'reset') && (
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError(null);
                  setSuccess(null);
                }}
                className="text-xs text-slate-400 hover:text-indigo-400 transition-colors text-center"
              >
                Already have an account? <span className="font-bold">Sign In</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
