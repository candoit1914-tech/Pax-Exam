import React, { useState, useEffect } from 'react';
import { GlassInput } from './ui/Glass';

import { CheckCircle2, Save } from 'lucide-react';
import { studentService } from '../services/studentService';
import { scoreService } from '../services/scoreService';

interface BatchScoreEntryProps {
  classId: number;
  subjectId: number;
  term: string;
  academicYear: string;
}

export const BatchScoreEntry: React.FC<BatchScoreEntryProps> = ({ classId, subjectId, term, academicYear }) => {
  const [scores, setScores] = useState<Record<number, { classScore: string, examScore: string }>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [existingScores, setExistingScores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [s, sc] = await Promise.all([
          studentService.getByClass(classId),
          scoreService.getAll({ subject_id: subjectId, term, academic_year: academicYear })
        ]);
        setStudents(s);
        setExistingScores(sc);
      } catch (err) { console.error(err); }
      setLoading(false);
    };
    loadData();
  }, [classId, subjectId, term, academicYear]);

  useEffect(() => {
    if (students.length > 0) {
      const initialScores: Record<number, { classScore: string, examScore: string }> = {};
      students.forEach((student: any) => {
        const existing = existingScores.find((s: any) => s.student_id === student.id);
        initialScores[student.id!] = {
          classScore: existing ? existing.class_score.toString() : '',
          examScore: existing ? existing.exam_score.toString() : ''
        };
      });
      setScores(initialScores);
    }
  }, [students, existingScores]);

  const handleScoreChange = (studentId: number, field: 'classScore' | 'examScore', value: string) => {
    setScores(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const scoresToSave: any[] = [];

      for (const student of students) {
        const studentId = student.id!;
        const cStr = scores[studentId]?.classScore;
        const eStr = scores[studentId]?.examScore;

        if (cStr === '' && eStr === '') continue;

        const cScore = parseFloat(cStr || '0');
        const eScore = parseFloat(eStr || '0');

        if (cScore > 50 || cScore < 0 || isNaN(cScore)) continue;
        if (eScore > 50 || eScore < 0 || isNaN(eScore)) continue;

        scoresToSave.push({
          student_id: studentId,
          subject_id: subjectId,
          class_score: cScore,
          exam_score: eScore,
          term,
          academic_year: academicYear
        });
      }

      if (scoresToSave.length > 0) {
        await scoreService.bulkUpsert(scoresToSave);
      }

      const updatedScores = await scoreService.getAll({ subject_id: subjectId, term, academic_year: academicYear });
      setExistingScores(updatedScores);

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (e) {
      console.error(e);
      alert("Error saving scores.");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <p className="text-slate-500 italic p-4">Loading students...</p>;

  if (students.length === 0) {
    return <p className="text-slate-500 italic p-4">No students found in this class.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto bg-white/60 backdrop-blur-md rounded-2xl border border-white/50 shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100/50">
              <th className="p-3 font-bold text-sm text-slate-700 border-b border-slate-200">Student Name</th>
              <th className="p-3 font-bold text-sm text-slate-700 border-b border-slate-200 w-32">Class (50)</th>
              <th className="p-3 font-bold text-sm text-slate-700 border-b border-slate-200 w-32">Exam (50)</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student: any) => (
              <tr key={student.id} className="border-b border-slate-100 last:border-0 hover:bg-white/50 transition-colors">
                <td className="p-3 text-sm font-medium text-slate-900 border-r border-slate-100">
                  {student.name}
                </td>
                <td className="p-2 border-r border-slate-100 relative">
                  <input
                    type="number"
                    min="0" max="50"
                    placeholder="0-50"
                    value={scores[student.id!]?.classScore || ''}
                    onChange={(e) => handleScoreChange(student.id!, 'classScore', e.target.value)}
                    className={`w-full bg-transparent border-0 focus:ring-0 text-center text-sm font-bold text-indigo-700 placeholder:font-normal placeholder:text-slate-300 outline-none ${parseFloat(scores[student.id!]?.classScore) > 50 || parseFloat(scores[student.id!]?.classScore) < 0 ? 'bg-red-50 text-red-600 outline outline-1 outline-red-400 rounded' : ''}`}
                  />
                  {parseFloat(scores[student.id!]?.classScore) > 50 || parseFloat(scores[student.id!]?.classScore) < 0 ? <span className="absolute -top-1 -right-1 text-[8px] bg-red-500 text-white px-1 rounded shadow-sm">Invalid</span> : null}
                </td>
                <td className="p-2 relative">
                  <input
                    type="number"
                    min="0" max="50"
                    placeholder="0-50"
                    value={scores[student.id!]?.examScore || ''}
                    onChange={(e) => handleScoreChange(student.id!, 'examScore', e.target.value)}
                     className={`w-full bg-transparent border-0 focus:ring-0 text-center text-sm font-bold text-emerald-700 placeholder:font-normal placeholder:text-slate-300 outline-none ${parseFloat(scores[student.id!]?.examScore) > 50 || parseFloat(scores[student.id!]?.examScore) < 0 ? 'bg-red-50 text-red-600 outline outline-1 outline-red-400 rounded' : ''}`}
                  />
                  {parseFloat(scores[student.id!]?.examScore) > 50 || parseFloat(scores[student.id!]?.examScore) < 0 ? <span className="absolute -top-1 -right-1 text-[8px] bg-red-500 text-white px-1 rounded shadow-sm">Invalid</span> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button 
        onClick={handleSave} 
        disabled={isSaving}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {showSuccess ? <CheckCircle2 size={20} /> : <Save size={20} />}
        {showSuccess ? "Saved Successfully!" : (isSaving ? "Saving..." : "Save Batch Scores")}
      </button>
    </div>
  );
};
