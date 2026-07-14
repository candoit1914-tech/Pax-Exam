import React from 'react';

export const CertificateBuilder = ({ student, schoolProfile, myClass, myRanking, totalInClass, term, academicYear }: any) => {
  if (!student) return null;

  const getOrdinalNum = (n: number) => {
    if (!n) return '';
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  const isGraduating = myClass?.name ? /(?:3|three|final|graduate)/i.test(myClass.name) : false;

  return (
    <div className="w-[1120px] h-[840px] bg-white relative text-slate-800 flex flex-col mx-auto overflow-hidden" style={{ boxSizing: 'border-box' }}>
      {/* Decorative Border Container */}
      <div className="absolute inset-0 border-[16px] border-double border-green-600 pointer-events-none z-20"></div>
      
      {/* Watermark */}
      <div className="absolute inset-0 pointer-events-none z-0 flex items-center justify-center overflow-hidden" style={{ userSelect: 'none' }}>
        {schoolProfile.logo ? (
          <img src={schoolProfile.logo} className="w-[50%] max-w-lg opacity-[0.03] grayscale" alt="Watermark" />
        ) : (
          <div className="opacity-[0.04] flex flex-col justify-center w-full h-full">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex whitespace-nowrap text-slate-900 font-black text-2xl" style={{ transform: `rotate(-20deg) translateY(${i * 120 - 600}px) translateX(-200px)`, letterSpacing: '6px' }}>
                {Array.from({ length: 8 }).map((_, j) => (
                  <span key={j} style={{ display: 'inline-block', transform: `translateY(${Math.sin(j) * 25}px)`, marginRight: '60px' }}>
                    {schoolProfile.name}
                  </span>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="relative z-10 flex flex-col h-full items-center text-center px-[100px] pt-[40px] pb-[40px]">
        {schoolProfile.logo ? (
           <img src={schoolProfile.logo} className="h-20 object-contain mb-4" alt="Logo" />
        ) : (
           <div className="h-20 mb-4 flex items-center justify-center text-slate-300 font-black tracking-widest uppercase">LOGO</div>
        )}
        
        <h1 className="text-xl font-black uppercase tracking-widest text-slate-900 mb-2">{schoolProfile.name}</h1>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-8">{schoolProfile.address}{schoolProfile.address && schoolProfile.location ? ' | ' : ''}{schoolProfile.location}</p>

        <h2 className="text-3xl font-black text-amber-600 mb-6" style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>
          {isGraduating ? 'Certificate of Completion' : 'Certificate of Excellence'}
        </h2>

        <p className="text-base font-medium text-slate-600 mb-3">This is to certify that</p>
        
        <h3 className="text-4xl font-black text-slate-900 mb-3 border-b-2 border-slate-300 pb-1 px-10 inline-block">
          {student.name}
        </h3>

        {myClass && (
          <p className="text-lg font-bold text-slate-700 mb-4 uppercase tracking-wider">{myClass.name}</p>
        )}

        <p className="text-base font-medium text-slate-600 max-w-2xl leading-relaxed mb-4">
          {isGraduating ? (
            "has successfully completed the prescribed course of study over a period of 3 academic years, demonstrating excellent conduct and academic commitment, and is therefore awarded this certificate."
          ) : (
            `has demonstrated excellent conduct and academic commitment during the ${term || 'term exam'}, and is therefore awarded this certificate.`
          )}
        </p>

        {myRanking && totalInClass && (
          <div className="bg-slate-50 border border-slate-200 px-6 py-3 rounded-xl mb-4">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1 flex flex-wrap items-center justify-center gap-2">
              {!isGraduating && myClass && (
                <><span>{myClass.name}</span><span>•</span></>
              )}
              <span>{term || 'Term'}</span>
              <span>•</span>
              <span>{academicYear || 'Year'}</span>
            </p>
            <p className="text-lg font-medium text-slate-800">
              Exam Position: <strong className="text-xl text-slate-900">{getOrdinalNum(myRanking.position)}</strong> out of {totalInClass} students
            </p>
          </div>
        )}

        <div className="w-full flex justify-between items-end px-10 mt-auto pt-6">
            <div className="text-center w-64">
               <div className="h-16 mb-2 flex items-center justify-center text-lg font-black text-slate-800">
                  {new Date().toLocaleDateString()}
               </div>
               <div className="border-t border-slate-400 pt-2 font-bold uppercase text-xs tracking-widest text-slate-600">Date of Issue</div>
            </div>

            <div className="flex items-center justify-center">
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
            </div>

            <div className="text-center w-64">
               <div className="h-16 mb-2 flex items-center justify-center">
                 {schoolProfile.principalSignature && (
                   <img src={schoolProfile.principalSignature} className="h-full object-contain mx-auto" alt="Signature" />
                 )}
               </div>
               <div className="border-t border-slate-400 pt-2 font-bold uppercase text-xs tracking-widest text-slate-600">Headmaster Signature</div>
            </div>
        </div>
      </div>
    </div>
  );
};
