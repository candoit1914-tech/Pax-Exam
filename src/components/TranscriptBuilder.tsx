import React from 'react';
import { calculateAverage } from '../utils/ranking';
import { getGrade, getGradePoint } from '../utils/grading';

export const TranscriptBuilder = ({ student, allScores, schoolProfile }: any) => {
  if (!student) return null;

  const studentScores = allScores.filter((s:any) => s.student_id === student.id);
  
  // Group by academic year and term
  const history: Record<string, Record<string, any[]>> = {};
  studentScores.forEach((s: any) => {
    const yr = s.academic_year || 'Unknown Year';
    const tm = s.term || 'Unknown Term';
    if (!history[yr]) history[yr] = {};
    if (!history[yr][tm]) history[yr][tm] = [];
    history[yr][tm].push(s);
  });

  const years = Object.keys(history).sort();

  return (
    <div className="w-[800px] h-[1120px] bg-white relative text-slate-800 flex flex-col mx-auto border-[16px] border-double border-green-600" style={{ padding: '40px', boxSizing: 'border-box' }}>
      {/* Watermark */}
      <div className="absolute inset-0 pointer-events-none z-0 flex items-center justify-center overflow-hidden" style={{ userSelect: 'none' }}>
        {schoolProfile.logo ? (
          <img src={schoolProfile.logo} className="w-[60%] max-w-md opacity-[0.05] grayscale" alt="Watermark" />
        ) : null}
      </div>

      <div className="relative z-10 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center gap-6 border-b-4 border-double border-slate-300 pb-6 mb-6">
          {schoolProfile.logo ? (
            <img src={schoolProfile.logo} className="w-24 h-24 object-contain" alt="Logo" />
          ) : (
            <div className="w-24 h-24 bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-400">LOGO</div>
          )}
          <div className="flex-1">
            <h1 className="text-3xl font-black uppercase text-slate-900 tracking-wider mb-2">{schoolProfile.name || 'Ok20'}</h1>
            <p className="text-sm font-semibold text-slate-600">{schoolProfile.address} | {schoolProfile.location}</p>
            <p className="text-sm font-semibold text-slate-600">{schoolProfile.phone} | {schoolProfile.email}</p>
            <div className="inline-block px-4 py-1 bg-slate-800 text-white font-bold tracking-widest text-sm mt-3">OFFICIAL ACADEMIC TRANSCRIPT</div>
          </div>
        </div>

        {/* Student Info */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 bg-slate-50 border border-slate-200 p-4 rounded-xl mb-6">
          <div className="col-span-2 lg:col-span-1">
            <p className="text-xs font-bold text-slate-500 uppercase">Student Name</p>
            <p className="font-black text-lg text-slate-900">{student.name}</p>
          </div>
          <div>
             <p className="text-xs font-bold text-slate-500 uppercase">Gender / Reg No.</p>
             <p className="font-black text-lg text-slate-900">{student.gender} / {student.id.toString().padStart(4, '0')}</p>
          </div>
          <div>
             <p className="text-xs font-bold text-slate-500 uppercase">Year of Admission</p>
             <p className="font-black text-lg text-slate-900">{student.admission_year || 'N/A'}</p>
          </div>
          <div>
             <p className="text-xs font-bold text-slate-500 uppercase">Status</p>
             <p className="font-black text-lg text-slate-900">{student.status === 'completed' ? 'Graduated' : 'Active'}</p>
          </div>
          <div>
             <p className="text-xs font-bold text-slate-500 uppercase">Cum. GPA</p>
             <p className="font-black text-lg text-indigo-700">{allScores && allScores.length > 0 ? (allScores.reduce((acc: number, s: any) => acc + getGradePoint(s.grade), 0) / allScores.length).toFixed(2) : 'N/A'}</p>
          </div>
        </div>

        {/* Academic History */}
        <div className="flex-1 flex flex-col gap-6 overflow-hidden">
          {years.length === 0 ? (
            <div className="text-center py-20 text-slate-500 font-bold uppercase">No academic records found</div>
          ) : (
             years.map(yr => (
               <div key={yr}>
                 <h2 className="text-lg font-black bg-slate-200 px-3 py-1 mb-2 border-l-4 border-slate-800">{yr}</h2>
                 <div className="flex gap-4">
                   {['Term 1', 'Term 2', 'Term 3'].map(tm => {
                      const tScores = history[yr][tm] || [];
                     const hasScores = tScores.length > 0;
                     const avg = hasScores ? Number((tScores.reduce((acc: number, s: any) => acc + s.total, 0) / tScores.length).toFixed(2)) : 0;
                     const gpa = hasScores ? Number((tScores.reduce((acc: number, s: any) => acc + getGradePoint(s.grade), 0) / tScores.length).toFixed(2)) : 0;
                     return (
                       <div key={tm} className="flex-1 border border-slate-200 p-2 rounded-lg bg-white shadow-sm flex flex-col h-full">
                         <h3 className="text-xs font-bold text-slate-700 uppercase mb-2 border-b border-slate-100 pb-1">{tm}</h3>
                         {hasScores ? (
                           <ul className="flex flex-col gap-1 flex-1">
                             {tScores.map((score: any) => (
                               <li key={score.id} className="flex justify-between items-start text-[11px]">
                                 <span className="flex-1 text-slate-600 font-semibold leading-tight pr-1 break-words pb-0.5">{score.subjectName}</span>
                                 <span className="font-black text-slate-900 shrink-0">{score.total} <span className="text-[9px] text-slate-400 font-normal">({score.grade})</span></span>
                               </li>
                             ))}
                           </ul>
                         ) : (
                           <div className="flex-1 flex items-center justify-center text-[10px] text-slate-400 italic">No records</div>
                         )}
                         {hasScores && (
                           <div className="mt-2 pt-2 border-t border-slate-100 flex flex-col items-center bg-slate-50 p-1 rounded gap-1">
                             <div className="flex justify-between items-center w-full">
                               <span className="text-[10px] font-bold text-slate-500 uppercase">Average</span>
                               <span className="font-black text-sm text-slate-800">{avg}%</span>
                             </div>
                             <div className="flex justify-between items-center w-full border-t border-slate-200/50 pt-1">
                               <span className="text-[10px] font-bold text-slate-500 uppercase">GPA</span>
                               <span className="font-black text-sm text-slate-800">{gpa.toFixed(2)}</span>
                             </div>
                           </div>
                         )}
                       </div>
                     )
                   })}
                 </div>
               </div>
             ))
          )}
        </div>

        {/* Footer */}
        <div className="mt-auto pt-6 border-t border-slate-200 flex justify-between items-end text-center">
            <div className="w-48 text-center shrink-0">
               <p className="text-xs text-slate-500 font-bold uppercase mb-8">Generated On</p>
               <p className="font-bold text-slate-800 border-b border-slate-300 pb-1">{new Date().toLocaleDateString()}</p>
            </div>

            <div className="w-24 h-24 rounded-full flex items-center justify-center relative shrink-0 shadow-md border-[2px] border-amber-600 bg-gradient-to-br from-amber-300 via-amber-500 to-amber-700">
                <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 flex gap-2 -z-10">
                  <div className="w-5 h-10 bg-red-700 shadow-md transform origin-top rotate-[15deg] ml-[-12px]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%)' }}></div>
                  <div className="w-5 h-10 bg-red-700 shadow-md transform origin-top -rotate-[15deg] mr-[-12px]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%)' }}></div>
                </div>
                <div className="absolute inset-[3px] rounded-full border border-amber-300 border-dashed opacity-70"></div>
                <div className="absolute inset-[6px] rounded-full border-2 border-amber-700 flex items-center justify-center bg-gradient-to-tl from-amber-600 to-amber-400 shadow-inner">
                  <div className="absolute inset-[2px] rounded-full border border-amber-200 border-dotted opacity-60"></div>
                  <div className="text-[10px] font-black uppercase text-amber-900 text-center leading-[1.2] tracking-widest transform -rotate-12">
                    Official<br/>
                    <span className="text-amber-100 text-[12px] drop-shadow-md inline-block my-0.5">★</span><br/>
                    Seal
                  </div>
                </div>
            </div>

            <div className="w-48 text-center shrink-0">
               <p className="text-xs text-slate-500 font-bold uppercase mb-4">Headmaster Signature</p>
               {schoolProfile.principalSignature ? (
                 <img src={schoolProfile.principalSignature} className="h-10 object-contain mx-auto mb-1" alt="Signature" />
               ) : (
                 <div className="h-10 mb-1"></div>
               )}
               <div className="font-bold text-slate-800 border-b border-slate-300 pb-1">Headmaster</div>
            </div>
        </div>
      </div>
    </div>
  );
};
