import React, { useState } from 'react';
import { motion } from 'motion/react';
import { GlassCard, GlassInput, GlassButton } from '../components/ui/Glass';
import { KeyRound, FileText, Download, ArrowLeft } from 'lucide-react';
import { portalService } from '../services/portalService';

export const StudentPortalScreen = () => {
  const [code, setCode] = useState('');
  const [report, setReport] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

  const handleDownload = () => {
    if (!report) return;
    const content = `
STUDENT REPORT
==============
Name: ${report.student.name}
Class: ${report.student.class}

SUBJECT  | CLASS SCORE | EXAM SCORE | TOTAL | GRADE
${report.scores.map((s: any) => `${s.subject.padEnd(12)}| ${String(s.class_score).padStart(10)} | ${String(s.exam_score).padStart(10)} | ${String(s.total).padStart(5)} | ${s.grade || '-'}`).join('\n')}
    `.trim();
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${report.student.name.replace(/\s+/g, '-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mobile-container min-h-screen flex items-start justify-center p-6 pt-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,_#e0c3fc_0%,_#8ec5fc_100%)]"></div>
      <div className="w-full max-w-sm relative z-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <h1 className="text-4xl font-black text-slate-900">Student Portal</h1>
          <p className="text-blue-700 font-bold text-[10px] uppercase tracking-[0.3em] mt-2">View Your Exam Report</p>
        </motion.div>

        {!report ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
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
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <GlassCard className="p-4 space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="font-bold text-slate-800">{report.student.name}</h2>
                  <p className="text-xs text-slate-500">Class: {report.student.class}</p>
                </div>
                <GlassButton sizing="sm" onClick={() => setReport(null)}><ArrowLeft size={14} /> Back</GlassButton>
              </div>
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
            <GlassButton onClick={handleDownload} className="w-full">
              <Download size={16} /> Download Report
            </GlassButton>
          </motion.div>
        )}
      </div>
    </div>
  );
};
