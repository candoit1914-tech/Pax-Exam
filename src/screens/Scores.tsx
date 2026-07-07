import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GlassCard, GlassInput, GlassSelect, GlassButton } from '../components/ui/Glass';
import { calculateTotal, getGrade, getGradePoint } from '../utils/grading';
import { CheckCircle2, TrendingUp, X } from 'lucide-react';
import { SearchableStudentSelect } from '../components/SearchableStudentSelect';
import { BatchScoreEntry } from '../components/BatchScoreEntry';
import { studentService } from '../services/studentService';
import { subjectService } from '../services/subjectService';
import { classService } from '../services/classService';
import { scoreService } from '../services/scoreService';

export const ScoreEntryScreen = () => {
  const [term, setTerm] = useState(() => localStorage.getItem('scoreEntryTerm') || 'Term 1');
  const [academicYear, setAcademicYear] = useState(() => localStorage.getItem('scoreEntryYear') || '2023/2024');
  const [mode, setMode] = useState<'single' | 'batch'>('single');

  const [studentId, setStudentId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [classScore, setClassScore] = useState('');
  const [examScore, setExamScore] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [historyStudentId, setHistoryStudentId] = useState('');
  const [batchClassId, setBatchClassId] = useState('');
  const [batchSubjectId, setBatchSubjectId] = useState('');

  const [students, setStudents] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [recentScores, setRecentScores] = useState<any[]>([]);
  const [relevantScores, setRelevantScores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      studentService.getAll(),
      subjectService.getAll(),
      classService.getAll(),
    ]).then(([s, sub, c]) => {
      setStudents(s);
      setSubjects(sub);
      setClasses(c);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const fetchScores = async () => {
      try {
        const params: any = {};
        if (historyStudentId) params.student_id = historyStudentId;
        const data = await scoreService.getAll(params);
        setRecentScores(data);
      } catch (err) { console.error('Failed to load scores:', err); }
    };
    fetchScores();
  }, [historyStudentId]);

  useEffect(() => {
    if (recentScores.length === 0) { setRelevantScores([]); return; }
    const studentIds = [...new Set(recentScores.map(s => s.student_id))];
    scoreService.getAll({ student_id: studentIds.join(',') }).then(setRelevantScores).catch(() => {});
  }, [recentScores]);

  const handleSaveSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId || !subjectId || !classScore || !examScore || !term || !academicYear) {
      alert("All fields required"); return;
    }
    localStorage.setItem('scoreEntryTerm', term);
    localStorage.setItem('scoreEntryYear', academicYear);

    const cScore = parseFloat(classScore);
    const eScore = parseFloat(examScore);
    if (cScore > 50 || cScore < 0) { alert("Class score must be 0-50"); return; }
    if (eScore > 50 || eScore < 0) { alert("Exam score must be 0-50"); return; }

    await scoreService.upsert({
      student_id: parseInt(studentId),
      subject_id: parseInt(subjectId),
      class_score: cScore,
      exam_score: eScore,
      term,
      academic_year
    });

    setClassScore('');
    setExamScore('');
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };

  const handleDeleteScore = async (id: number) => {
    await scoreService.delete(id);
    const data = historyStudentId
      ? await scoreService.getAll({ student_id: historyStudentId })
      : await scoreService.getAll();
    setRecentScores(data);
  };

  const getStudentName = (id: number) => students.find((s: any) => s.id === id)?.name;
  const getSubjectName = (id: number) => subjects.find((s: any) => s.id === id)?.name;

  const getStudentTermAverage = (sId: number, t: string, yr: string) => {
    const termScores = relevantScores.filter((s: any) => s.student_id === sId && s.term === t && s.academic_year === yr);
    if (termScores.length === 0) return null;
    const total = termScores.reduce((sum: number, s: any) => sum + s.total, 0);
    return (total / termScores.length).toFixed(2);
  };

  if (loading) return <div className="p-6 pt-4"><p className="text-slate-500">Loading...</p></div>;

  return (
    <div className="p-6 pt-4 flex flex-col gap-6 relative pb-24">
      <div className="inline-flex gap-1 p-1 bg-white/40 backdrop-blur-md rounded-xl border border-white/60 shadow-sm self-start">
        <button onClick={() => setMode('single')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${mode === 'single' ? 'bg-white text-indigo-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Single Entry</button>
        <button onClick={() => setMode('batch')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${mode === 'batch' ? 'bg-white text-indigo-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Batch Entry</button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
        <GlassInput label="Academic Year" value={academicYear} sizing="sm" onChange={e => { setAcademicYear(e.target.value); localStorage.setItem('scoreEntryYear', e.target.value); }} placeholder="e.g. 2023/2024" />
        <GlassSelect label="Term" value={term} sizing="sm" onChange={e => { setTerm(e.target.value); localStorage.setItem('scoreEntryTerm', e.target.value); }} options={[{value:'Term 1', label:'Term 1'},{value:'Term 2', label:'Term 2'},{value:'Term 3', label:'Term 3'}]} />
      </div>

      <AnimatePresence mode="wait">
        {mode === 'single' ? (
          <motion.div key="single" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <GlassCard droplet className="p-3 sm:p-4">
              <form onSubmit={handleSaveSingle} className="flex flex-col gap-4">
                <SearchableStudentSelect label="Select Student" students={students} value={studentId} onChange={setStudentId} sizing="sm" required />
                <GlassSelect label="Select Subject" value={subjectId} sizing="sm" onChange={e => setSubjectId(e.target.value)} options={[{ value: '', label: 'Choose a subject' }, ...subjects.map((s: any) => ({ value: String(s.id), label: s.name }))]} required />
                <div className="grid grid-cols-2 gap-4 max-w-xs">
                  <div className="relative">
                    <GlassInput label="Class (50)" type="number" sizing="sm" value={classScore} onChange={e => setClassScore(e.target.value)} className={classScore && (parseFloat(classScore) > 50 || parseFloat(classScore) < 0) ? '!bg-red-50 !border-red-400 !text-red-700' : ''} required />
                    {classScore && (parseFloat(classScore) > 50 || parseFloat(classScore) < 0) && <span className="absolute top-0 right-2 text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded shadow-sm">Invalid (0-50)</span>}
                  </div>
                  <div className="relative">
                    <GlassInput label="Exam (50)" type="number" sizing="sm" value={examScore} onChange={e => setExamScore(e.target.value)} className={examScore && (parseFloat(examScore) > 50 || parseFloat(examScore) < 0) ? '!bg-red-50 !border-red-400 !text-red-700' : ''} required />
                    {examScore && (parseFloat(examScore) > 50 || parseFloat(examScore) < 0) && <span className="absolute top-0 right-2 text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded shadow-sm">Invalid (0-50)</span>}
                  </div>
                </div>
                <GlassButton type="submit" sizing="sm" className="mt-2 w-full max-w-xs">{showSuccess ? <CheckCircle2 className="text-emerald-300" /> : "Save Score"}</GlassButton>
              </form>
            </GlassCard>

            <div className="mt-8 pb-24">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2"><TrendingUp className="text-blue-600" size={20} />{historyStudentId ? 'Score History' : 'Recent Entries'}</h2>
                <div className="w-full sm:w-64 relative z-30">
                  <SearchableStudentSelect label="Filter by Student" students={students} value={historyStudentId} onChange={setHistoryStudentId} sizing="sm" />
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <AnimatePresence>
                  {recentScores.map((score: any) => {
                    const termAvg = getStudentTermAverage(score.student_id, score.term, score.academic_year);
                    const termScores = relevantScores.filter((s: any) => s.student_id === score.student_id && s.term === score.term && s.academic_year === score.academic_year);
                    const hasScores = termScores.length > 0;
                    const termGpa = hasScores ? (termScores.reduce((acc: number, s: any) => acc + getGradePoint(s.grade), 0) / termScores.length).toFixed(2) : null;
                    return (
                      <motion.div key={score.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
                        <GlassCard className="p-1 px-3 flex items-center justify-between shadow-sm hover:bg-white/50 transition-colors">
                          <div className="flex-1 min-w-0 pr-2 py-0.5">
                            <p className="font-bold text-[13px] text-slate-900 truncate leading-tight">
                              <span className="text-[8px] text-blue-600 font-black mr-1.5 bg-blue-50 px-1 py-0.5 rounded border border-blue-100">#{score.student_id}</span>
                              {getStudentName(score.student_id)}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5 truncate">
                              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 truncate">{getSubjectName(score.subject_id)} &bull; {score.term}</p>
                              {termAvg && <p className="text-[9px] text-indigo-600 font-bold bg-indigo-50 px-1 rounded shrink-0">Avg: {termAvg}%</p>}
                              {termGpa && <p className="text-[9px] text-emerald-600 font-bold bg-emerald-50 px-1 rounded shrink-0">GPA: {termGpa}</p>}
                            </div>
                          </div>
                          <div className="flex flex-col items-end shrink-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] uppercase tracking-widest font-black bg-slate-100 text-slate-600 px-1 rounded shadow-sm border border-slate-200">{score.grade}</span>
                              <p className="font-black text-lg text-blue-700 leading-none">{score.total}</p>
                            </div>
                            <button onClick={() => handleDeleteScore(score.id)} className="text-slate-400 hover:text-red-500 p-1 mt-0.5 rounded hover:bg-red-50 transition-colors"><X size={12} /></button>
                          </div>
                        </GlassCard>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div key="batch" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex flex-col gap-4 pb-24">
            <GlassCard droplet className="p-3 sm:p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <GlassSelect label="Select Class" value={batchClassId} sizing="sm" onChange={e => setBatchClassId(e.target.value)} options={[{ value: '', label: 'Choose a class' }, ...classes.map((c: any) => ({ value: String(c.id), label: c.name }))]} />
                <GlassSelect label="Select Subject" value={batchSubjectId} sizing="sm" onChange={e => setBatchSubjectId(e.target.value)} options={[{ value: '', label: 'Choose a subject' }, ...subjects.map((s: any) => ({ value: String(s.id), label: s.name }))]} />
              </div>
            </GlassCard>
            {batchClassId && batchSubjectId && (
              <BatchScoreEntry classId={parseInt(batchClassId)} subjectId={parseInt(batchSubjectId)} term={term} academicYear={academicYear} />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
