import React from 'react';
import { getRemark, getGradePoint } from '../utils/grading';

export const ReportCard = ({ 
  student, 
  studentScores, 
  myRanking, 
  totalInClass, 
  myClass, 
  schoolProfile, 
  getSubjectName,
  term = 'Current Term',
  academicYear = 'Current Year',
  reportTeacher = ''
}: any) => {

  const displayTeacherName = reportTeacher ? reportTeacher : (myClass?.teacher_name && myClass.teacher_name.toLowerCase() !== 'not assigned' ? myClass.teacher_name : 'Not assigned');

  const generateRemark = (firstName: string, avg: number) => {
    if (avg >= 85) return `${firstName} is an outstanding student who consistently strives for academic excellence.`;
    if (avg >= 75) return `${firstName} has shown commendable progress and great dedication to studies.`;
    if (avg >= 60) return `${firstName} is working hard, but there is still room to improve on overall performance.`;
    if (avg >= 50) return `${firstName} needs to put in more effort to achieve better results next term.`;
    return `${firstName}'s academic progress has been slow and requires urgent academic intervention and focus.`;
  };

  const getOrdinalNum = (n: number | string) => {
    const num = Number(n);
    if (isNaN(num)) return n;
    const s = ["th", "st", "nd", "rd"];
    const v = num % 100;
    return num + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  const firstName = student?.name?.split(' ')[0] || 'Student';
  const autoRemark = generateRemark(firstName, myRanking?.average || 0);

  const sumExamScore = studentScores?.reduce((acc: number, curr: any) => acc + (Number(curr.exam_score) || 0), 0) || 0;
  const totalExamScoreValue = sumExamScore * 2;
  const gpa = studentScores?.length ? Number((studentScores.reduce((acc: number, curr: any) => acc + getGradePoint(curr.grade), 0) / studentScores.length).toFixed(2)) : 0.0;

  return (
    <div className="w-full bg-[#ffffff] text-[#0f172a] font-sans relative p-2 sm:p-4 overflow-hidden z-0">
      
      {/* HTML Wavy Watermark for PDF Compatibility */}
      <div className="absolute inset-0 pointer-events-none z-0 flex items-center justify-center overflow-hidden" style={{ userSelect: 'none' }}>
        {schoolProfile.logo ? (
          <img src={schoolProfile.logo} className="w-[80%] max-w-lg opacity-[0.05] grayscale" alt="Watermark" />
        ) : (
          <div className="opacity-[0.04] flex flex-col justify-center w-full h-full">
            {Array.from({ length: 15 }).map((_, i) => (
              <div key={i} className="flex whitespace-nowrap text-[#0f172a] font-black text-2xl" style={{ transform: `rotate(-20deg) translateY(${i * 100 - 800}px) translateX(-200px)`, letterSpacing: '6px' }}>
                {Array.from({ length: 12 }).map((_, j) => (
                    <span key={j} style={{ display: 'inline-block', transform: `translateY(${Math.sin(j) * 25}px)`, marginRight: '60px' }}>
                      {schoolProfile.name || 'OCE jhs'}
                    </span>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Elegant Double Border Outline */}
      <div className="border-[3px] border-green-600 p-1 h-full rounded relative z-10 flex flex-col" style={{ backgroundColor: 'rgba(255, 255, 255, 0.4)' }}>
        <div className="border border-green-600 py-4 px-4 sm:px-6 h-full flex-1 flex flex-col rounded relative">
      
          {/* Header */}
          <div className="flex flex-col mb-3 pb-3 border-b-4 border-[#cbd5e1]">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4 w-full">
              <div className="flex items-start gap-4 sm:gap-6 flex-1 min-w-0">
                {schoolProfile.logo ? (
                  <img src={schoolProfile.logo} className="w-20 h-20 object-contain rounded-lg border border-[#e2e8f0] shrink-0" alt="School Logo" />
                ) : (
                  <div className="w-20 h-20 bg-[#f8fafc] rounded-lg flex items-center justify-center text-[#94a3b8] font-bold border border-[#e2e8f0] shrink-0 text-center leading-tight p-1">
                    <div className="uppercase tracking-widest text-[7px] font-black text-[#0f172a]">{schoolProfile.name}</div>
                    {schoolProfile.address && <div className="text-[6px] text-[#475569] font-semibold mt-0.5 leading-tight">{schoolProfile.address}</div>}
                    {schoolProfile.location && <div className="text-[6px] text-[#475569] font-medium leading-tight">{schoolProfile.location}</div>}
                  </div>
                )}
                <div className="flex flex-col items-start min-w-0">
                  <div className="flex items-start gap-4 w-full">
                    <div className="flex flex-col">
                      <h1 className="text-xl sm:text-2xl font-black text-[#0f172a] uppercase tracking-widest leading-none whitespace-nowrap">{schoolProfile.name}</h1>
                      {schoolProfile.address && <p className="text-[11px] text-[#475569] font-semibold leading-none mt-1.5">{schoolProfile.address}</p>}
                      {schoolProfile.location && <p className="text-[11px] text-[#475569] font-medium leading-none mt-0.5">{schoolProfile.location}</p>}
                    </div>
                    {student?.photo && (
                      <img src={student.photo} className="w-20 h-20 rounded-md object-cover border border-[#cbd5e1] shrink-0 sm:hidden" alt="Student Thumbnail" />
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right flex flex-col items-end shrink-0 sm:ml-4 w-full sm:w-auto">
                <div className="flex items-start justify-end gap-4 w-full mb-2">
                  {student?.photo && (
                    <img src={student.photo} className="w-24 h-24 rounded-md object-cover border border-[#cbd5e1] shrink-0 hidden sm:block" alt="Student Thumbnail" />
                  )}
                </div>
              </div>
            </div>
            <div className="flex justify-between items-end w-full mt-2">
              <div className="bg-[#1e293b] text-[#ffffff] px-4 py-2 rounded font-black tracking-widest uppercase text-xs inline-block shadow-sm">
                Academic Transcript
              </div>
              <div className="text-[10px] text-[#64748b] font-bold uppercase text-right flex gap-4">
                <p>Term: {term}</p>
                <p>Year: {academicYear}</p>
                <p>Date: {new Date().toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center w-full mb-3 mt-2">
             <p className="text-[10px] text-[#64748b] font-bold uppercase text-left">Teacher: <span className="capitalize font-black text-[#0f172a] text-[13px]">{displayTeacherName}</span></p>
             <p className="text-[11px] text-[#64748b] font-bold uppercase text-right">Total Exam Score: <span className="font-black text-[#2563eb] text-[13px]">{totalExamScoreValue}</span></p>
          </div>

          {/* Student Info Card */}
          <div className="flex items-center justify-between bg-[#f8fafc] border border-[#e2e8f0] px-6 py-3 rounded-lg mb-3">
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-[9px] uppercase tracking-widest font-bold text-[#94a3b8] mb-1">Student Particulars</p>
                  <p className="text-base font-black text-[#0f172a]">{student?.name}</p>
                  <p className="text-xs text-[#475569] font-bold mt-1">{student?.gender} <span className="mx-1 text-[#cbd5e1]">•</span> {myClass?.name}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[9px] uppercase tracking-widest font-bold text-[#94a3b8] mb-1">Overall Performance</p>
                <p className="text-xl font-black text-[#2563eb]">{myRanking?.average ? myRanking.average.toFixed(2) : '0'}% <span className="text-sm font-bold text-[#64748b] ml-1">(GPA: {gpa.toFixed(2)})</span></p>
                <p className="text-xs text-[#475569] font-bold mt-1">Class Pos: {myRanking?.position ? getOrdinalNum(myRanking.position) : '-'} out of {totalInClass}</p>
              </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse mb-3">
              <thead>
                <tr className="border-b-2 border-[#1e293b] bg-[#f8fafc]">
                  <th className="py-2 px-2 text-[10px] uppercase tracking-widest font-bold text-[#475569]">Subject</th>
                  <th className="py-2 px-2 text-[10px] uppercase tracking-widest font-bold text-[#475569] text-center border-l border-[#e2e8f0]">Class (50)</th>
                  <th className="py-2 px-2 text-[10px] uppercase tracking-widest font-bold text-[#475569] text-center">Exam (50)</th>
                  <th className="py-2 px-2 text-[10px] uppercase tracking-widest font-black text-[#0f172a] text-center border-l border-[#e2e8f0]">Total</th>
                  <th className="py-2 px-2 text-[10px] uppercase tracking-widest font-bold text-[#475569] text-center border-l border-[#e2e8f0]">Pos</th>
                  <th className="py-2 px-2 text-[10px] uppercase tracking-widest font-black text-[#0f172a] text-center">Grade</th>
                  <th className="py-2 px-2 text-[10px] uppercase tracking-widest font-bold text-[#475569] border-l border-[#e2e8f0]">Remark</th>
                </tr>
              </thead>
              <tbody>
                {studentScores && studentScores.length > 0 ? (
                  studentScores.map((score: any) => (
                    <tr key={score.id} className="border-b border-[#e2e8f0] hover:bg-[#f8fafc]">
                        <td className="py-1 px-2 font-bold text-[#1e293b] text-[11px] whitespace-nowrap">{getSubjectName(score.subject_id)}</td>
                        <td className="py-1 px-2 text-center text-[#475569] font-semibold text-[11px] border-l border-[#f1f5f9]">{score.class_score}</td>
                        <td className="py-1 px-2 text-center text-[#475569] font-semibold text-[11px]">{score.exam_score}</td>
                        <td className="py-1 px-2 text-center font-black text-[#2563eb] text-xs border-l border-[#f1f5f9]">{score.total}</td>
                        <td className="py-1 px-2 text-center text-[#475569] font-bold text-xs border-l border-[#f1f5f9]">{score.subjectPosition ? getOrdinalNum(score.subjectPosition) : '-'}</td>
                        <td className="py-1 px-2 text-center font-black text-[#0f172a] text-xs">{score.grade}</td>
                        <td className="py-1 px-2 text-[9px] font-bold text-[#64748b] uppercase tracking-wider border-l border-[#f1f5f9]">{getRemark(score.grade)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                      <td colSpan={7} className="py-8 text-center font-medium text-[#94a3b8] text-sm">No scores recorded yet</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Remarks Section */}
          <div className="mb-4 mt-2 px-2 relative z-10">
            <div className="border border-[#e2e8f0] px-4 py-3 rounded-lg" style={{ backgroundColor: 'rgba(248, 250, 252, 0.8)' }}>
              <p className="text-[9px] uppercase tracking-widest font-black text-[#94a3b8] mb-1">Class Teacher's Remark</p>
              <p className="text-xs font-semibold text-[#0f172a] italic">{autoRemark}</p>
            </div>
          </div>

          {/* Footer Signatures */}
          <div className="mt-4 mb-2 flex justify-between items-end pb-2 relative z-10 w-full px-4 sm:px-12">
              <div className="text-left shrink-0 max-w-[200px]">
                <p className="text-[10px] font-black uppercase text-slate-800 tracking-widest mb-1.5 underline decoration-green-600 underline-offset-4">Authentication</p>
                <p className="text-[9px] text-slate-500 font-bold leading-tight uppercase italic">
                  This academic report is officially issued by {schoolProfile.name}. Any alterations render this document null and void.
                </p>
              </div>

              <div className="w-64 text-center relative shrink-0">
                {schoolProfile.principalSignature ? (
                  <img src={schoolProfile.principalSignature} className="h-12 object-contain mx-auto mb-1" alt="Headmaster Signature" />
                ) : (
                  <div className="h-12 mb-1"></div>
                )}
                <div className="border-b border-[#94a3b8] mb-2 h-0"></div>
                <p className="text-[12px] font-bold text-[#64748b]">Headmaster</p>
              </div>
          </div>
          
          <div className="border-t border-[#e2e8f0] pt-2 mt-auto text-[10px] text-[#94a3b8] text-center font-medium lowercase">
              <span className="capitalize">Contact</span> the school for more information via {schoolProfile.phone || '0246856855'} or {schoolProfile.email || 'akofi91@yahoo.com'}
          </div>
        </div>
      </div>
    </div>
  );
};
