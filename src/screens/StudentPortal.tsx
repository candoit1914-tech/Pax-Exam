import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { GlassCard, GlassInput, GlassButton } from '../components/ui/Glass';
import { KeyRound, Download, ArrowLeft, Printer, User } from 'lucide-react';
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

  const generatePDF = async (printOnly: boolean = false) => {
    if (!reportRef.current) return;
    setIsGenerating(true);
    const studentName = (report?.student?.name || 'Student').replace(/\s+/g, '_');
    const filename = `${studentName}_Report_Card.pdf`;
    const opt: any = {
      margin: 10, filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    try {
      if (printOnly) {
        const pdfBlob = await html2pdf().set(opt).from(reportRef.current).output('blob');
        const url = URL.createObjectURL(pdfBlob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      } else if (Capacitor.isNativePlatform()) {
        const pdfBase64 = await html2pdf().set(opt).from(reportRef.current).outputPdf('datauristring');
        const base64Data = pdfBase64.split(',')[1];
        const writeResult = await Filesystem.writeFile({ path: filename, data: base64Data, directory: Directory.Documents });
        await Share.share({ title: filename, text: 'Report Card', url: writeResult.uri, dialogTitle: 'Save or Share PDF' });
      } else {
        await html2pdf().set(opt).from(reportRef.current).save();
      }
    } catch (err) { console.error(err); }
    finally { setIsGenerating(false); }
  };

  const reportContent = report ? (
    <div className="space-y-4">
      <GlassCard className="p-4 space-y-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            {report.student?.photo ? (
              <img src={report.student.photo} alt={report.student.name} className="w-12 h-12 rounded-xl object-cover border-2 border-blue-300 shadow-sm" />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white shadow-sm">
                <User size={20} />
              </div>
            )}
            <div>
              <h2 className="font-bold text-slate-800">{report.student.name}</h2>
              <p className="text-xs text-slate-500">Class: {report.student.class}</p>
              {report.student.gender && <p className="text-[10px] text-slate-400 capitalize">{report.student.gender}</p>}
            </div>
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
      <div className="flex gap-2">
        <GlassButton onClick={() => generatePDF(true)} disabled={isGenerating} sizing="sm" variant="secondary" className="flex-1">
          <Printer size={16} /> {isGenerating ? 'Generating...' : 'Print'}
        </GlassButton>
        <GlassButton onClick={() => generatePDF(false)} disabled={isGenerating} sizing="sm" className="flex-1">
          <Download size={16} /> {isGenerating ? 'Generating...' : 'Download PDF'}
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
          <div ref={reportRef} className="bg-white p-4">
            <div className="text-center mb-4 border-b-2 border-slate-800 pb-3">
              <h1 className="text-lg font-black uppercase tracking-wider">{report.student?.school_name || 'School Report'}</h1>
              <p className="text-xs text-slate-500">Academic Report Card</p>
            </div>
            <div className="flex items-center gap-3 mb-4 bg-slate-50 p-3 rounded-lg">
              {report.student?.photo ? (
                <img src={report.student.photo} alt="" className="w-14 h-14 rounded-md object-cover border" />
              ) : null}
              <div>
                <p className="font-bold text-slate-900">{report.student.name}</p>
                <p className="text-xs text-slate-600">Class: {report.student.class}</p>
              </div>
            </div>
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
