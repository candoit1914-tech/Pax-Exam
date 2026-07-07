import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { GlassCard, GlassInput, GlassButton } from '../components/ui/Glass';
import { Book, Bookmark, X } from 'lucide-react';
import { classService } from '../services/classService';
import { subjectService } from '../services/subjectService';

export const ClassesSubjectsScreen = () => {
  const [className, setClassName] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [classesData, subjectsData] = await Promise.all([
        classService.getAll(),
        subjectService.getAll(),
      ]);
      setClasses(classesData);
      setSubjects(subjectsData);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!className) return;
    await classService.create({ name: className, teacher_name: teacherName || 'Not Assigned' });
    setClassName('');
    setTeacherName('');
    await loadData();
  };

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = subjectName.trim();
    if (!name) { alert("Subject name cannot be empty."); return; }
    const exists = subjects.find((s: any) => s.name.toLowerCase() === name.toLowerCase());
    if (exists) { alert("This subject already exists."); return; }
    await subjectService.create({ name });
    setSubjectName('');
    await loadData();
  };

  if (loading) return <div className="p-6 pt-4"><p className="text-slate-500">Loading...</p></div>;

  return (
    <div className="p-6 pt-4 flex flex-col gap-8 pb-20">
      <section>
        <h2 className="text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
          <Bookmark className="text-indigo-600" />
          Classes
        </h2>
        <GlassCard droplet className="p-4 mb-4">
          <form onSubmit={handleAddClass} className="flex flex-col sm:flex-row gap-2">
            <GlassInput placeholder="e.g. Form 1A" value={className} onChange={e => setClassName(e.target.value)} className="px-3 py-2 flex-1" />
            <GlassInput placeholder="Class Teacher Name" value={teacherName} onChange={e => setTeacherName(e.target.value)} className="px-3 py-2 flex-1" />
            <GlassButton type="submit" className="px-4 py-2 w-full sm:w-auto">Add</GlassButton>
          </form>
        </GlassCard>
        <div className="flex flex-wrap gap-2">
          {classes.map((c: any) => {
            const tname = c.teacher_name && c.teacher_name !== 'Not Assigned'
              ? c.teacher_name.split(' ').map((n: string) => n.charAt(0).toUpperCase() + n.slice(1).toLowerCase()).join(' ')
              : 'Not assigned';
            return (
              <motion.div key={c.id} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                <GlassCard className="px-2.5 py-0.5 flex items-center gap-2 rounded-full border-white/50 bg-white/40 shadow-sm relative pr-7">
                  <span className="text-[13px] font-bold text-indigo-900 leading-none">{c.name}</span>
                  <span
                    className="text-[9px] uppercase tracking-widest font-bold text-slate-500 hover:text-indigo-600 bg-white/60 px-1.5 py-0.5 rounded border border-white cursor-pointer ml-auto leading-none"
                    onClick={async () => {
                      const newTeacher = window.prompt(`Enter a new Teacher Name for ${c.name}:`, c.teacher_name === 'Not Assigned' ? '' : c.teacher_name);
                      if (newTeacher !== null) {
                        await classService.update(c.id, { teacher_name: newTeacher.trim() || 'Not Assigned' });
                        await loadData();
                      }
                    }}
                    title="Click to edit teacher"
                  >
                    {tname}
                  </span>
                  <button onClick={async () => {
                    if (window.confirm('Are you sure you want to delete this class? This could orphan students in this class.')) {
                      await classService.delete(c.id);
                      await loadData();
                    }
                  }} className="text-indigo-600 hover:text-red-500 bg-white/50 hover:bg-white rounded-full p-0.5 transition-colors absolute right-1">
                    <X size={10} />
                  </button>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
          <Book className="text-emerald-600" />
          Subjects
        </h2>
        <GlassCard droplet className="p-4 mb-4">
          <form onSubmit={handleAddSubject} className="flex gap-2">
            <GlassInput placeholder="e.g. Mathematics" value={subjectName} onChange={e => setSubjectName(e.target.value)} className="px-3 py-2" />
            <GlassButton type="submit" className="px-4 py-2 w-auto border-emerald-300/30 bg-emerald-500/20">Add</GlassButton>
          </form>
        </GlassCard>
        <div className="flex flex-wrap gap-2">
          {subjects.map((s: any) => (
            <motion.div key={s.id} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
              <GlassCard className="px-3 py-1 flex items-center gap-2 rounded-full border-white/50 bg-white/40 shadow-sm">
                <span className="text-sm font-bold text-emerald-900">{s.name}</span>
                <button onClick={async () => {
                  if (window.confirm('Are you sure you want to delete this subject?')) {
                    await subjectService.delete(s.id);
                    await loadData();
                  }
                }} className="text-emerald-600 hover:text-red-500">
                  <X size={14} />
                </button>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
};
