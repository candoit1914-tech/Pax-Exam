import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { GlassCard } from '../components/ui/Glass';
import { Users, BookOpen, GraduationCap, Trophy, TrendingDown } from 'lucide-react';
import { rankStudents } from '../utils/ranking';
import { StudentProgressChart } from '../components/StudentProgressChart';
import { studentService } from '../services/studentService';
import { classService } from '../services/classService';
import { subjectService } from '../services/subjectService';
import { scoreService } from '../services/scoreService';

export const DashboardScreen = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [topPerformer, setTopPerformer] = useState<any>(null);
  const [lowestPerformer, setLowestPerformer] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const startTime = Date.now();
      try {
        const [studentsData, classesData, subjectsData] = await Promise.all([
          studentService.getAll({ status: 'active' }),
          classService.getAll(),
          subjectService.getAll(),
        ]);
        setStudents(studentsData);
        setClasses(classesData);
        setSubjects(subjectsData);

        const studentIds = new Set(studentsData.map((s: any) => s.id));
        if (studentsData.length > 0) {
          try {
            const scores = await scoreService.getAll();
            const filteredScores = Array.isArray(scores)
              ? scores.filter((s: any) => studentIds.has(s.student_id))
              : [];

            if (filteredScores.length > 0) {
              const studentAverages = studentsData.map((s: any) => {
                const studentScores = filteredScores.filter((sc: any) => sc.student_id === s.id);
                const total = studentScores.reduce((sum: number, sc: any) => sum + (Number(sc.total) || 0), 0);
                const avg = studentScores.length ? total / studentScores.length : 0;
                const examTotal = studentScores.reduce((sum: number, sc: any) => sum + (Number(sc.exam_score) || 0), 0) * 2;
                return { id: s.id, name: s.name, average: avg, rankScore: examTotal };
              });
              const ranked = rankStudents(studentAverages);
              setTopPerformer(ranked.length > 0 && ranked[0].average > 0 ? ranked[0] : null);
              const lowest = ranked.filter((s: any) => s.average > 0);
              setLowestPerformer(lowest.length > 0 ? lowest[lowest.length - 1] : null);
            }
          } catch (scoreErr) {
            console.error('Failed to load scores for dashboard:', scoreErr);
          }
        }

        console.log(`Dashboard loaded in ${Date.now() - startTime}ms`);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const stats = [
    { label: 'Total Students', value: students.length, icon: Users, color: 'text-blue-800', bg: 'bg-blue-500/20' },
    { label: 'Classes', value: classes.length, icon: BookOpen, color: 'text-indigo-800', bg: 'bg-indigo-500/20' },
    { label: 'Subjects', value: subjects.length, icon: GraduationCap, color: 'text-emerald-800', bg: 'bg-emerald-500/20' }
  ];

  if (loading) return <div className="p-6 pt-4"><p className="text-slate-500">Loading dashboard...</p></div>;

  const renderStatCard = (stat: typeof stats[0], delay: number) => (
    <motion.div key={stat.label} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay }}>
      <GlassCard className="p-2 md:p-3 flex items-center justify-between relative overflow-hidden group gap-2">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg ${stat.bg} flex items-center justify-center shrink-0`}>
            {React.createElement(stat.icon, { className: stat.color, size: 16 })}
          </div>
          <p className="text-slate-700 text-[10px] md:text-xs font-bold uppercase tracking-widest">{stat.label}</p>
        </div>
        <p className="text-xl md:text-2xl font-black text-slate-900 leading-tight pr-2">{stat.value}</p>
        <div className="absolute right-0 top-0 w-24 h-full bg-gradient-to-l from-white/40 to-transparent rounded-r-lg group-hover:from-white/60 transition-colors" />
      </GlassCard>
    </motion.div>
  );

  return (
    <div className="p-6 pt-4 flex flex-col gap-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4">
        {renderStatCard(stats[0], 0)}
        <div className="grid grid-cols-2 gap-2 md:gap-0 md:contents">
          {renderStatCard(stats[1], 0.1)}
          {renderStatCard(stats[2], 0.2)}
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex flex-col md:flex-row gap-3 mt-2">
        <GlassCard className="p-2 md:p-3 relative overflow-hidden flex items-center justify-between flex-1">
          <div className="flex items-center gap-3 relative z-10 w-full">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-yellow-400/20 border border-yellow-400/50 rounded-lg flex items-center justify-center shrink-0">
              <Trophy className="text-yellow-600" size={16} />
            </div>
            <div className="flex-1">
              <p className="text-[9px] md:text-[10px] text-yellow-600 font-bold uppercase tracking-widest mb-0.5">Top Performer</p>
              {topPerformer && topPerformer.average > 0 ? (
                <div className="flex items-center justify-between">
                  <p className="text-xs md:text-sm font-bold text-slate-900 truncate">{topPerformer.name}</p>
                  <p className="text-emerald-600 text-[10px] md:text-xs font-black">{topPerformer.average.toFixed(2)}%</p>
                </div>
              ) : (
                <p className="text-slate-500 italic text-[10px]">No scores yet</p>
              )}
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-2 md:p-3 relative overflow-hidden flex items-center justify-between flex-1">
          <div className="flex items-center gap-3 relative z-10 w-full">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-red-400/20 border border-red-400/50 rounded-lg flex items-center justify-center shrink-0">
              <TrendingDown className="text-red-500" size={16} />
            </div>
            <div className="flex-1">
              <p className="text-[9px] md:text-[10px] text-red-500 font-bold uppercase tracking-widest mb-0.5">Needs Attention</p>
              {lowestPerformer ? (
                <div className="flex items-center justify-between">
                  <p className="text-xs md:text-sm font-bold text-slate-900 truncate">{lowestPerformer.name}</p>
                  <p className="text-red-600 text-[10px] md:text-xs font-black">{lowestPerformer.average.toFixed(2)}%</p>
                </div>
              ) : (
                <p className="text-slate-500 italic text-[10px]">No scores yet</p>
              )}
            </div>
          </div>
        </GlassCard>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <StudentProgressChart />
      </motion.div>
    </div>
  );
};
