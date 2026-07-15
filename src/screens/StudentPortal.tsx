import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { GlassCard, GlassInput, GlassButton } from '../components/ui/Glass';
import { KeyRound, Download, ArrowLeft, User, Calendar, GraduationCap, Users, Hash, Filter, BookOpen, TrendingUp, Award, ChevronDown, ChevronUp, Shield } from 'lucide-react';
import { portalService } from '../services/portalService';
import { ReportCard } from '../components/ReportCard';
import { getGradePoint } from '../utils/grading';
import html2pdf from 'html2pdf.js';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';

export const StudentPortalScreen = () => {
  const [code, setCode] = useState('');
  const [report, setReport] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedTerm, setSelectedTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [expandedTerms, setExpandedTerms] = useState<Set<string>>(new Set());
  const reportRef = useRef<HTMLDivElement>(null);

  const fetchReport = async (term?: string, academicYear?: string) => {
    if (!code.trim()) return;
    try {
      const data = await portalService.getReportByCode(code.trim().toUpperCase(), term, academicYear);
      setReport(data);
      if (data.availableTerms?.length > 0 && !term && !academicYear) {
        const latest = data.availableTerms[0];
        setSelectedTerm(latest.term);
        setSelectedYear(latest.academic_year);
      }
    } catch {
      setError('Invalid or expired code. Contact the school for a new one.');
    }
  };

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) { setError('Enter your access code.'); return; }
    setLoading(true);
    setError('');
    setReport(null);
    try {
      await fetchReport();
    } finally {
      setLoading(false);
    }
  };

  const handleTermChange = async (term: string, year: string) => {
    setSelectedTerm(term);
    setSelectedYear(year);
    if (code.trim()) {
      await fetchReport(term, year);
    }
  };

  const toggleTerm = (key: string) => {
    const newExpanded = new Set(expandedTerms);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedTerms(newExpanded);
  };

  const generatePDF = async () => {
    if (!reportRef.current) return;
    setIsGenerating(true);
    const studentName = (report?.student?.name || 'Student').replace(/\s+/g, '_');
    const termSuffix = selectedTerm ? `_${selectedTerm.replace(/\s+/g, '')}_${selectedYear.replace('/', '-')}` : '';
    const filename = `${studentName}_Report_Card${termSuffix}.pdf`;
    const opt: any = {
      margin: 10, filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false, allowTaint: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    try {
      await new Promise(r => setTimeout(r, 300));
      if (Capacitor.isNativePlatform()) {
        const pdfBase64 = await html2pdf().set(opt).from(reportRef.current).outputPdf('datauristring');
        const base64Data = pdfBase64.split(',')[1];
        await Filesystem.writeFile({ path: filename, data: base64Data, directory: Directory.Documents });
        alert(`Report card saved to Documents: ${filename}`);
      } else {
        await html2pdf().set(opt).from(reportRef.current).save();
      }
    } catch (err) { console.error('Portal PDF error:', err); alert('Could not generate PDF. Please try again.'); }
    finally { setIsGenerating(false); }
  };

  const groupedScores = report?.scores?.length > 0
    ? report.scores.reduce((acc: any[], s: any) => {
        const key = `${s.academic_year || 'Unknown'} - ${s.term || 'Unknown'}`;
        const existing = acc.find((g: any) => g.key === key);
        if (existing) { existing.scores.push(s); } else { acc.push({ key, term: s.term, academicYear: s.academic_year, scores: [s] }); }
        return acc;
      }, [])
    : [];

  const totalScore = report?.scores?.reduce((acc: number, s: any) => acc + (Number(s.total) || 0), 0) || 0;
  const avgScore = report?.scores?.length > 0 ? (totalScore / report.scores.length).toFixed(1) : '0';
  const highestScore = report?.scores?.length > 0 ? Math.max(...report.scores.map((s: any) => Number(s.total) || 0)) : 0;

  const searchForm = (
    <GlassCard className="p-6 space-y-4">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center mx-auto mb-3 shadow-lg">
          <KeyRound size={28} className="text-white" />
        </div>
        <p className="text-xs text-slate-600">Enter the access code given by your school to view your report card.</p>
      </div>
      <form onSubmit={handleLookup} className="space-y-3">
        <GlassInput label="Access Code" value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="e.g. ABC123" sizing="sm" required />
        {error && <p className="text-red-600 text-xs bg-red-50 p-2 rounded-lg text-center">{error}</p>}
        <GlassButton type="submit" disabled={loading} className="w-full">
          <KeyRound size={16} /> {loading ? 'Checking...' : 'View Report Card'}
        </GlassButton>
      </form>
    </GlassCard>
  );

  const reportContent = report ? (
    <div className="space-y-4">
      {/* Back Button */}
      <GlassButton onClick={() => setReport(null)} variant="secondary" sizing="sm" className="w-full">
        <ArrowLeft size={14} /> Back to Search
      </GlassButton>

      {/* Student Profile Card */}
      <GlassCard className="p-5">
        <div className="flex items-center gap-4 mb-4 pb-4 border-b border-white/30">
          {report.student?.photo ? (
            <img src={report.student.photo} alt={report.student.name} className="w-20 h-20 rounded-2xl object-cover border-2 border-blue-300 shadow-md" />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white shadow-md">
              <User size={32} />
            </div>
          )}
          <div className="flex-1">
            <h2 className="font-bold text-slate-800 text-lg">{report.student.name}</h2>
            <p className="text-sm text-blue-600 font-semibold">{report.student.class}</p>
            {report.student.gender && <p className="text-xs text-slate-500 capitalize">{report.student.gender}</p>}
          </div>
        </div>

        {/* Student Info Grid */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          {report.student.parent_name && (
            <InfoBox icon={<Users size={14} className="text-blue-500" />} label="Parent" value={report.student.parent_name} />
          )}
          {report.student.dob && (
            <InfoBox icon={<Calendar size={14} className="text-blue-500" />} label="Date of Birth" value={new Date(report.student.dob).toLocaleDateString()} />
          )}
          {report.student.admission_year && (
            <InfoBox icon={<Hash size={14} className="text-blue-500" />} label="Admission Year" value={report.student.admission_year} />
          )}
          {report.student.school_name && (
            <InfoBox icon={<GraduationCap size={14} className="text-blue-500" />} label="School" value={report.student.school_name} />
          )}
        </div>
      </GlassCard>

      {/* Term/Year Filter */}
      {report.availableTerms && report.availableTerms.length > 0 && (
        <GlassCard className="p-3">
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-blue-600 shrink-0" />
            <select
              value={`${selectedTerm}|||${selectedYear}`}
              onChange={(e) => {
                const [t, y] = e.target.value.split('|||');
                handleTermChange(t, y);
              }}
              className="flex-1 bg-white/40 border border-white/50 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              {report.availableTerms.map((t: any, i: number) => (
                <option key={i} value={`${t.term}|||${t.academic_year}`}>
                  {t.term} - {t.academic_year}
                </option>
              ))}
            </select>
          </div>
        </GlassCard>
      )}

      {/* Academic Summary */}
      {report.scores.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <GlassCard className="p-3 text-center">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center mx-auto mb-1.5">
              <TrendingUp size={16} className="text-blue-600" />
            </div>
            <p className="text-lg font-black text-blue-700">{totalScore}</p>
            <p className="text-[9px] text-slate-500 uppercase font-bold">Total Score</p>
          </GlassCard>
          <GlassCard className="p-3 text-center">
            <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center mx-auto mb-1.5">
              <Award size={16} className="text-green-600" />
            </div>
            <p className="text-lg font-black text-green-700">{avgScore}%</p>
            <p className="text-[9px] text-slate-500 uppercase font-bold">Average</p>
          </GlassCard>
          <GlassCard className="p-3 text-center">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center mx-auto mb-1.5">
              <BookOpen size={16} className="text-amber-600" />
            </div>
            <p className="text-lg font-black text-amber-700">{highestScore}</p>
            <p className="text-[9px] text-slate-500 uppercase font-bold">Highest</p>
          </GlassCard>
        </div>
      )}

      {/* Academic Results */}
      <GlassCard className="p-4">
        <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
          <BookOpen size={16} className="text-blue-600" /> Academic Results
        </h3>
        {report.scores.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-4">No scores found for this term.</p>
        ) : (
          <div className="space-y-3">
            {groupedScores.map((group: any, gi: number) => (
              <div key={gi}>
                {groupedScores.length > 1 && group.key && (
                  <button
                    onClick={() => toggleTerm(group.key)}
                    className="w-full flex items-center justify-between py-2 px-3 bg-blue-50/60 border border-blue-100 rounded-lg mb-2"
                  >
                    <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">{group.key}</span>
                    {expandedTerms.has(group.key) ? (
                      <ChevronUp size={14} className="text-blue-500" />
                    ) : (
                      <ChevronDown size={14} className="text-blue-500" />
                    )}
                  </button>
                )}
                {(groupedScores.length === 1 || expandedTerms.has(group.key)) && (
                  <div className="space-y-1">
                    {group.scores.map((s: any, i: number) => (
                      <div key={i} className="flex justify-between items-center py-2 border-b border-white/20 last:border-0 px-1">
                        <span className="text-sm font-medium text-slate-700">{s.subject}</span>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-slate-500">CW: {s.class_score}</span>
                          <span className="text-slate-500">Exam: {s.exam_score}</span>
                          <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">{s.total}</span>
                          {s.grade && <span className="bg-green-100 text-green-800 px-1.5 py-0.5 rounded text-[10px] font-bold">{s.grade}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Download Report Card */}
      <GlassButton onClick={() => generatePDF()} disabled={isGenerating} sizing="md" className="w-full">
        <Download size={18} /> {isGenerating ? 'Generating Report Card...' : 'Download Report Card'}
      </GlassButton>
    </div>
  ) : null;

  return (
    <>
      {/* Hidden PDF render area */}
      <div className="absolute left-[-9999px] top-0">
        {report && (
          <div ref={reportRef}>
            <ReportCard
              student={{
                name: report.student.name,
                gender: report.student.gender,
                photo: report.student.photo,
                dob: report.student.dob,
                admission_year: report.student.admission_year,
                class_id: null
              }}
              studentScores={report.scores.map((s: any) => ({
                ...s,
                subjectName: s.subject
              }))}
              myRanking={report.scores.length > 0 ? { average: Number(avgScore), position: null } : null}
              totalInClass={null}
              myClass={{ name: report.student.class }}
              schoolProfile={{
                name: report.student.school_name,
                address: report.student.school_address,
                location: report.student.school_location,
                logo: report.student.school_logo,
                phone: report.student.school_phone,
                email: report.student.school_email
              }}
              getSubjectName={(id: number) => report.scores.find((s: any) => s.subject_id === id)?.subject || 'Unknown'}
              term={selectedTerm || 'Current Term'}
              academicYear={selectedYear || 'Current Year'}
            />
          </div>
        )}
      </div>

      {/* Mobile Layout */}
      <div className="mobile-container md:hidden min-h-screen flex items-start justify-center p-6 pt-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,_#e0c3fc_0%,_#8ec5fc_100%)]"></div>
        <div className="w-full max-w-sm relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
            <h1 className="text-4xl font-black text-slate-900">Student Portal</h1>
            <p className="text-blue-700 font-bold text-[10px] uppercase tracking-[0.3em] mt-2">View Your Report Card</p>
          </motion.div>
          {!report ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              {searchForm}
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              {reportContent}
            </motion.div>
          )}
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:flex min-h-screen w-full relative overflow-hidden bg-[radial-gradient(circle_at_0%_0%,_#e0c3fc_0%,_#8ec5fc_100%)]">
        <div className="flex-1 flex items-start justify-center p-12 pt-24">
          <div className="w-full max-w-lg relative z-10">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
              <h1 className="text-5xl font-black text-slate-900">Student Portal</h1>
              <p className="text-blue-700 font-bold text-xs uppercase tracking-[0.3em] mt-3">View Your Report Card</p>
            </motion.div>
            {!report ? (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                {searchForm}
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                {reportContent}
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

const InfoBox = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="flex items-center gap-2 bg-blue-50/60 border border-blue-100 rounded-lg p-2.5">
    {icon}
    <div>
      <p className="text-[10px] text-slate-400 uppercase font-bold">{label}</p>
      <p className="font-semibold text-slate-700">{value}</p>
    </div>
  </div>
);
