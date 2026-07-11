import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { GlassCard, GlassInput, GlassButton } from '../components/ui/Glass';
import { Lock, LogIn, Loader2, Eye, EyeOff, KeyRound } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

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

  const renderLoginForm = (sizing: 'sm' | 'md') => (
    <GlassCard droplet className={`${sizing === 'sm' ? 'p-6' : 'p-8'} border-white/60 bg-white/20 backdrop-blur-3xl shadow-2xl relative overflow-hidden focus-within:animate-pulse-glow`}>
      <form onSubmit={handleLogin} className="flex flex-col items-center gap-4 relative z-10">
        <div className="flex flex-col items-center gap-2 w-full">
          <span className="text-slate-700 font-bold uppercase tracking-[0.2em] mb-2" style={{ fontSize: sizing === 'sm' ? '10px' : '12px' }}>Sign In</span>
          <div className="w-full flex flex-col gap-4">
            <GlassInput
              label="Email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="okk@dokota.com"
              sizing={sizing}
              required
            />
            <div className="relative">
              <GlassInput
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter password"
                sizing={sizing}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-[60%] -translate-y-1/2 text-slate-500 hover:text-slate-700"
              >
                {showPassword ? <EyeOff size={sizing === 'sm' ? 16 : 18} /> : <Eye size={sizing === 'sm' ? 16 : 18} />}
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

        <div className="flex flex-col gap-2 w-full pt-2">
          <Link to="/student-login" className="flex items-center justify-center gap-2 w-full py-2.5 text-[11px] font-bold text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all shadow-md">
            <KeyRound size={16} />
            Student Login — Use Special Code
          </Link>
        </div>
      </form>
    </GlassCard>
  );

  const mobileForm = (
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
        className="text-center mb-6"
      >
        <h1 className="text-7xl font-black mb-4 bg-gradient-to-b from-yellow-200 via-amber-400 to-amber-700 bg-clip-text text-transparent animate-float" style={{ textShadow: '0 1px 0 #a16207, 0 2px 0 #854d0e, 0 4px 8px rgba(0,0,0,0.3), 0 8px 24px rgba(218,165,32,0.25)' }}>
          Ok20
        </h1>
        <p className="text-blue-700 font-bold text-[10px] uppercase tracking-[0.4em] leading-relaxed">School Examination Management System</p>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, type: "spring", stiffness: 100 }}
      >
        {renderLoginForm('sm')}
      </motion.div>
    </motion.div>
  );

  const desktopForm = (
    <div className="flex items-center gap-16 lg:gap-24 max-w-6xl w-full">
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ type: "spring", stiffness: 80, damping: 20 }}
        className="hidden lg:flex flex-col flex-1"
      >
        <h1 className="text-8xl font-black mb-4 bg-gradient-to-b from-yellow-200 via-amber-400 to-amber-700 bg-clip-text text-transparent leading-none animate-float" style={{ textShadow: '0 1px 0 #a16207, 0 2px 0 #854d0e, 0 4px 8px rgba(0,0,0,0.3), 0 8px 24px rgba(218,165,32,0.25)' }}>
          Ok20
        </h1>
        <p className="text-blue-700 font-bold text-sm uppercase tracking-[0.3em] mt-4">School Examination<br />Management System</p>
        <p className="text-slate-600 text-sm mt-8 leading-relaxed max-w-md">
          Comprehensive platform for managing student scores, generating reports, and tracking academic performance across classes and subjects.
        </p>
      </motion.div>
      <div className="w-full max-w-md shrink-0">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, type: "spring", stiffness: 100 }}
        >
          {renderLoginForm('md')}
        </motion.div>
      </div>
    </div>
  );

  return (
    <>
      <div className="mobile-container md:hidden flex items-center justify-center p-6 min-h-screen relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,_#e0c3fc_0%,_#8ec5fc_100%)]"></div>
        <div className="absolute top-[-5%] left-[-5%] w-[400px] h-[400px] bg-white/40 rounded-full blur-[100px] animate-pulse pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-300/30 rounded-full blur-[120px] animate-pulse pointer-events-none" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-purple-200/20 rounded-full blur-[80px] pointer-events-none"></div>
        {mobileForm}
      </div>
      <div className="hidden md:flex min-h-screen w-full relative overflow-hidden bg-[radial-gradient(circle_at_0%_0%,_#e0c3fc_0%,_#8ec5fc_100%)]">
        <div className="absolute top-[-5%] left-[-5%] w-[600px] h-[600px] bg-white/40 rounded-full blur-[150px] animate-pulse pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[800px] h-[800px] bg-blue-300/30 rounded-full blur-[180px] animate-pulse pointer-events-none" style={{ animationDelay: '2s' }}></div>
        <div className="flex-1 flex items-center justify-center p-12">
          {desktopForm}
        </div>
      </div>
    </>
  );
};
