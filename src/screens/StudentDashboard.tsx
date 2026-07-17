import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { GlassCard, GlassButton } from '../components/ui/Glass';
import { GraduationCap, LogOut, User, BookOpen, Award, TrendingUp, Download, Calendar, Phone, Hash, Shield, UserCircle } from 'lucide-react';
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50/80 to-white/40" style={{ WebkitOverflowScrolling: 'touch' as any }}>
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

      <div className="max-w-4xl mx-auto p-6 pt-4 space-y-6 pb-24">

        {/* Profile Card - Compact */}
        {profile && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <GlassCard className="p-5">
              <div className="flex items-center gap-4">
                {profile.photo ? (
                  <img src={profile.photo} alt={profile.name} className="w-16 h-16 rounded-2xl object-cover border-2 border-blue-200 shadow-sm" />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white shadow-sm">
                    <User size={28} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-900 text-lg truncate">{profile.name}</h3>
                  <p className="text-sm text-blue-600 font-bold">{profile.class_name || 'N/A'}</p>
                  <p className="text-xs text-slate-500 capitalize">{profile.gender || 'N/A'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-200/50">
                <InfoItem icon={<Calendar size={14} className="text-amber-500" />} label="DOB" value={profile.dob || 'N/A'} />
                <InfoItem icon={<Hash size={14} className="text-indigo-500" />} label="Admission" value={profile.admission_year || 'N/A'} />
                <InfoItem icon={<Shield size={14} className="text-emerald-500" />} label="Status" value={profile.status || 'Active'} capitalize />
                {profile.parent_name && (
                  <InfoItem icon={<UserCircle size={14} className="text-pink-500" />} label="Parent" value={profile.parent_name} />
                )}
                {profile.parent_phone && (
                  <InfoItem icon={<Phone size={14} className="text-teal-500" />} label="Phone" value={profile.parent_phone} />
                )}
                <InfoItem icon={<Hash size={14} className="text-slate-500" />} label="ID" value={`#${profile.id}`} />
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* Stats Cards */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard icon={<BookOpen size={16} className="text-blue-600" />} bg="bg-blue-100" value={stats.subjectCount} label="Subjects" />
            <StatCard icon={<TrendingUp size={16} className="text-green-600" />} bg="bg-green-100" value={stats.average} label="Average" />
            <StatCard icon={<Award size={16} className="text-amber-600" />} bg="bg-amber-100" value={stats.highest} label="Highest" />
            <StatCard icon={<User size={16} className="text-purple-600" />} bg="bg-purple-100" value={profile?.status === 'active' ? 'Active' : 'Completed'} label="Status" />
          </div>
        </motion.div>

        {/* Download Button */}
        {scores.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <GlassButton onClick={generatePDF} disabled={isDownloading} className="w-full" sizing="md">
              <Download size={18} /> {isDownloading ? 'Generating Report Card...' : 'Download Report Card'}
            </GlassButton>
          </motion.div>
        )}

      </div>
    </div>
  );
};

const InfoItem = ({ icon, label, value, capitalize }: { icon: React.ReactNode; label: string; value: string; capitalize?: boolean }) => (
  <div className="bg-white/40 border border-white/50 rounded-xl p-2.5">
    <div className="flex items-center gap-1.5 mb-1">
      {icon}
      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{label}</p>
    </div>
    <p className={`text-xs font-semibold text-slate-800 truncate ${capitalize ? 'capitalize' : ''}`}>{value}</p>
  </div>
);

const StatCard = ({ icon, bg, value, label }: { icon: React.ReactNode; bg: string; value: any; label: string }) => (
  <GlassCard className="p-2 text-center">
    <div className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center mx-auto mb-1`}>
      {icon}
    </div>
    <p className="text-base font-black text-slate-900">{value}</p>
    <p className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">{label}</p>
  </GlassCard>
);
