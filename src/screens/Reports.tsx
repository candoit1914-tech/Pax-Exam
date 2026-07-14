import React, { useState, useRef, useEffect } from 'react';
import { GlassCard, GlassSelect, GlassButton } from '../components/ui/Glass';
import { Download, FileWarning, Share2, Users, MessageCircle } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { calculateAverage, rankStudents } from '../utils/ranking';
import { ReportCard } from '../components/ReportCard';
import { TranscriptBuilder } from '../components/TranscriptBuilder';
import { CertificateBuilder } from '../components/CertificateBuilder';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Browser } from '@capacitor/browser';
import { SearchableStudentSelect } from '../components/SearchableStudentSelect';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { studentService } from '../services/studentService';
import { classService } from '../services/classService';
import { subjectService } from '../services/subjectService';
import { scoreService } from '../services/scoreService';
import { reportService } from '../services/reportService';
import { schoolService } from '../services/schoolService';

const SubjectAveragesChart = ({ students, scores, subjects }: { students: any[], scores: any[], subjects: any[] }) => {
  const data = subjects.map((subject: any) => {
    const subjectScores = scores.filter((s: any) => s.subject_id === subject.id && students.some((st: any) => st.id === s.student_id));
    const total = subjectScores.reduce((sum: number, s: any) => sum + s.total, 0);
    const avg = subjectScores.length > 0 ? (total / subjectScores.length).toFixed(1) : 0;
    return { subject: subject.name.length > 15 ? subject.name.substring(0, 15) + '...' : subject.name, average: parseFloat(String(avg)) };
  }).filter((d: any) => d.average > 0).sort((a: any, b: any) => b.average - a.average);
  if (data.length === 0) return <p className="text-slate-500 italic">No scores available for the selected term.</p>;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
        <XAxis dataKey="subject" tick={{fontSize: 10, fill: '#64748b'}} tickLine={false} axisLine={false} />
        <YAxis domain={[0, 100]} tick={{fontSize: 12, fill: '#64748b'}} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
        <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'}} />
        <Bar dataKey="average" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={50} label={{ position: 'top', formatter: (val: number) => `${val}%`, fontSize: 10, fill: '#6366f1', fontWeight: 'bold' }} />
      </BarChart>
    </ResponsiveContainer>
  );
};

export const ReportsScreen = () => {
  const [studentId, setStudentId] = useState('');
  const [classId, setClassId] = useState('');
  const [reportMode, setReportMode] = useState<'individual' | 'bulk' | 'averages' | 'subject-averages' | 'raw-scores'>('individual');
  const [reportTerm, setReportTerm] = useState('Term 1');
  const [academicYear, setAcademicYear] = useState('2023/2024');
  const [reportTeacher, setReportTeacher] = useState('');
  const [docType, setDocType] = useState<'report' | 'transcript' | 'certificate'>('report');
  const [isGenerating, setIsGenerating] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const performanceTableRef = useRef<HTMLDivElement>(null);
  const rawScoresRef = useRef<HTMLDivElement>(null);
  const classChartRef = useRef<HTMLDivElement>(null);
  const [schoolProfile, setSchoolProfile] = useState({ name: '', address: '', location: '', phone: '', email: '', logo: '', teacherSignature: '', principalSignature: '' });

  const [studentsRaw, setStudentsRaw] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [allScores, setAllScores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const p = localStorage.getItem('schoolProfile');
    if (p) { try { const parsed = JSON.parse(p); setSchoolProfile(prev => ({ ...prev, ...parsed })); } catch(e){} }
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [s, c, sub] = await Promise.all([
        studentService.getAll(),
        classService.getAll(),
        subjectService.getAll(),
      ]);
      setStudentsRaw(s);
      setClasses(c);
      setSubjects(sub);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => {
    const fetchScores = async () => {
      try {
        const params: any = {};
        if (reportMode === 'averages' || reportMode === 'subject-averages' || reportMode === 'raw-scores') {
          params.academic_year = academicYear;
          if (classId) {
            const studentsInClass = studentsRaw.filter((s: any) => Number(s.class_id) === Number(classId));
            if (studentsInClass.length > 0) {
              params.student_id = studentsInClass.map((s: any) => s.id).join(',');
            }
          }
        } else if (reportMode === 'individual' && studentId) {
          params.student_id = studentId;
          if (docType === 'report') {
            params.term = reportTerm;
            params.academic_year = academicYear;
          }
        } else if (reportMode === 'bulk' && classId) {
          const studentsInClass = studentsRaw.filter((s: any) => Number(s.class_id) === Number(classId));
          if (studentsInClass.length > 0) {
            params.student_id = studentsInClass.map((s: any) => s.id).join(',');
          }
          if (docType === 'report') {
            params.term = reportTerm;
            params.academic_year = academicYear;
          }
        }
        const data = await scoreService.getAll(params);
        setAllScores(data);
      } catch (err) { console.error(err); }
    };
    fetchScores();
  }, [docType, academicYear, reportTerm, reportMode, studentId, classId, studentsRaw]);

  const students = studentsRaw.filter((s: any) => s.status !== 'completed');
  const getSubjectName = (id: number) => subjects.find((s: any) => s.id === id)?.name || 'Unknown';

  const generatePDF = async (filename: string) => {
    if (!reportRef.current) return;
    setIsGenerating(true);
    const docTypeName = docType === 'transcript' ? "Transcript" : docType === 'certificate' ? "Certificate" : "Report";
    const finalName = `${filename.replace(/\s+/g, '_')}_${docTypeName}.pdf`;
    const opt: any = {
      margin: docType === 'report' ? 10 : 0, filename: finalName, image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: reportMode === 'bulk' ? 1.5 : 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: docType === 'certificate' ? 'landscape' : 'portrait' }
    };
    try {
      if (Capacitor.isNativePlatform()) {
        const pdfBase64 = await html2pdf().set(opt).from(reportRef.current).outputPdf('datauristring');
        const base64Data = pdfBase64.split(',')[1];
        await Filesystem.writeFile({ path: finalName, data: base64Data, directory: Directory.Documents });
        alert(`PDF Saved to Documents: ${finalName}`);
      } else {
        await html2pdf().set(opt).from(reportRef.current).save();
      }
    } catch (err) { console.error(err); alert("Could not generate PDF"); }
    finally { setIsGenerating(false); }
  };

  const generatePerformanceTablePDF = async () => {
    if (!performanceTableRef.current || !classId) return;
    setIsGenerating(true);
    const cls = classes.find((c: any) => String(c.id) === String(classId));
    const className = cls?.name?.replace(/\s+/g, '_') || 'Class';
    const finalName = `Performance_Table_${className}_${academicYear.replace('/', '-')}.pdf`;
    const opt: any = {
      margin: 10, filename: finalName, image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false, allowTaint: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };
    try {
      await new Promise(r => setTimeout(r, 300));
      if (Capacitor.isNativePlatform()) {
        const pdfBase64 = await html2pdf().set(opt).from(performanceTableRef.current).outputPdf('datauristring');
        const base64Data = pdfBase64.split(',')[1];
        await Filesystem.writeFile({ path: finalName, data: base64Data, directory: Directory.Documents });
        alert(`PDF Saved: ${finalName}`);
      } else {
        await html2pdf().set(opt).from(performanceTableRef.current).save();
      }
    } catch (err) { console.error('Performance Table PDF error:', err); alert("Could not generate PDF. Please try again."); }
    finally { setIsGenerating(false); }
  };

  const generateClassChartPDF = async () => {
    if (!classChartRef.current || !classId) return;
    setIsGenerating(true);
    const cls = classes.find((c: any) => String(c.id) === String(classId));
    const className = cls?.name?.replace(/\s+/g, '_') || 'Class';
    const finalName = `Subject_Averages_${className}_${reportTerm.replace(/\s+/g, '')}.pdf`;
    const opt: any = {
      margin: 10, filename: finalName, image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false, allowTaint: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };
    try {
      await new Promise(r => setTimeout(r, 300));
      if (Capacitor.isNativePlatform()) {
        const pdfBase64 = await html2pdf().set(opt).from(classChartRef.current).outputPdf('datauristring');
        const base64Data = pdfBase64.split(',')[1];
        await Filesystem.writeFile({ path: finalName, data: base64Data, directory: Directory.Documents });
        alert(`PDF Saved: ${finalName}`);
      } else {
        await html2pdf().set(opt).from(classChartRef.current).save();
      }
    } catch (err) { console.error('Class Chart PDF error:', err); alert("Could not generate PDF. Please try again."); }
    finally { setIsGenerating(false); }
  };

  const generateRawScoresPDF = async () => {
    if (!rawScoresRef.current || !classId) return;
    setIsGenerating(true);
    const cls = classes.find((c: any) => String(c.id) === String(classId));
    const className = cls?.name?.replace(/\s+/g, '_') || 'Class';
    const finalName = `Raw_Scores_${className}_${reportTerm.replace(/\s+/g, '')}_${academicYear.replace('/', '-')}.pdf`;
    const opt: any = {
      margin: 10, filename: finalName, image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false, allowTaint: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };
    try {
      await new Promise(r => setTimeout(r, 300));
      if (Capacitor.isNativePlatform()) {
        const pdfBase64 = await html2pdf().set(opt).from(rawScoresRef.current).outputPdf('datauristring');
        const base64Data = pdfBase64.split(',')[1];
        await Filesystem.writeFile({ path: finalName, data: base64Data, directory: Directory.Documents });
        alert(`PDF Saved: ${finalName}`);
      } else {
        await html2pdf().set(opt).from(rawScoresRef.current).save();
      }
    } catch (err) { console.error('Raw Scores PDF error:', err); alert("Could not generate PDF. Please try again."); }
    finally { setIsGenerating(false); }
  };

  const shareReport = async () => {
    setIsGenerating(true);
    try {
      const element = reportRef.current;
      if (!element) return;
      const opt: any = {
        margin: docType === 'report' ? 10 : 0, filename: 'document.pdf', image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: reportMode === 'bulk' ? 1.5 : 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: docType === 'certificate' ? 'landscape' : 'portrait' }
      };
      let title = "Report Cards", filename = "Report_Cards.pdf", textSummary = "Download report cards via the app.";
      if (reportMode === 'individual' && targetStudents.length > 0) {
        const student = targetStudents[0];
        const data = renderData[0];
        title = `${student.name} Report Card`;
        filename = `${student.name.replace(/\s+/g, '_')}_Report.pdf`;
        textSummary = `*_Academic Report Summary_*\n*Term*: Current Term\n*School*: ${schoolProfile.name}\n-------------------------\n*Student*: ${student.name}\n*Class*: ${data.myClass?.name || 'Assigned Class'}\n*Overall Performance*: ${data.myRanking?.average ? data.myRanking.average.toFixed(2) : '0'}%\n*Class Position*: ${data.myRanking?.position || '-'} / ${data.totalInClass}\n\n_Please find the official PDF transcript attached._`;
      }
      if (Capacitor.isNativePlatform()) {
        const pdfBase64 = await html2pdf().set(opt).from(element).outputPdf('datauristring');
        const base64Data = pdfBase64.split(',')[1];
        const writeResult = await Filesystem.writeFile({ path: filename, data: base64Data, directory: Directory.Cache });
        await Share.share({ title, text: textSummary, url: writeResult.uri, dialogTitle: 'Share PDF' });
      } else if (navigator.share) {
        const pdfBlob = await html2pdf().set(opt).from(element).output('blob');
        const file = new File([pdfBlob], filename, { type: 'application/pdf' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ title, text: textSummary, files: [file] });
        } else {
          await navigator.share({ title, text: textSummary + `\n\nLink: ${window.location.href}` });
        }
      } else { alert("Sharing not supported."); }
    } catch (err) { console.error(err); }
    finally { setIsGenerating(false); }
  };

  let targetStudents: any[] = [];
  if (reportMode === 'individual' && studentId) {
    const s = students.find((x: any) => String(x.id) === studentId);
    if (s) targetStudents = [s];
  } else if ((reportMode === 'bulk' || reportMode === 'averages' || reportMode === 'subject-averages' || reportMode === 'raw-scores') && classId) {
    targetStudents = students.filter((x: any) => Number(x.class_id) === Number(classId));
  }

  const classScoresForRanking = allScores.filter((sc: any) =>
    (sc.term || 'Term 1') === reportTerm && String(sc.academic_year || '2023/2024') === String(academicYear) && targetStudents.some((s: any) => s.id === sc.student_id)
  );

  const subjectRankings = new Map<number, Map<number, number>>();
  subjects.forEach((sub: any) => {
    const scoresForSub = classScoresForRanking.filter((sc: any) => sc.subject_id === sub.id);
    const sorted = [...scoresForSub].sort((a: any, b: any) => b.total - a.total);
    let rank = 1;
    let prevTotal = -1;
    const rankingMap = new Map();
    sorted.forEach((sc: any, i: number) => {
      if (sc.total !== prevTotal) rank = i + 1;
      rankingMap.set(sc.student_id, rank);
      prevTotal = sc.total;
    });
    if (sub.id) subjectRankings.set(sub.id, rankingMap);
  });

  const renderData = targetStudents.map((student: any) => {
    const studentScores = allScores.filter((sc: any) => sc.student_id === student.id).map((sc: any) => {
      const isCurrentTerm = (sc.term || 'Term 1') === reportTerm && String(sc.academic_year || '2023/2024') === String(academicYear);
      const pos = isCurrentTerm ? subjectRankings.get(sc.subject_id)?.get(student.id!) || null : null;
      return { ...sc, subjectName: getSubjectName(sc.subject_id), subjectPosition: pos };
    });
    const classAverages = students.filter((s: any) => Number(s.class_id) === Number(student.class_id)).map((s: any) => {
      const sScores = allScores.filter((sc: any) => sc.student_id === s.id && (sc.term || 'Term 1') === reportTerm && String(sc.academic_year || '2023/2024') === String(academicYear));
      const avg = calculateAverage(sScores);
      const examTotal = sScores.reduce((sum: number, curr: any) => sum + (Number(curr.exam_score) || 0), 0) * 2;
      return { id: s.id!, name: s.name, average: avg, rankScore: examTotal };
    });
    const totalInClass = classAverages.length;
    const rankings = rankStudents(classAverages);
    const myRanking = rankings.find((r: any) => r.id === student.id);
    let myClass = classes.find((c: any) => String(c.id) === String(student.class_id));
    if (!myClass && classes.length > 0) myClass = classes[0];
    return { student, studentScores, myRanking, totalInClass, myClass };
  });

  let whatsappHref = '';
  if (reportMode === 'individual' && targetStudents.length > 0 && renderData.length > 0) {
    const student = targetStudents[0];
    const data = renderData[0];
    const sumExamScore = data.studentScores?.reduce((acc: number, curr: any) => acc + (Number(curr.exam_score) || 0), 0) || 0;
    const totalExamScoreValue = sumExamScore * 2;
    const getOrdinalNum = (n: number) => { const s = ["th", "st", "nd", "rd"]; const v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
    const posLabel = data.myRanking?.position ? `${getOrdinalNum(data.myRanking.position)} out of ${data.totalInClass}` : '-';
    if (student.parent_phone) {
      const phone = student.parent_phone.replace(/[^0-9]/g, '');
      const summary = `*_Academic Report Summary_*\n*Term*: ${reportTerm}\n*Year*: ${academicYear}\n*School*: ${schoolProfile.name}\n-------------------------\n*Student*: ${student.name}\n*Class*: ${data.myClass?.name || 'Assigned Class'}\n*Overall Performance*: ${data.myRanking?.average ? data.myRanking.average.toFixed(2) : '0'}%\n*Total Exam Score*: ${totalExamScoreValue}\n*Class Position*: ${posLabel}\n\n_Please collect the official PDF transcript from the school administration._`.trim();
      whatsappHref = `https://wa.me/${phone}?text=${encodeURIComponent(summary)}`;
    }
  }

  const sendWhatsApp = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!whatsappHref) {
      if (targetStudents.length > 0) alert(`No WhatsApp phone number is registered for ${targetStudents[0].name}'s parent.`);
      return;
    }
    const sharePDF = window.confirm("Press OK to share PDF. Cancel to open WhatsApp chat.");
    if (sharePDF) {
      if (!navigator.share && !Capacitor.isNativePlatform()) { alert("Share not supported."); return; }
      setIsGenerating(true);
      try {
        const element = reportRef.current;
        if (!element) return;
        const opt: any = {
          margin: docType === 'report' ? 10 : 0, filename: 'document.pdf', image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: reportMode === 'bulk' ? 1.5 : 2, useCORS: true, logging: false },
          jsPDF: { unit: 'mm', format: 'a4', orientation: docType === 'certificate' ? 'landscape' : 'portrait' }
        };
        if (Capacitor.isNativePlatform()) {
          const pdfBase64 = await html2pdf().set(opt).from(element).outputPdf('datauristring');
          const base64Data = pdfBase64.split(',')[1];
          const writeResult = await Filesystem.writeFile({ path: 'document.pdf', data: base64Data, directory: Directory.Cache });
          await Share.share({ title: `${targetStudents[0].name} Report Card`, url: writeResult.uri, dialogTitle: 'Share to WhatsApp' });
        } else if (navigator.canShare) {
          const pdfBlob = await html2pdf().set(opt).from(element).output('blob');
          const file = new File([pdfBlob], `${targetStudents[0].name.replace(/\s+/g, '_')}_Report.pdf`, { type: 'application/pdf' });
          await navigator.share({ files: [file], title: `${targetStudents[0].name} Report Card` });
        }
      } catch (err) { console.error(err); }
      finally { setIsGenerating(false); }
    } else {
      if (Capacitor.isNativePlatform()) { await Browser.open({ url: whatsappHref }); }
      else { window.open(whatsappHref, '_blank'); }
    }
  };

  if (loading) return <div className="p-6 pt-4"><p className="text-slate-500">Loading reports...</p></div>;

  return (
    <div className="p-6 pt-4 flex flex-col gap-6 relative pb-24">
      <div className="inline-flex gap-1 p-1 bg-white/40 backdrop-blur-md rounded-xl border border-white/60 shadow-sm self-start flex-wrap">
        <button className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-all ${reportMode === 'individual' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-800 hover:bg-white/50'}`} onClick={() => setReportMode('individual')}>Individual Student</button>
        <button className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-all ${reportMode === 'bulk' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-800 hover:bg-white/50'}`} onClick={() => { setReportMode('bulk'); setDocType('report'); }}>Bulk Class Export</button>
        <button className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-all ${reportMode === 'averages' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-800 hover:bg-white/50'}`} onClick={() => { setReportMode('averages'); setDocType('report'); }}>Performance Table</button>
        <button className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-all ${reportMode === 'subject-averages' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-800 hover:bg-white/50'}`} onClick={() => { setReportMode('subject-averages'); setDocType('report'); }}>Class Chart</button>
        <button className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-all ${reportMode === 'raw-scores' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-800 hover:bg-white/50'}`} onClick={() => { setReportMode('raw-scores'); setDocType('report'); }}>Class Raw Scores</button>
      </div>

      <GlassCard droplet className="p-5">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              {reportMode === 'individual' ? (
                <SearchableStudentSelect label="Search Student" students={students} classes={classes} value={studentId} onChange={setStudentId} />
              ) : (
                <GlassSelect label="Select Class" value={classId} onChange={e => setClassId(e.target.value)} options={classes.map((c: any) => ({ value: c.id!, label: c.name }))} />
              )}
            </div>
            {(reportMode !== 'averages' && reportMode !== 'subject-averages' && reportMode !== 'raw-scores') && (
              <div className="w-full sm:w-64">
                <GlassSelect label="Document Type" value={docType} onChange={e => setDocType(e.target.value as any)}
                  options={[{value: 'report', label: 'Report Card'}, {value: 'transcript', label: 'Academic Transcript'}, {value: 'certificate', label: 'Completion Certificate'}]} />
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-200/50 mt-2">
            <GlassSelect label="Term" value={reportTerm} onChange={e => setReportTerm(e.target.value)} options={[{value: 'Term 1', label: 'Term 1'}, {value: 'Term 2', label: 'Term 2'}, {value: 'Term 3', label: 'Term 3'}]} disabled={docType !== 'report'} />
            <div className={`flex flex-col gap-1.5 ${docType !== 'report' ? 'opacity-50' : ''}`}>
              <label className="text-sm font-semibold text-slate-700 ml-1 drop-shadow-sm">Academic Year</label>
              <input type="text" value={academicYear} onChange={e => setAcademicYear(e.target.value)} placeholder="2023/2024" disabled={docType !== 'report'}
                className="w-full bg-white/60 border border-white/80 rounded-xl px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-medium shadow-sm backdrop-blur-md disabled:cursor-not-allowed" />
            </div>
            {(reportMode !== 'averages' && reportMode !== 'subject-averages' && reportMode !== 'raw-scores') && (
              <div className={`flex flex-col gap-1.5 ${docType !== 'report' ? 'opacity-50' : ''}`}>
                <label className="text-sm font-semibold text-slate-700 ml-1 drop-shadow-sm">Teacher Override</label>
                <input type="text" value={reportTeacher} onChange={e => setReportTeacher(e.target.value)} placeholder="Leave blank for Class Teacher" disabled={docType !== 'report'}
                  className="w-full bg-white/60 border border-white/80 rounded-xl px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-medium shadow-sm backdrop-blur-md disabled:cursor-not-allowed" />
              </div>
            )}
          </div>
        </div>
      </GlassCard>

      {targetStudents.length > 0 ? (
        <div className="pb-24">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-slate-900 text-lg">
              {reportMode === 'individual' ? 'Previewing Report Card'
                : reportMode === 'bulk' ? `Previewing Bulk Set (${targetStudents.length} Students)`
                : reportMode === 'subject-averages' ? `Subject Averages Chart`
                : reportMode === 'raw-scores' ? `Class Raw Scores (${targetStudents.length} Students)`
                : `Class Performance Table (${targetStudents.length} Students)`}
            </h2>
            <div className="flex gap-2">
              {reportMode === 'individual' && (
                <a href={whatsappHref || '#'} target="_blank" rel="noopener noreferrer" onClick={sendWhatsApp}
                  className="flex items-center justify-center p-2 px-3 bg-green-600 border border-green-600 hover:bg-green-700 text-white rounded-lg shadow-sm transition-all" title="Send to Parent via WhatsApp">
                  <MessageCircle size={20} />
                </a>
              )}
              {reportMode === 'individual' && (
                <>
                  <GlassButton variant="secondary" onClick={shareReport} className="!p-2"><Share2 size={20} /></GlassButton>
                  <GlassButton onClick={() => generatePDF(targetStudents[0].name)} className="!p-2 !px-4 bg-indigo-600 text-white">
                    {isGenerating ? <span className="animate-pulse">Generating...</span> : <><Download size={20} /> Download PDF</>}
                  </GlassButton>
                </>
              )}
              {reportMode === 'bulk' && (
                <GlassButton onClick={() => generatePDF('Class_Batch')} className="!px-4 bg-indigo-600 text-white">
                  {isGenerating ? <span className="animate-pulse">Generating...</span> : <><Download size={20} /> Download All Report Cards</>}
                </GlassButton>
              )}
              {reportMode === 'averages' && classId && (
                <GlassButton onClick={generatePerformanceTablePDF} disabled={isGenerating} className="!px-4 bg-indigo-600 text-white">
                  {isGenerating ? <span className="animate-pulse">Generating...</span> : <><Download size={20} /> Download Performance Table</>}
                </GlassButton>
              )}
              {reportMode === 'subject-averages' && classId && (
                <GlassButton onClick={generateClassChartPDF} disabled={isGenerating} className="!px-4 bg-indigo-600 text-white">
                  {isGenerating ? <span className="animate-pulse">Generating...</span> : <><Download size={20} /> Download Chart</>}
                </GlassButton>
              )}
              {reportMode === 'raw-scores' && classId && (
                <GlassButton onClick={generateRawScoresPDF} disabled={isGenerating} className="!px-4 bg-indigo-600 text-white">
                  {isGenerating ? <span className="animate-pulse">Generating...</span> : <><Download size={20} /> Download Raw Scores</>}
                </GlassButton>
              )}
            </div>
          </div>

          <GlassCard className={`p-2 sm:p-4 bg-white text-gray-800 overflow-hidden border border-slate-200 ${reportMode === 'averages' ? '' : 'overflow-x-auto'}`} style={{ borderRadius: '16px' }}>
            {reportMode === 'averages' ? (
              <div ref={performanceTableRef} className="overflow-x-auto w-full bg-white p-4">
                <h3 className="text-center font-bold text-slate-800 text-sm mb-3 uppercase tracking-wider">
                  Class Performance Table - {classes.find((c: any) => String(c.id) === classId)?.name || ''} ({academicYear})
                </h3>
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 uppercase tracking-wider text-xs border-y border-slate-200">
                      <th className="py-3 px-4 font-bold border-r border-slate-200">Student Name</th>
                      <th className="py-3 px-4 font-bold text-center border-r border-slate-200">Term 1 Average</th>
                      <th className="py-3 px-4 font-bold text-center border-r border-slate-200">Term 2 Average</th>
                      <th className="py-3 px-4 font-bold text-center border-r border-slate-200">Term 3 Average</th>
                      <th className="py-3 px-4 font-black text-indigo-700 text-center bg-indigo-50">Yearly Average</th>
                    </tr>
                  </thead>
                  <tbody>
                    {targetStudents.map((student: any) => {
                      const scoresT1 = allScores.filter((s: any) => s.student_id === student.id && s.term === 'Term 1' && String(s.academic_year) === String(academicYear));
                      const scoresT2 = allScores.filter((s: any) => s.student_id === student.id && s.term === 'Term 2' && String(s.academic_year) === String(academicYear));
                      const scoresT3 = allScores.filter((s: any) => s.student_id === student.id && s.term === 'Term 3' && String(s.academic_year) === String(academicYear));
                      const getAvg = (arr: any[]) => arr.length > 0 ? calculateAverage(arr) : null;
                      const t1 = getAvg(scoresT1), t2 = getAvg(scoresT2), t3 = getAvg(scoresT3);
                      const validAvgs = [t1, t2, t3].filter(a => a !== null) as number[];
                      const yearAvg = validAvgs.length > 0 ? (validAvgs.reduce((acc, curr) => acc + curr, 0) / validAvgs.length) : null;
                      return (
                        <tr key={student.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-4 font-bold text-slate-800 border-r border-slate-100">{student.name}</td>
                          <td className={`py-3 px-4 text-center font-semibold border-r border-slate-100 ${reportTerm === 'Term 1' ? 'bg-indigo-50/50' : ''}`}>{t1 !== null ? `${t1.toFixed(1)}%` : '-'}</td>
                          <td className={`py-3 px-4 text-center font-semibold border-r border-slate-100 ${reportTerm === 'Term 2' ? 'bg-indigo-50/50' : ''}`}>{t2 !== null ? `${t2.toFixed(1)}%` : '-'}</td>
                          <td className={`py-3 px-4 text-center font-semibold border-r border-slate-100 ${reportTerm === 'Term 3' ? 'bg-indigo-50/50' : ''}`}>{t3 !== null ? `${t3.toFixed(1)}%` : '-'}</td>
                          <td className="py-3 px-4 text-center font-black text-indigo-700 bg-indigo-50/50">{yearAvg !== null ? `${yearAvg.toFixed(2)}%` : '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : reportMode === 'subject-averages' ? (
              <div ref={classChartRef} className="p-4 w-full h-80 flex items-center justify-center bg-white">
                <SubjectAveragesChart students={targetStudents} scores={allScores} subjects={subjects} />
              </div>
            ) : reportMode === 'raw-scores' ? (
              <div ref={rawScoresRef} className="overflow-x-auto w-full bg-white p-4">
                <h3 className="text-center font-bold text-slate-800 text-sm mb-3 uppercase tracking-wider">
                  Class Raw Scores - {classes.find((c: any) => String(c.id) === classId)?.name || ''} ({reportTerm} {academicYear})
                </h3>
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 uppercase tracking-wider border-y border-slate-200">
                      <th className="py-2 px-2 font-bold border-r border-slate-200 sticky left-0 bg-slate-100">Pos</th>
                      <th className="py-2 px-2 font-bold border-r border-slate-200 sticky left-8 bg-slate-100">Student Name</th>
                      {subjects.filter((sub: any) => allScores.some((sc: any) => sc.subject_id === sub.id && targetStudents.some((s: any) => s.id === sc.student_id))).map((sub: any) => (
                        <th key={sub.id} className="py-2 px-2 font-bold text-center border-r border-slate-200" colSpan={3}>
                          {sub.name}
                        </th>
                      ))}
                      <th className="py-2 px-2 font-black text-center border-r border-slate-200 bg-indigo-50">Total</th>
                    </tr>
                    <tr className="bg-slate-50 text-slate-600 text-[10px] border-b border-slate-200">
                      <th className="py-1 px-2 border-r border-slate-200 sticky left-0 bg-slate-50"></th>
                      <th className="py-1 px-2 border-r border-slate-200 sticky left-8 bg-slate-50"></th>
                      {subjects.filter((sub: any) => allScores.some((sc: any) => sc.subject_id === sub.id && targetStudents.some((s: any) => s.id === sc.student_id))).map((sub: any) => (
                        <React.Fragment key={sub.id}>
                          <th className="py-1 px-1 text-center border-r border-slate-200 font-semibold">C/A</th>
                          <th className="py-1 px-1 text-center border-r border-slate-200 font-semibold">Exam</th>
                          <th className="py-1 px-1 text-center border-r border-slate-200 font-bold">Tot</th>
                        </React.Fragment>
                      ))}
                      <th className="py-1 px-2 text-center border-r border-slate-200 font-black bg-indigo-50"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const activeSubjects = subjects.filter((sub: any) => allScores.some((sc: any) => sc.subject_id === sub.id && targetStudents.some((s: any) => s.id === sc.student_id)));
                      const studentTotals = targetStudents.map((student: any) => {
                        const studentScoresForTerm = allScores.filter((sc: any) => sc.student_id === student.id && (sc.term || 'Term 1') === reportTerm && String(sc.academic_year || '2023/2024') === String(academicYear));
                        const total = studentScoresForTerm.reduce((sum: number, sc: any) => sum + (Number(sc.total) || 0), 0);
                        return { ...student, total };
                      }).sort((a: any, b: any) => b.total - a.total);
                      let rank = 1;
                      let prevTotal: number | null = null;
                      const ranked = studentTotals.map((s: any, i: number) => {
                        if (prevTotal !== null && s.total < prevTotal) rank = i + 1;
                        prevTotal = s.total;
                        return { ...s, position: rank };
                      });
                      return ranked.map((student: any) => (
                        <tr key={student.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                          <td className="py-2 px-2 font-bold text-center border-r border-slate-200 sticky left-0 bg-white">{student.position}</td>
                          <td className="py-2 px-2 font-bold text-slate-800 border-r border-slate-200 sticky left-8 bg-white whitespace-nowrap">{student.name}</td>
                          {activeSubjects.map((sub: any) => {
                            const score = allScores.find((sc: any) => sc.student_id === student.id && sc.subject_id === sub.id && (sc.term || 'Term 1') === reportTerm && String(sc.academic_year || '2023/2024') === String(academicYear));
                            return (
                              <React.Fragment key={sub.id}>
                                <td className="py-2 px-1 text-center border-r border-slate-100">{score?.class_score ?? '-'}</td>
                                <td className="py-2 px-1 text-center border-r border-slate-100">{score?.exam_score ?? '-'}</td>
                                <td className="py-2 px-1 text-center font-bold border-r border-slate-200">{score?.total ?? '-'}</td>
                              </React.Fragment>
                            );
                          })}
                          <td className="py-2 px-2 text-center font-black text-indigo-700 bg-indigo-50/50">{student.total}</td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            ) : (
              <div ref={reportRef} className="w-full relative shrink-0 text-left bg-white flex flex-col items-center">
                {renderData.map((data: any, index: number) => (
                  <React.Fragment key={data.student.id}>
                    <div className="w-full flex justify-center">
                      {docType === 'report' && <ReportCard student={data.student} studentScores={data.studentScores} myRanking={data.myRanking} totalInClass={data.totalInClass} myClass={data.myClass} schoolProfile={schoolProfile} getSubjectName={getSubjectName} term={reportTerm} academicYear={academicYear} reportTeacher={reportTeacher} />}
                      {docType === 'transcript' && <TranscriptBuilder student={data.student} allScores={data.studentScores} schoolProfile={schoolProfile} />}
                      {docType === 'certificate' && <CertificateBuilder student={data.student} schoolProfile={schoolProfile} myClass={data.myClass} myRanking={data.myRanking} totalInClass={data.totalInClass} term={reportTerm} academicYear={academicYear} />}
                    </div>
                    {index < renderData.length - 1 && <div className="html2pdf__page-break w-full h-0"></div>}
                  </React.Fragment>
                ))}
              </div>
            )}
          </GlassCard>
        </div>
      ) : (
        <div className="mt-12 flex flex-col items-center justify-center text-slate-500 pb-24">
          {reportMode === 'bulk' || reportMode === 'raw-scores' ? <Users size={48} className="mb-4 opacity-50" /> : <FileWarning size={48} className="mb-4 opacity-50" />}
          <p className="font-medium">{reportMode === 'individual' ? 'Please select a student to view their report card' : 'Please select a class to generate a batch PDF'}</p>
        </div>
      )}
    </div>
  );
};
