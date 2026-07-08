import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { GlassCard, GlassInput, GlassButton } from '../components/ui/Glass';
import { Lock, LogIn, Loader2, Eye, EyeOff, GraduationCap } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  if (isAuthenticated) {
    navigate('/dashboard', { replace: true });
    return null;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter email and password.');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid email or password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mobile-container flex items-start justify-center p-6 pt-48 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,_#e0c3fc_0%,_#8ec5fc_100%)]"></div>
      <div className="absolute top-[-5%] left-[-5%] w-[400px] h-[400px] bg-white/40 rounded-full blur-[100px] animate-pulse pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-300/30 rounded-full blur-[120px] animate-pulse pointer-events-none" style={{ animationDelay: '2s' }}></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-purple-200/20 rounded-full blur-[80px] pointer-events-none"></div>

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 80, damping: 20 }}
        className="w-full max-w-sm relative z-10"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-center mb-12"
        >
          <h1 className="text-7xl font-black text-slate-900 mb-4 drop-shadow-sm">
            Ok20
          </h1>
          <p className="text-blue-700 font-bold text-[10px] uppercase tracking-[0.4em] leading-relaxed">School Examination Management System</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, type: "spring", stiffness: 100 }}
        >
          <GlassCard droplet className="p-8 border-white/60 bg-white/20 backdrop-blur-3xl shadow-2xl relative overflow-hidden">
            <form onSubmit={handleLogin} className="flex flex-col items-center gap-6 relative z-10">
              <div className="flex flex-col items-center gap-2 w-full">
                <span className="text-slate-700 text-[10px] font-bold uppercase tracking-[0.2em] mb-2">Secure Login</span>
                <div className="w-full flex flex-col gap-4">
                  <GlassInput
                    label="Email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="admin@school.com"
                    sizing="sm"
                    required
                  />
                  <div className="relative">
                    <GlassInput
                      label="Password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Enter password"
                      sizing="sm"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-[60%] -translate-y-1/2 text-slate-500 hover:text-slate-700"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              {error && (
                <p className="text-red-600 text-xs font-bold bg-red-50 w-full text-center py-2 rounded-lg">{error}</p>
              )}

              <div className="w-full pt-2">
                <GlassButton type="submit" className="w-full justify-center" disabled={isLoading}>
                  {isLoading ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={18} />}
                  {isLoading ? 'Signing in...' : 'Sign In'}
                </GlassButton>
              </div>

              <div className="w-full pt-2">
                <div className="h-[1px] w-full bg-slate-200/50 mb-4"></div>
                <p className="text-[9px] text-slate-500 text-center uppercase tracking-[0.3em] font-medium">Cloud-Based School Management System</p>
              </div>

              <Link to="/student-portal" className="flex items-center justify-center gap-2 w-full py-2 text-[11px] font-bold text-blue-700 bg-blue-50/50 rounded-xl border border-blue-200/60 hover:bg-blue-100/50 transition-all">
                <GraduationCap size={16} />
                Student Portal — View Report
              </Link>

              <div className="w-full mt-2 p-3 rounded-xl bg-blue-50/50 border border-blue-200/60">
                <p className="text-[10px] font-bold text-blue-700 text-center uppercase tracking-[0.2em] mb-1">Demo Credentials</p>
                <p className="text-[10px] text-slate-600 text-center">Email: admin@school.com</p>
                <p className="text-[10px] text-slate-600 text-center">Password: Admin@12345</p>
              </div>
            </form>
          </GlassCard>
        </motion.div>
      </motion.div>
    </div>
  );
};
