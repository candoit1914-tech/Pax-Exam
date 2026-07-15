import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { GlassCard, GlassButton } from '../components/ui/Glass';
import { GraduationCap, LogOut, User, BookOpen, Award, TrendingUp, ChevronDown, ChevronUp, Download, Calendar, Phone, Hash, Shield, UserCircle } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { useAuth } from '../contexts/AuthContext';
import { studentAuthService } from '../services/studentAuthService';
import { ReportCard } from '../components/ReportCard';


export const StudentDashboardScreen = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [scores, setScores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'info' | 'academic'>('academic');
  const [expandedTerms, setExpandedTerms] = useState<Set<string>>(new Set());

  const [schoolProfile, setSchoolProfile] = useState<any>({});
  const [isDownloading, setIsDownloading] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

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

      const p = localStorage.getItem('schoolProfile');
      if (p) { try { setSchoolProfile(JSON.parse(p)); } catch(e){} }

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

  const groupedScores = useMemo(() => {
    const groups: Record<string, any[]> = {};
    scores.forEach(score => {
      const key = `${score.academic_year} - ${score.term}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(score);
    });
    return groups;
  }, [scores]);

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

  const getSubjectName = (id: number) => scores.find((s: any) => s.subject_id === id)?.subject_name || 'Unknown';

  const generatePDF = async () => {
    if (!reportRef.current || !user?.student_id) return;
    setIsDownloading(true);
    const studentName = (user?.name || 'Student').replace(/\s+/g, '_');
    const filename = `${studentName}_Report_Card.pdf`;
    const opt: any = {
      margin: 10, filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    try {
      if (Capacitor.isNativePlatform()) {
        const pdfBase64 = await html2pdf().set(opt).from(reportRef.current).outputPdf('datauristring');
        const base64Data = pdfBase64.split(',')[1];
        const writeResult = await Filesystem.writeFile({ path: filename, data: base64Data, directory: Directory.Documents });
        await Share.share({ title: filename, text: 'Report Card', url: writeResult.uri, dialogTitle: 'Save or Share PDF' });
      } else {
        await html2pdf().set(opt).from(reportRef.current).save();
      }
    } catch (err) { console.error(err); }
    finally { setIsDownloading(false); }
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
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-white/30 shadow-sm p-4 px-6">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            {profile?.photo ? (
              <img src={profile.photo} alt={user?.name} className="w-10 h-10 rounded-full object-cover border-2 border-blue-400 shadow-sm" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                {user?.name?.charAt(0) || 'S'}
              </div>
            )}
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

      {/* Hidden ReportCard for PDF generation */}
      <div className="absolute left-[-9999px] top-0">
        {profile && (
          <div ref={reportRef}>
            <ReportCard
              student={{ ...profile, class_id: profile.class_id }}
              studentScores={scores.map((s: any) => ({ ...s, subjectName: s.subject_name || getSubjectName(s.subject_id) }))}
              myRanking={scores.length > 0 ? { average: Number(stats.average), position: null } : null}
              totalInClass={null}
              myClass={{ name: profile.class_name }}
              schoolProfile={schoolProfile}
              getSubjectName={getSubjectName}
              term={scores.length > 0 ? scores[0]?.term || 'Current Term' : 'Current Term'}
              academicYear={scores.length > 0 ? scores[0]?.academic_year || 'Current Year' : 'Current Year'}
            />
          </div>
        )}
      </div>

      <div className="max-w-4xl mx-auto p-6 pt-4 space-y-6">

        {/* Tabs */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="flex gap-2 bg-white/40 backdrop-blur-md border border-white/40 rounded-2xl p-1.5">
            <button
              onClick={() => setActiveTab('info')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
                activeTab === 'info'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-slate-600 hover:bg-white/40'
              }`}
            >
              <UserCircle size={18} /> My Information
            </button>
            <button
              onClick={() => setActiveTab('academic')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
                activeTab === 'academic'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-slate-600 hover:bg-white/40'
              }`}
            >
              <BookOpen size={18} /> Academic Results
            </button>
          </div>
        </motion.div>

        {/* Tab Content */}
        {activeTab === 'info' && profile && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <GlassCard className="p-6">
              <div className="flex items-start gap-4 mb-6 pb-4 border-b border-slate-200/50">
                {profile.photo ? (
                  <img src={profile.photo} alt={profile.name} className="w-24 h-24 rounded-2xl object-cover border-2 border-blue-200 shadow-sm" />
                ) : (
                  <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white shadow-sm">
                    <User size={40} />
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-slate-900 text-xl">{profile.name}</h3>
                  <p className="text-sm text-blue-600 font-bold mt-1">{profile.class_name || 'N/A'}</p>
                  <p className="text-xs text-slate-500 capitalize mt-0.5">{profile.gender || 'N/A'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <InfoItem icon={<User size={16} className="text-blue-500" />} label="Full Name" value={profile.name} />
                <InfoItem icon={<User size={16} className="text-purple-500" />} label="Gender" value={profile.gender || 'N/A'} capitalize />
                <InfoItem icon={<GraduationCap size={16} className="text-green-500" />} label="Class" value={profile.class_name || 'N/A'} />
                <InfoItem icon={<Calendar size={16} className="text-amber-500" />} label="Date of Birth" value={profile.dob || 'N/A'} />
                <InfoItem icon={<Hash size={16} className="text-indigo-500" />} label="Admission Year" value={profile.admission_year || 'N/A'} />
                <InfoItem icon={<Shield size={16} className="text-emerald-500" />} label="Status" value={profile.status || 'Active'} capitalize />
                {profile.parent_name && (
                  <InfoItem icon={<UserCircle size={16} className="text-pink-500" />} label="Parent/Guardian" value={profile.parent_name} />
                )}
                {profile.parent_phone && (
                  <InfoItem icon={<Phone size={16} className="text-teal-500" />} label="Parent Phone" value={profile.parent_phone} />
                )}
                <InfoItem icon={<Hash size={16} className="text-slate-500" />} label="Student ID" value={`#${profile.id}`} />
              </div>
            </GlassCard>
          </motion.div>
        )}

        {activeTab === 'academic' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="space-y-4">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon={<BookOpen size={20} className="text-blue-600" />} bg="bg-blue-100" value={stats.subjectCount} label="Subjects" delay={0.1} />
              <StatCard icon={<TrendingUp size={20} className="text-green-600" />} bg="bg-green-100" value={stats.average} label="Average" delay={0.15} />
              <StatCard icon={<Award size={20} className="text-amber-600" />} bg="bg-amber-100" value={stats.highest} label="Highest" delay={0.2} />
              <StatCard icon={<User size={20} className="text-purple-600" />} bg="bg-purple-100" value={profile?.status === 'active' ? 'Active' : 'Completed'} label="Status" delay={0.25} />
            </div>

            {/* Download Button */}
            {scores.length > 0 && (
              <GlassButton onClick={generatePDF} disabled={isDownloading} className="w-full" sizing="md">
                <Download size={18} /> {isDownloading ? 'Generating Report Card...' : 'Download Report Card'}
              </GlassButton>
            )}

            {/* Scores */}
            <div className="flex items-center justify-between">
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
        )}
      </div>
    </div>
  );
};

const InfoItem = ({ icon, label, value, capitalize }: { icon: React.ReactNode; label: string; value: string; capitalize?: boolean }) => (
  <div className="bg-white/40 border border-white/50 rounded-xl p-3">
    <div className="flex items-center gap-2 mb-1.5">
      {icon}
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</p>
    </div>
    <p className={`text-sm font-semibold text-slate-800 ${capitalize ? 'capitalize' : ''}`}>{value}</p>
  </div>
);

const StatCard = ({ icon, bg, value, label, delay }: { icon: React.ReactNode; bg: string; value: any; label: string; delay: number }) => (
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
    <GlassCard className="p-4 text-center">
      <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mx-auto mb-2`}>
        {icon}
      </div>
      <p className="text-2xl font-black text-slate-900">{value}</p>
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</p>
    </GlassCard>
  </motion.div>
);
