import React from 'react';
import { motion } from 'motion/react';
import { X, User, Phone, Calendar, Hash, GraduationCap, FileText, Award } from 'lucide-react';
export interface ClassInfo { id: number; name: string; }
import { getGradePoint } from '../utils/grading';
import { calculateAge } from '../lib/utils';

interface StudentProfileModalProps {
  student: any;
  allScores?: any[];
  allStudents?: any[];
  subjects?: any[];
  classes: ClassInfo[];
  onClose: () => void;
  onViewDocument?: (docType: string) => void;
  onTransition?: (student: any) => void;
}

export const StudentProfileModal: React.FC<StudentProfileModalProps> = ({ student, allScores, classes, onClose, onViewDocument, onTransition }) => {
  if (!student) return null;

  const getClassName = (cid: number) => classes.find(c => c.id === cid)?.name || 'Unknown';
  const isActive = student.status !== 'completed';
  
  const studentScores = allScores?.filter(s => s.student_id === student.id) || [];
  const gpa = studentScores.length > 0 
      ? Number((studentScores.reduce((acc, s) => acc + getGradePoint(s.grade), 0) / studentScores.length).toFixed(2)) 
      : 0;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 sm:p-6" onClick={onClose}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col relative"
      >
        <div 
          className="w-full h-80 relative bg-indigo-50 flex items-center justify-center shrink-0"
          style={{ clipPath: 'polygon(15% 0, 85% 0, 100% 100%, 0% 100%)' }}
        >
          {student.photo ? (
            <img src={student.photo} alt={student.name} className="w-full h-full object-contain" />
          ) : (
            <User size={100} className="text-indigo-200" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent pointer-events-none"></div>
          
          <button onClick={onClose} className="absolute top-4 right-4 z-20 p-2 bg-black/40 hover:bg-black/60 backdrop-blur-md text-white rounded-full transition-colors">
            <X size={20} />
          </button>

          <div className="absolute bottom-6 left-6 right-6">
            <div className="flex items-center gap-2 mb-1">
              {isActive ? (
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 font-black text-[9px] uppercase tracking-widest rounded-md backdrop-blur-md border border-emerald-500/30">Active</span>
              ) : (
                <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 font-black text-[9px] uppercase tracking-widest rounded-md flex items-center gap-1 backdrop-blur-md border border-blue-500/30"><GraduationCap size={10}/> Completed</span>
              )}
            </div>
            <h1 className="text-3xl font-black text-white leading-tight drop-shadow-md">{student.name}</h1>
          </div>
        </div>

        <div className="px-6 flex flex-col pb-6 pt-4">
           <div className="flex gap-2 flex-wrap mb-4 border-b border-slate-100 pb-4">
              <span className="px-3 py-1 bg-slate-100 text-slate-700 font-black text-xs uppercase tracking-widest rounded-full flex items-center gap-1 shadow-sm">
                <Hash size={12} /> {student.id}
              </span>
              <span className="px-3 py-1 bg-indigo-50 text-indigo-700 font-black text-xs uppercase tracking-widest rounded-full shadow-sm">
                {getClassName(student.class_id)}
              </span>
              <span className="px-3 py-1 bg-slate-100 text-slate-700 font-black text-xs uppercase tracking-widest rounded-full shadow-sm border border-slate-200">
                {student.gender}
              </span>
           </div>

           <div className="flex gap-2 mb-4">
              {onTransition && (
                <button onClick={() => onTransition(student)} className="flex-1 py-2 px-3 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-1.5 transition-colors shadow-md">
                  <GraduationCap size={14} /> Move Class
                </button>
              )}
              {onViewDocument && (
                <>
                  <button onClick={() => onViewDocument('transcript')} className="flex-1 py-2 px-3 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-1.5 transition-colors">
                    <FileText size={14} /> Transcript
                  </button>
                  <button onClick={() => onViewDocument('certificate')} className="flex-1 py-2 px-3 bg-amber-50 text-amber-600 hover:bg-amber-100 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-1.5 transition-colors">
                    <Award size={14} /> Certificate
                  </button>
                </>
              )}
           </div>

           <div className="flex flex-col gap-3 mb-6">
              <div className="flex items-center gap-4 bg-slate-50 hover:bg-slate-100 transition-colors cursor-default p-3 rounded-2xl border border-slate-100/50 shadow-sm">
                 <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                    <Award size={18} />
                 </div>
                 <div>
                    <p className="text-[9px] uppercase tracking-widest text-slate-400 font-bold mb-0.5">Overall Cumulative GPA</p>
                    <p className="font-black text-slate-800 text-xl leading-tight">{gpa.toFixed(2)}</p>
                 </div>
              </div>

              <div className="flex items-center gap-4 bg-slate-50 hover:bg-slate-100 transition-colors cursor-default p-3 rounded-2xl border border-slate-100/50 shadow-sm">
                 <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                    <Phone size={18} />
                 </div>
                 <div>
                    <p className="text-[9px] uppercase tracking-widest text-slate-400 font-bold mb-0.5">Parent / Guardian</p>
                    <p className="font-bold text-slate-800 text-sm leading-tight">{student.parent_name || 'Not provided'}</p>
                    {student.parent_phone && <p className="text-emerald-600 font-bold text-[11px] mt-0.5">{student.parent_phone}</p>}
                 </div>
              </div>

              <div className="flex items-center gap-4 bg-slate-50 hover:bg-slate-100 transition-colors cursor-default p-3 rounded-2xl border border-slate-100/50 shadow-sm">
                 <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                    <Calendar size={18} />
                 </div>
                 <div>
                    <p className="text-[9px] uppercase tracking-widest text-slate-400 font-bold mb-0.5">Admission Year</p>
                    <p className="font-black text-slate-800 text-sm leading-tight">{student.admission_year || 'Unknown'}</p>
                 </div>
              </div>

              {student.dob && (
                <div className="flex items-center gap-4 bg-slate-50 hover:bg-slate-100 transition-colors cursor-default p-3 rounded-2xl border border-slate-100/50 shadow-sm">
                   <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                      <Calendar size={18} />
                   </div>
                   <div>
                      <p className="text-[9px] uppercase tracking-widest text-slate-400 font-bold mb-0.5">Age</p>
                      <p className="font-black text-slate-800 text-sm leading-tight">{calculateAge(student.dob)} Years</p>
                   </div>
                </div>
              )}
           </div>

           <button 
             onClick={onClose} 
             className="w-full py-3 bg-slate-900 text-white rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-slate-800 transition-colors shadow-lg"
           >
             Close Profile
           </button>
        </div>
      </motion.div>
    </div>
  );
}
