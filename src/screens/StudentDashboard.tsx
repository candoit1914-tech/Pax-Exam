import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { GlassCard, GlassButton } from '../components/ui/Glass';
import { GraduationCap, LogOut, User, BookOpen, Award, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { studentAuthService } from '../services/studentAuthService';

export const StudentDashboardScreen = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [scores, setScores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTerms, setExpandedTerms] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user || user.role !== 'student') {
      navigate('/student-login', { replace: true });
      return;
    }
    loadData();
  }, [user, navigate]);

  const loadData = async () => {
    try {
      const studentId = user?.student_id;
      if (!studentId) return;

      const [profileData, scoresData] = await Promise.all([
        studentAuthService.getStudentProfile(studentId),
        studentAuthService.getStudentScores(studentId)
      ]);

      setProfile(profileData);
      setScores(scoresData);
    } catch (err) {
      console.error('Failed to load student data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/student-login', { replace: true });
  };

  // Group scores by term and academic year
  const groupedScores = useMemo(() => {
    const groups: Record<string, any[]> = {};
    scores.forEach(score => {
      const key = `${score.academic_year} - ${score.term}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(score);
    });
    return groups;
  }, [scores]);

  // Calculate stats
  const stats = useMemo(() => {
    if (scores.length === 0) return { totalScore: 0, average: 0, highest: 0, subjectCount: 0 };
    const totals = scores.map(s => s.total || 0);
    return {
      totalScore: totals.reduce((a, b) => a + b, 0),
      average: (totals.reduce((a, b) => a + b, 0) / totals.length).toFixed(1),
      highest: Math.max(...totals),
      subjectCount: scores.length
    };
  }, [scores]);

  const toggleTerm = (key: string) => {
    const newExpanded = new Set(expandedTerms);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedTerms(newExpanded);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-blue-500/30 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="text-slate-500 text-sm font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50/80 to-white/40">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-white/30 shadow-sm p-4 px-6">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
              {user?.name?.charAt(0) || 'S'}
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">{user?.name || 'Student'}</h1>
              <p className="text-xs text-blue-600 font-bold uppercase tracking-wider">{user?.class_name || 'Student Portal'}</p>
            </div>
          </div>
          <GlassButton onClick={handleLogout} variant="secondary" sizing="sm">
            <LogOut size={16} /> Logout
          </GlassButton>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Welcome Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <GlassCard className="p-6 bg-gradient-to-r from-blue-500/10 to-purple-500/10">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white shadow-lg">
                <GraduationCap size={32} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Welcome, {user?.name}!</h2>
                <p className="text-sm text-slate-600 mt-1">
                  Class: {user?.class_name || 'N/A'} | Student ID: #{user?.student_id}
                </p>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <GlassCard className="p-4 text-center">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center mx-auto mb-2">
                <BookOpen size={20} className="text-blue-600" />
              </div>
              <p className="text-2xl font-black text-slate-900">{stats.subjectCount}</p>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Subjects</p>
            </GlassCard>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <GlassCard className="p-4 text-center">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center mx-auto mb-2">
                <TrendingUp size={20} className="text-green-600" />
              </div>
              <p className="text-2xl font-black text-slate-900">{stats.average}</p>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Average</p>
            </GlassCard>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <GlassCard className="p-4 text-center">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center mx-auto mb-2">
                <Award size={20} className="text-amber-600" />
              </div>
              <p className="text-2xl font-black text-slate-900">{stats.highest}</p>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Highest</p>
            </GlassCard>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <GlassCard className="p-4 text-center">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center mx-auto mb-2">
                <User size={20} className="text-purple-600" />
              </div>
              <p className="text-2xl font-black text-slate-900">{profile?.status === 'active' ? 'Active' : 'Completed'}</p>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</p>
            </GlassCard>
          </motion.div>
        </div>

        {/* Scores Section */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900">My Scores</h2>
          </div>

          {scores.length === 0 ? (
            <GlassCard className="p-8 text-center">
              <BookOpen size={48} className="text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 font-medium">No scores recorded yet</p>
              <p className="text-xs text-slate-400 mt-1">Your scores will appear here once your teachers enter them</p>
            </GlassCard>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedScores).map(([termKey, termScores]) => (
                <GlassCard key={termKey} className="overflow-hidden">
                  <button
                    onClick={() => toggleTerm(termKey)}
                    className="w-full flex items-center justify-between p-4 hover:bg-white/20 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                        <BookOpen size={18} className="text-blue-600" />
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-slate-900">{termKey}</p>
                        <p className="text-xs text-slate-500">{termScores.length} subjects</p>
                      </div>
                    </div>
                    {expandedTerms.has(termKey) ? (
                      <ChevronUp size={20} className="text-slate-400" />
                    ) : (
                      <ChevronDown size={20} className="text-slate-400" />
                    )}
                  </button>

                  {expandedTerms.has(termKey) && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border-t border-white/30"
                    >
                      <div className="p-4 space-y-2">
                        {termScores.map((score, idx) => (
                          <div key={idx} className="flex items-center justify-between py-2 border-b border-white/20 last:border-0">
                            <span className="text-sm font-medium text-slate-700">{score.subject_name}</span>
                            <div className="flex items-center gap-4 text-xs">
                              <span className="text-slate-500">CW: {score.class_score}</span>
                              <span className="text-slate-500">Exam: {score.exam_score}</span>
                              <span className="font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded">{score.total}</span>
                              {score.grade && (
                                <span className="bg-green-100 text-green-800 px-2 py-1 rounded font-bold">{score.grade}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </GlassCard>
              ))}
            </div>
          )}
        </motion.div>

        {/* Profile Info */}
        {profile && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <h2 className="text-lg font-bold text-slate-900 mb-4">My Profile</h2>
            <GlassCard className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Full Name</p>
                  <p className="text-sm font-medium text-slate-800 mt-1">{profile.name}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gender</p>
                  <p className="text-sm font-medium text-slate-800 mt-1">{profile.gender || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Class</p>
                  <p className="text-sm font-medium text-slate-800 mt-1">{profile.class_name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Date of Birth</p>
                  <p className="text-sm font-medium text-slate-800 mt-1">{profile.dob || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Admission Year</p>
                  <p className="text-sm font-medium text-slate-800 mt-1">{profile.admission_year || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status</p>
                  <p className="text-sm font-medium text-slate-800 mt-1 capitalize">{profile.status || 'Active'}</p>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </div>
    </div>
  );
};
