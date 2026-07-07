import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, User, X } from 'lucide-react';
import { cn } from '../lib/utils';

export interface Student {
  id?: number;
  name: string;
  gender: string;
  class_id: number;
  status?: string;
}

export interface ClassInfo {
  id: number;
  name: string;
}

interface SearchableStudentSelectProps {
  label: string;
  students: Student[];
  value: string;
  onChange: (id: string) => void;
  required?: boolean;
  placeholder?: string;
  sizing?: 'sm' | 'md' | 'lg';
  classes?: ClassInfo[];
}

export const SearchableStudentSelect: React.FC<SearchableStudentSelectProps> = ({
  label,
  students,
  value,
  onChange,
  required,
  placeholder = "Search by name or ID...",
  sizing = 'md',
  classes = []
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const getClassName = (cid: number) => {
    return classes.find(c => c.id === cid)?.name || 'Unknown Class';
  };

  const selectedStudent = students.find(s => String(s.id) === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredStudents = students.filter(s => {
    const term = searchTerm.toLowerCase();
    return (
      s.name.toLowerCase().includes(term) ||
      String(s.id).includes(term)
    );
  }).slice(0, 50);

  const handleSelect = (id: number) => {
    onChange(String(id));
    setIsOpen(false);
    setSearchTerm('');
  };

  const sizeClasses = {
    sm: "px-3 py-1.5 min-h-[36px] rounded-xl text-sm",
    md: "px-4 py-3 min-h-[48px] rounded-2xl text-base",
    lg: "px-5 py-4 min-h-[60px] rounded-2xl text-lg"
  };

  return (
    <div className="flex flex-col gap-1 w-full relative z-30" ref={containerRef}>
      {label && <label className="text-slate-700 text-xs ml-2 font-bold uppercase tracking-wider">{label}</label>}
      
      <div className="relative">
        {selectedStudent ? (
          <div className={cn("bg-white/50 border border-blue-200 flex items-center justify-between backdrop-blur-md shadow-sm", sizeClasses[sizing])}>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-[10px] sm:text-xs border border-blue-200 shrink-0">
                {selectedStudent.id}
              </div>
              <div className="flex flex-col items-start min-w-0">
                <span className={`font-bold text-slate-900 truncate ${sizing === 'sm' ? 'text-xs' : ''}`}>{selectedStudent.name}</span>
                <span className="text-[9px] sm:text-[10px] text-slate-500 font-bold uppercase tracking-widest truncate">{getClassName(selectedStudent.class_id)}</span>
              </div>
            </div>
            <button 
              type="button"
              onClick={() => onChange('')}
              className="text-slate-400 hover:text-red-500 transition-colors shrink-0 ml-2 p-1"
            >
              <X size={sizing === 'sm' ? 14 : 18} />
            </button>
          </div>
        ) : (
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 ${sizing === 'sm' ? 'w-4 h-4 left-2.5' : 'w-5 h-5 left-4'}`} />
            <input
              type="text"
              className={cn(
                "w-full bg-white/40 border border-white/50 text-slate-800 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-blue-500/50 backdrop-blur-md transition-all shadow-sm",
                sizeClasses[sizing],
                sizing === 'sm' ? 'pl-8' : 'pl-11',
                isOpen && "rounded-b-none border-b-transparent"
              )}
              placeholder={placeholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => setIsOpen(true)}
              required={required && !value}
            />
          </div>
        )}

        <AnimatePresence>
          {isOpen && !selectedStudent && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 right-0 max-h-60 overflow-y-auto bg-white/90 backdrop-blur-xl border border-white/50 border-t-0 rounded-b-2xl shadow-xl z-50 flex flex-col"
            >
              {filteredStudents.length > 0 ? (
                filteredStudents.map(student => (
                  <button
                    key={student.id}
                    type="button"
                    onClick={() => handleSelect(student.id!)}
                    className="w-full px-4 py-2 sm:py-3 flex items-center gap-3 hover:bg-blue-500/10 transition-colors border-b border-white/40 last:border-0"
                  >
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-[10px] sm:text-xs border border-slate-200 shrink-0">
                      {student.id}
                    </div>
                    <div className="flex flex-col items-start min-w-0">
                      <span className={`font-bold text-slate-900 truncate ${sizing === 'sm' ? 'text-xs' : 'text-sm'}`}>{student.name}</span>
                      <span className="text-[9px] sm:text-[10px] text-slate-500 font-bold uppercase tracking-widest truncate">{getClassName(student.class_id)}</span>
                    </div>
                  </button>
                ))
              ) : (
                <div className="px-4 py-6 text-center text-slate-500 text-sm font-medium">
                  No students found matching your search.
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
