import React, { useState, useEffect } from 'react';
import { GlassCard, GlassInput } from './ui/Glass';
import { calculateTotal, getGrade } from '../utils/grading';
import { CheckCircle2, Save } from 'lucide-react';
import { studentService } from '../services/studentService';
import { scoreService } from '../services/scoreService';

interface BulkScoreEntryProps {
  classId: number;
  subjectId: number;
  term: string;
  academicYear: string;
}

export const BulkScoreEntry: React.FC<BulkScoreEntryProps> = ({ classId, subjectId, term, academicYear }) => {
  const [students, setStudents] = useState<any[]>([]);
  const [existingScores, setExistingScores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [s, sc] = await Promise.all([
          studentService.getByClass(classId),
          scoreService.getAll({ subject_id: subjectId })
        ]);
        setStudents(s);
        setExistingScores(sc);
      } catch (err) { console.error(err); }
      setLoading(false);
    };
    loadData();
  }, [classId, subjectId]);

  const [scoresDict, setScoresDict] = useState<Record<number, { class_score: string, exam_score: string, id?: number }>>({});
  const [savingStatus, setSavingStatus] = useState<Record<number, 'saving' | 'saved' | 'error' | null>>({});

  useEffect(() => {
    const newDict: typeof scoresDict = {};
    const relevantScores = existingScores.filter((s: any) => s.term === term && s.academic_year === academicYear);
    
    students.forEach((student: any) => {
      const score = relevantScores.find((s: any) => s.student_id === student.id);
      if (score) {
        newDict[student.id!] = {
          class_score: score.class_score.toString(),
          exam_score: score.exam_score.toString(),
          id: score.id
        };
      } else {
        newDict[student.id!] = { class_score: '', exam_score: '' };
      }
    });

    setScoresDict(newDict);
  }, [students, existingScores, term, academicYear]);

  const handleUpdate = (studentId: number, field: 'class_score' | 'exam_score', value: string) => {
    setScoresDict(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], [field]: value }
    }));
  };

  const handleBlur = async (studentId: number) => {
    const data = scoresDict[studentId];
    if (!data) return;
    
    if (data.class_score === '' && data.exam_score === '') return;

    const cScore = parseFloat(data.class_score || '0');
    const eScore = parseFloat(data.exam_score || '0');

    if (cScore > 50 || cScore < 0 || eScore > 50 || eScore < 0) {
      setSavingStatus(prev => ({...prev, [studentId]: 'error'}));
      return;
    }

    setSavingStatus(prev => ({...prev, [studentId]: 'saving'}));

    const total = calculateTotal(cScore, eScore);
    const grade = getGrade(total);

    try {
      if (data.id) {
        await scoreService.update(data.id, {
          class_score: cScore,
          exam_score: eScore,
          total,
          grade
        });
      } else {
        const created = await scoreService.create({
          student_id: studentId,
          subject_id: subjectId,
          class_score: cScore,
          exam_score: eScore,
          total,
          grade,
          term,
          academic_year: academicYear
        });
        setScoresDict(prev => ({
          ...prev,
          [studentId]: { ...prev[studentId], id: created.id }
        }));
      }
      setSavingStatus(prev => ({...prev, [studentId]: 'saved'}));
      setTimeout(() => {
        setSavingStatus(prev => ({...prev, [studentId]: null}));
      }, 2000);
    } catch(err) {
      setSavingStatus(prev => ({...prev, [studentId]: 'error'}));
    }
  };

  if (loading) return <div className="text-slate-500 italic p-4">Loading...</div>;

  if (students.length === 0) return <div className="text-slate-500 italic p-4">No students in this class.</div>;

  return (
    <div className="flex flex-col gap-3 mt-4">
      <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_30px] gap-2 px-4 py-2 bg-slate-100 rounded-lg text-xs font-bold uppercase tracking-widest text-slate-500">
        <div>Student</div>
        <div className="text-center">Class (50)</div>
        <div className="text-center">Exam (50)</div>
        <div className="text-center">Total</div>
        <div className="text-center">Grade</div>
        <div></div>
      </div>
      {students.map((student: any) => {
         const data = scoresDict[student.id!] || { class_score: '', exam_score: '' };
         const c = parseFloat(data.class_score || '0');
         const e = parseFloat(data.exam_score || '0');
         const total = ((data.class_score !== '' || data.exam_score !== '') && (c >= 0 && c <= 50) && (e >= 0 && e <= 50)) ? calculateTotal(c, e) : null;
         const grade = total !== null ? getGrade(total) : '-';
         const status = savingStatus[student.id!];

         return (
            <GlassCard key={student.id} className="p-2 px-4 grid grid-cols-[2fr_1fr_1fr_1fr_1fr_30px] gap-2 items-center">
               <div className="font-medium text-slate-800 truncate" title={student.name}>{student.name}</div>
               <div>
                  <input 
                    type="number" 
                    className={`w-full bg-slate-50 border ${status === 'error' ? 'border-red-300' : 'border-slate-200'} rounded-md p-1.5 text-center font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100`}
                    value={data.class_score}
                    onChange={(e) => handleUpdate(student.id!, 'class_score', e.target.value)}
                    onBlur={() => handleBlur(student.id!)}
                    min="0" max="50"
                  />
               </div>
               <div>
                  <input 
                    type="number" 
                    className={`w-full bg-slate-50 border ${status === 'error' ? 'border-red-300' : 'border-slate-200'} rounded-md p-1.5 text-center font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100`}
                    value={data.exam_score}
                    onChange={(e) => handleUpdate(student.id!, 'exam_score', e.target.value)}
                    onBlur={() => handleBlur(student.id!)}
                    min="0" max="50"
                  />
               </div>
               <div className="text-center font-black text-blue-700">{total !== null ? total : '-'}</div>
               <div className="text-center font-bold text-slate-600">{grade}</div>
               <div className="flex items-center justify-center">
                 {status === 'saving' && <div className="w-4 h-4 rounded-full border-2 border-slate-300 border-t-blue-500 animate-spin"></div>}
                 {status === 'saved' && <CheckCircle2 size={16} className="text-emerald-500" />}
               </div>
            </GlassCard>
         );
      })}
    </div>
  );
};
