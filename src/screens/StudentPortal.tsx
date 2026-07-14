import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { GlassCard, GlassInput, GlassButton } from '../components/ui/Glass';
import { KeyRound, Download, ArrowLeft, User, Calendar, GraduationCap, Users, Hash } from 'lucide-react';
import { portalService } from '../services/portalService';
import html2pdf from 'html2pdf.js';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export const StudentPortalScreen = () => {
  const [code, setCode] = useState('');
  const [report, setReport] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) { setError('Enter your access code.'); return; }
    setLoading(true);
    setError('');
    setReport(null);
    try {
      const data = await portalService.getReportByCode(code.trim().toUpperCase());
      setReport(data);
    } catch {
      setError('Invalid or expired code. Contact the school for a new one.');
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = async () => {
    if (!reportRef.current) return;
    setIsGenerating(true);
    const studentName = (report?.student?.name || 'Student').replace(/\s+/g, '_');
    const filename = `${studentName}_Report_Card.pdf`;
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
        const writeResult = await Filesystem.writeFile({ path: filename, data: base64Data, directory: Directory.Documents });
        await Share.share({ title: filename, text: 'Report Card', url: writeResult.uri, dialogTitle: 'Save or Share PDF' });
      } else {
        await html2pdf().set(opt).from(reportRef.current).save();
      }
    } catch (err) { console.error('Portal PDF error:', err); alert('Could not generate PDF. Please try again.'); }
    finally { setIsGenerating(false); }
  };

  const totalScore = report?.scores?.reduce((acc: number, s: any) => acc + (Number(s.total) || 0), 0) || 0;
  const avgScore = report?.scores?.length > 0 ? (totalScore / report.scores.length).toFixed(1) : '0';

  const reportContent = report ? (
    <div className="space-y-4">
      <GlassCard className="p-4 space-y-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            {report.student?.photo ? (
              <img src={report.student.photo} alt={report.student.name} className="w-14 h-14 rounded-xl object-cover border-2 border-blue-300 shadow-sm" />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white shadow-sm">
                <User size={24} />
              </div>
            )}
            <div>
              <h2 className="font-bold text-slate-800 text-base">{report.student.name}</h2>
              <p className="text-xs text-slate-500">Class: {report.student.class}</p>
              {report.student.gender && <p className="text-[10px] text-slate-400 capitalize">{report.student.gender}</p>}
            </div>
          </div>
          <GlassButton sizing="sm" onClick={() => setReport(null)}><ArrowLeft size={14} /> Back</GlassButton>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[10px] bg-blue-50/60 border border-blue-100 rounded-lg p-2.5">
          {report.student.parent_name && (
            <div className="flex items-center gap-1.5"><Users size={12} className="text-blue-500" /><span className="text-slate-500">Parent:</span> <span className="font-semibold text-slate-700">{report.student.parent_name}</span></div>
          )}
          {report.student.dob && (
            <div className="flex items-center gap-1.5"><Calendar size={12} className="text-blue-500" /><span className="text-slate-500">DOB:</span> <span className="font-semibold text-slate-700">{new Date(report.student.dob).toLocaleDateString()}</span></div>
          )}
          {report.student.admission_year && (
            <div className="flex items-center gap-1.5"><Hash size={12} className="text-blue-500" /><span className="text-slate-500">Admitted:</span> <span className="font-semibold text-slate-700">{report.student.admission_year}</span></div>
          )}
          {report.student.school_name && (
            <div className="flex items-center gap-1.5"><GraduationCap size={12} className="text-blue-500" /><span className="text-slate-500">School:</span> <span className="font-semibold text-slate-700">{report.student.school_name}</span></div>
          )}
        </div>

        {report.scores.length > 0 && (
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-white/60 border border-white/80 rounded-lg p-2">
              <p className="text-[9px] text-slate-400 uppercase font-bold">Total Score</p>
              <p className="text-sm font-black text-blue-700">{totalScore}</p>
            </div>
            <div className="bg-white/60 border border-white/80 rounded-lg p-2">
              <p className="text-[9px] text-slate-400 uppercase font-bold">Average</p>
              <p className="text-sm font-black text-indigo-700">{avgScore}%</p>
            </div>
            <div className="bg-white/60 border border-white/80 rounded-lg p-2">
              <p className="text-[9px] text-slate-400 uppercase font-bold">Subjects</p>
              <p className="text-sm font-black text-slate-700">{report.scores.length}</p>
            </div>
          </div>
        )}

        <div className="border-t border-white/40 pt-3 space-y-1">
          {report.scores.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-4">No scores found.</p>
          ) : (
            report.scores.map((s: any, i: number) => (
              <div key={i} className="flex justify-between items-center py-1.5 border-b border-white/20 last:border-0">
                <span className="text-sm font-medium text-slate-700">{s.subject}</span>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-slate-500">CW: {s.class_score}</span>
                  <span className="text-slate-500">Exam: {s.exam_score}</span>
                  <span className="font-bold text-blue-700">{s.total}</span>
                  {s.grade && <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded text-[10px] font-bold">{s.grade}</span>}
                </div>
              </div>
            ))
          )}
        </div>
      </GlassCard>
      <div className="flex gap-2">
        <GlassButton onClick={() => generatePDF()} disabled={isGenerating} sizing="sm" className="flex-1">
          <Download size={16} /> {isGenerating ? 'Generating...' : 'Download Report Card'}
        </GlassButton>
      </div>
    </div>
  ) : null;

  const searchForm = (
    <GlassCard className="p-6 space-y-4">
      <p className="text-xs text-slate-600 text-center">Enter the access code given by your school to view your report.</p>
      <form onSubmit={handleLookup} className="space-y-3">
        <GlassInput label="Access Code" value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="e.g. ABC123" sizing="sm" required />
        {error && <p className="text-red-600 text-xs bg-red-50 p-2 rounded-lg text-center">{error}</p>}
        <GlassButton type="submit" disabled={loading} className="w-full">
          <KeyRound size={16} /> {loading ? 'Checking...' : 'View Report'}
        </GlassButton>
      </form>
    </GlassCard>
  );

  return (
    <>
      <div className="absolute left-[-9999px] top-0">
        {report && (
          <div ref={reportRef} className="bg-white p-4 text-gray-800" style={{ width: '210mm' }}>
            <div className="text-center mb-3 border-b-2 border-slate-800 pb-3">
              <h1 className="text-lg font-black uppercase tracking-wider">{report.student?.school_name || 'School Report'}</h1>
              {report.student?.school_address && <p className="text-[10px] text-slate-500">{report.student.school_address}{report.student.school_location ? `, ${report.student.school_location}` : ''}</p>}
              <p className="text-xs text-slate-500 font-semibold mt-1">Academic Report Card</p>
            </div>

            <div className="flex items-center gap-4 mb-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
              {report.student?.photo ? (
                <img src={report.student.photo} alt="" className="w-16 h-16 rounded-lg object-cover border-2 border-slate-300" />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white border-2 border-slate-300">
                  <User size={28} />
                </div>
              )}
              <div className="flex-1">
                <p className="font-bold text-slate-900 text-base">{report.student.name}</p>
                <p className="text-xs text-slate-600">Class: {report.student.class}</p>
                {report.student.gender && <p className="text-[10px] text-slate-500 capitalize">Gender: {report.student.gender}</p>}
              </div>
              <div className="text-right text-[10px] text-slate-500 space-y-0.5">
                {report.student.dob && <p>DOB: {new Date(report.student.dob).toLocaleDateString()}</p>}
                {report.student.admission_year && <p>Admitted: {report.student.admission_year}</p>}
                {report.student.parent_name && <p>Parent: {report.student.parent_name}</p>}
              </div>
            </div>

            {report.scores.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-3 text-center text-[10px]">
                <div className="bg-blue-50 border border-blue-200 rounded p-1.5">
                  <p className="text-slate-400 font-bold uppercase">Total Score</p>
                  <p className="text-sm font-black text-blue-700">{totalScore}</p>
                </div>
                <div className="bg-indigo-50 border border-indigo-200 rounded p-1.5">
                  <p className="text-slate-400 font-bold uppercase">Average</p>
                  <p className="text-sm font-black text-indigo-700">{avgScore}%</p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded p-1.5">
                  <p className="text-slate-400 font-bold uppercase">Subjects</p>
                  <p className="text-sm font-black text-slate-700">{report.scores.length}</p>
                </div>
              </div>
            )}

            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b-2 border-slate-800 bg-slate-100">
                  <th className="py-2 px-2 font-bold">Subject</th>
                  <th className="py-2 px-2 font-bold text-center">CW</th>
                  <th className="py-2 px-2 font-bold text-center">Exam</th>
                  <th className="py-2 px-2 font-bold text-center">Total</th>
                  <th className="py-2 px-2 font-bold text-center">Grade</th>
                </tr>
              </thead>
              <tbody>
                {report.scores.map((s: any, i: number) => (
                  <tr key={i} className="border-b border-slate-200">
                    <td className="py-1.5 px-2 font-medium">{s.subject}</td>
                    <td className="py-1.5 px-2 text-center">{s.class_score}</td>
                    <td className="py-1.5 px-2 text-center">{s.exam_score}</td>
                    <td className="py-1.5 px-2 text-center font-bold">{s.total}</td>
                    <td className="py-1.5 px-2 text-center">{s.grade || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-4 pt-2 border-t border-slate-200 text-[9px] text-slate-400 text-center">
              Contact the school for more information{report.student?.school_phone ? ` via ${report.student.school_phone}` : ''}{report.student?.school_email ? ` or ${report.student.school_email}` : ''}
            </div>
          </div>
        )}
      </div>

      <div className="mobile-container md:hidden min-h-screen flex items-start justify-center p-6 pt-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,_#e0c3fc_0%,_#8ec5fc_100%)]"></div>
        <div className="w-full max-w-sm relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
            <h1 className="text-4xl font-black text-slate-900">Student Portal</h1>
            <p className="text-blue-700 font-bold text-[10px] uppercase tracking-[0.3em] mt-2">View Your Exam Report</p>
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
      <div className="hidden md:flex min-h-screen w-full relative overflow-hidden bg-[radial-gradient(circle_at_0%_0%,_#e0c3fc_0%,_#8ec5fc_100%)]">
        <div className="flex-1 flex items-start justify-center p-12 pt-24">
          <div className="w-full max-w-lg relative z-10">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
              <h1 className="text-5xl font-black text-slate-900">Student Portal</h1>
              <p className="text-blue-700 font-bold text-xs uppercase tracking-[0.3em] mt-3">View Your Exam Report</p>
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
