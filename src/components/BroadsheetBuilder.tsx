import React from 'react';

export const BroadsheetBuilder = ({ 
  students, 
  subjects, 
  scores, 
  schoolProfile, 
  className,
  term,
  academicYear,
  classTeacher
}: any) => {

  const hasLogo = !!schoolProfile?.logo;
  const now = new Date();
  const formattedDateDate = now.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
  const formattedDateTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const getOrdinalNum = (n: number | string) => {
    const num = Number(n);
    if (isNaN(num)) return n;
    const s = ["th", "st", "nd", "rd"];
    const v = num % 100;
    return num + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  return (
    <div className="w-[1122px] bg-white text-slate-800 p-4 sm:p-8 mx-auto relative font-sans box-border">
      
      {/* Outer border wrapper matching PDF */}
      <div className="border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-8 relative flex flex-col bg-white">
          {/* Watermark */}
          {hasLogo && (
             <div className="absolute inset-0 z-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
                <img src={schoolProfile.logo} className="w-[500px] grayscale" alt="watermark" />
             </div>
          )}

          <div className="relative z-10 w-full flex flex-col h-full">
            {/* Header */}
            <div className="flex justify-between items-start pb-6 border-b border-slate-200 mb-6">
               <div className="flex items-center gap-4">
                 {hasLogo && (
                   <div className="w-16 h-16 shrink-0 flex items-center justify-center rounded-full border border-slate-200 p-1">
                      <img src={schoolProfile.logo} alt="Logo" className="w-full h-full object-contain rounded-full" />
                   </div>
                 )}
                 <div className="flex flex-col">
                   <h1 className="text-[22px] font-black text-slate-900 tracking-wide uppercase">{schoolProfile?.name || 'Academic Institution'}</h1>
                   <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                     {schoolProfile?.address || 'POST OFFICE BOX'} {schoolProfile?.location && `• ${schoolProfile.location}`}
                   </p>
                 </div>
               </div>
               
               <div className="flex flex-col items-end">
                 <div className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-6 py-2 rounded-lg text-sm font-black uppercase tracking-widest shadow-sm">
                   CLASS BROADSHEET
                 </div>
                 <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                   GENERATED: {formattedDateDate} • {formattedDateTime}
                 </div>
               </div>
            </div>

            {/* Subheader */}
            <div className="flex justify-between items-center mb-6">
               <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1">CLASS / FORM</p>
                  <p className="text-2xl font-bold text-slate-800 uppercase tracking-tight">{className || 'N/A'}</p>
               </div>
               <div className="text-right">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1">CLASS TEACHER</p>
                  <p className="text-lg font-bold text-slate-800 uppercase tracking-tight">{classTeacher || 'N/A'}</p>
               </div>
            </div>

            {/* Data Table */}
            <div className="flex-grow rounded-xl border border-slate-200 overflow-hidden shadow-sm bg-white mb-8">
               <table className="w-full text-xs text-left border-collapse">
                 <thead>
                   <tr className="bg-slate-50 text-slate-700 border-b-2 border-slate-200">
                     <th className="py-2 px-4 font-black uppercase tracking-widest text-[10px] border-r border-slate-200 w-auto min-w-[200px] align-middle">STUDENT NAME</th>
                     {subjects.map((sub: any) => {
                       let subName = sub.name ? sub.name.trim() : '';
                       const lowerName = subName.toLowerCase();
                       
                       if (lowerName === 'english language' || lowerName.includes('english lang')) subName = 'English';
                       else if (lowerName === 'social studies' || lowerName.includes('social stud')) subName = 'Social';
                       else if (lowerName === 'religious and moral education' || lowerName === 'rme' || lowerName.includes('religious')) subName = 'RME';
                       else if (lowerName === 'ghanaian language' || lowerName.includes('ghanaian')) subName = 'Twi';
                       else if (lowerName === 'career technology' || lowerName.includes('career tech')) subName = 'Career';
                       else if (lowerName === 'creative arts' || lowerName.includes('creative art')) subName = 'Creative';

                       return (
                       <th key={sub.id} className="py-2 px-2 text-center border-r border-slate-200 align-middle">
                         <div className="font-bold text-[9px] uppercase tracking-wider leading-tight text-slate-700 whitespace-nowrap">
                            {subName}
                         </div>
                       </th>
                       );
                     })}
                     <th className="py-2 px-3 text-center align-middle font-black text-[10px] uppercase tracking-widest bg-indigo-50 border-r border-indigo-100 text-indigo-700">AVG %</th>
                     <th className="py-2 px-3 text-center align-middle font-black text-[10px] uppercase tracking-widest bg-emerald-50 border-emerald-100 text-emerald-700">POS</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-200">
                   {students.map((student: any) => {
                     let total = 0;
                     let subjCount = 0;
                     
                     const cells = subjects.map((sub: any) => {
                       const sc = scores.find((s: any) => s.student_id === student.id && s.subject_id === sub.id);
                       if (sc && Number(sc.exam_score) >= 0 && Number(sc.class_score) >= 0) {
                         const t = Number(sc.exam_score) + Number(sc.class_score);
                         total += t;
                         subjCount++;
                         return <td key={sub.id} className="py-1 px-2 text-center text-sm font-bold text-slate-700 border-r border-slate-200">{t}</td>;
                       }
                       return <td key={sub.id} className="py-1 px-2 text-center text-sm text-slate-300 font-medium border-r border-slate-200">-</td>;
                     });

                     const avg = student.rankScore !== undefined ? student.average.toFixed(1) : (subjCount > 0 ? (total / subjects.length).toFixed(1) : '-');

                     return (
                       <tr key={student.id} className="bg-white hover:bg-slate-50 transition-colors">
                          <td className="py-1 px-4 font-bold text-xs text-slate-800 uppercase border-r border-slate-200 whitespace-nowrap" title={student.name}>{student.name}</td>
                          {cells}
                          <td className="py-1 px-3 text-center text-sm font-black text-indigo-700 border-r border-slate-200 bg-indigo-50/30">{avg !== '-' ? `${avg}%` : '-'}</td>
                          <td className="py-1 px-3 text-center text-sm font-black text-emerald-600 bg-emerald-50/30">{student.position ? getOrdinalNum(student.position) : '-'}</td>
                       </tr>
                     );
                   })}
                 </tbody>
               </table>
            </div>

            {/* Footer */}
            <div className="mt-16 relative">
               {/* Center watermark text */}
               <div className="absolute left-1/2 bottom-0 -translate-x-1/2 text-center w-full pb-4 pointer-events-none">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                    GENERATED BY {schoolProfile?.name || 'SCHOOL SYSTEM'} • OFFICIAL BROADSHEET RECORD
                  </span>
               </div>

               <div className="flex justify-end items-end pb-8">

                 {/* Right Signature */}
                 <div className="w-56 text-right relative">
                    {schoolProfile?.principalSignature && (
                      <img src={schoolProfile.principalSignature} alt="Principal Signature" className="absolute bottom-10 right-0 max-h-16 object-contain z-10" />
                    )}
                    <div className="h-px bg-slate-400 mb-2 w-full"></div>
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">HEADMASTER'S SIGNATURE</div>
                 </div>
               </div>
            </div>
          </div>
      </div>
    </div>
  );
};

