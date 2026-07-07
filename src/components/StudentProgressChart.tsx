import React, { useState, useEffect } from 'react';
import { GlassCard } from './ui/Glass';
import { SearchableStudentSelect } from './SearchableStudentSelect';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { studentService } from '../services/studentService';
import { scoreService } from '../services/scoreService';
import { classService } from '../services/classService';

export const StudentProgressChart = () => {
  const [studentId, setStudentId] = useState('');
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [studentScores, setStudentScores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [s, c] = await Promise.all([
          studentService.getAll(),
          classService.getAll()
        ]);
        setStudents(s);
        setClasses(c);
      } catch (err) { console.error(err); }
      setLoading(false);
    };
    loadData();
  }, []);

  useEffect(() => {
    const fetchScores = async () => {
      if (!studentId) {
        setStudentScores([]);
        return;
      }
      try {
        const data = await scoreService.getAll({ student_id: parseInt(studentId) });
        setStudentScores(data);
      } catch (err) { console.error(err); }
    };
    fetchScores();
  }, [studentId]);

  const student = students.find((s: any) => String(s.id) === studentId);

  const chartData = React.useMemo(() => {
    if (!studentId || studentScores.length === 0) return [];

    const grouped: Record<string, number[]> = {};
    studentScores.forEach((score: any) => {
      const key = `${score.academic_year || 'Unknown'} - ${score.term || 'Term 1'}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(score.total);
    });

    return Object.keys(grouped)
      .sort()
      .map(key => {
        const totals = grouped[key];
        const avg = totals.reduce((a, b) => a + b, 0) / totals.length;
        return {
          termLabel: key.replace(" - ", "\n"),
          termName: key,
          average: parseFloat(avg.toFixed(2))
        };
      });
  }, [studentId, studentScores]);

  if (loading) return <div className="mt-8 pb-32"><p className="text-slate-500 italic">Loading...</p></div>;

  return (
    <div className="mt-8 pb-32">
      <GlassCard className="p-3 sm:p-4 mb-6 border-blue-200/50">
         <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0">
               <TrendingUp className="text-blue-600" size={16} />
            </div>
            <div>
               <h2 className="text-sm font-black text-slate-900 leading-tight">Academic Progress</h2>
               <p className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">Track student performance</p>
            </div>
         </div>
         <div className="max-w-md mb-4 relative z-50">
            <SearchableStudentSelect 
               label="Select Student"
               students={students}
               classes={classes}
               value={studentId}
               onChange={setStudentId}
               placeholder="Search name or ID..."
            />
         </div>

         {studentId && (
            chartData.length > 0 ? (
               <div className="h-64 w-full pt-4 mt-2">
                 <ResponsiveContainer width="100%" height="100%">
                   <BarChart
                     data={chartData}
                     margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                   >
                     <defs>
                       <linearGradient id="colorAverage" x1="0" y1="0" x2="0" y2="1">
                         <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.8}/>
                         <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.4}/>
                       </linearGradient>
                     </defs>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                     <XAxis 
                        dataKey="termName" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fontSize: 10, fill: '#64748b', fontWeight: 'bold'}} 
                        dy={10}
                     />
                     <YAxis 
                        domain={[0, 100]} 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fontSize: 10, fill: '#64748b', fontWeight: 'bold'}}
                     />
                     <Tooltip 
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)', backgroundColor: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(10px)' }}
                        formatter={(value: number) => [`${value}%`, 'Average']}
                        labelStyle={{ color: '#0f172a', fontWeight: 'black', marginBottom: '4px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                        itemStyle={{ color: '#4f46e5', fontWeight: 'bold', fontSize: '14px' }}
                     />
                     <Bar 
                        dataKey="average" 
                        fill="url(#colorAverage)" 
                        radius={[6, 6, 0, 0]}
                        barSize={30}
                     />
                   </BarChart>
                 </ResponsiveContainer>
               </div>
            ) : (
               <div className="text-center py-12 text-slate-500 italic bg-white/40 rounded-xl border border-white/50 shadow-sm backdrop-blur-sm -mt-2">
                  No academic records found.
               </div>
            )
         )}
         {!studentId && (
            <div className="text-center py-12 text-slate-400 bg-white/30 rounded-xl border border-white/40 shadow-sm backdrop-blur-sm uppercase tracking-widest text-[10px] font-black -mt-2">
               Select a student to view trend
            </div>
         )}
      </GlassCard>
    </div>
  );
};
