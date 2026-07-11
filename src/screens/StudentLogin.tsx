import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { GlassCard, GlassInput, GlassButton } from '../components/ui/Glass';
import { KeyRound, LogIn, Loader2, ArrowLeft, GraduationCap } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const StudentLoginScreen = () => {
  const [loginCode, setLoginCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { loginStudent, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && user?.role === 'student') {
      navigate('/student-dashboard', { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginCode.trim()) {
      setError('Please enter your login code.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await loginStudent(loginCode.trim());
      navigate('/student-dashboard', { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid login code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

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
        <p className="text-blue-700 font-bold text-[10px] uppercase tracking-[0.4em] leading-relaxed">Student Portal Login</p>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, type: "spring", stiffness: 100 }}
      >
        <GlassCard droplet className="p-6 border-white/60 bg-white/20 backdrop-blur-3xl shadow-2xl relative overflow-hidden focus-within:animate-pulse-glow">
          <form onSubmit={handleLogin} className="flex flex-col items-center gap-4 relative z-10">
            <div className="flex flex-col items-center gap-2 w-full">
              <span className="text-slate-700 font-bold uppercase tracking-[0.2em] mb-2" style={{ fontSize: '10px' }}>Student Login</span>
              <div className="w-full flex flex-col gap-4">
                <GlassInput
                  label="Login Code"
                  value={loginCode}
                  onChange={e => setLoginCode(e.target.value.toUpperCase())}
                  placeholder="e.g. ABC12345"
                  sizing="sm"
                  required
                  autoFocus
                />
                <p className="text-[10px] text-slate-500 text-center -mt-2">
                  Enter the 8-character code given to you by your school admin
                </p>
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

            <Link to="/login" className="flex items-center justify-center gap-2 w-full py-2 text-[11px] font-bold text-slate-600 bg-slate-50/50 rounded-xl border border-slate-200/60 hover:bg-slate-100/50 transition-all">
              <ArrowLeft size={14} />
              Back to Admin Login
            </Link>
          </form>
        </GlassCard>
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
        <p className="text-blue-700 font-bold text-sm uppercase tracking-[0.3em] mt-4">Student Portal</p>
        <p className="text-slate-600 text-sm mt-8 leading-relaxed max-w-md">
          Access your exam results, report cards, and academic performance using the special login code provided by your school.
        </p>
        <div className="mt-8 flex items-center gap-3 bg-white/20 backdrop-blur-sm rounded-xl p-4 border border-white/30">
          <GraduationCap size={24} className="text-blue-600" />
          <div>
            <p className="text-sm font-bold text-slate-800">New Student?</p>
            <p className="text-xs text-slate-600">Ask your school admin for your login code</p>
          </div>
        </div>
      </motion.div>
      <div className="w-full max-w-md shrink-0">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, type: "spring", stiffness: 100 }}
        >
          <GlassCard droplet className="p-8 border-white/60 bg-white/20 backdrop-blur-3xl shadow-2xl relative overflow-hidden focus-within:animate-pulse-glow">
            <form onSubmit={handleLogin} className="flex flex-col items-center gap-4 relative z-10">
              <div className="flex flex-col items-center gap-2 w-full">
                <span className="text-slate-700 font-bold uppercase tracking-[0.2em] mb-2" style={{ fontSize: '12px' }}>Student Login</span>
                <div className="w-full flex flex-col gap-4">
                  <GlassInput
                    label="Login Code"
                    value={loginCode}
                    onChange={e => setLoginCode(e.target.value.toUpperCase())}
                    placeholder="e.g. ABC12345"
                    sizing="md"
                    required
                    autoFocus
                  />
                  <p className="text-xs text-slate-500 text-center -mt-2">
                    Enter the 8-character code given to you by your school admin
                  </p>
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

              <Link to="/login" className="flex items-center justify-center gap-2 w-full py-2 text-xs font-bold text-slate-600 bg-slate-50/50 rounded-xl border border-slate-200/60 hover:bg-slate-100/50 transition-all">
                <ArrowLeft size={14} />
                Back to Admin Login
              </Link>
            </form>
          </GlassCard>
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
