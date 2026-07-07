import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GlassCard, GlassInput, GlassSelect, GlassButton } from '../components/ui/Glass';
import { Plus, X, User, Pencil, Trash2, ArrowRight, Download, GraduationCap, FileText, CheckCircle2, Search } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { TranscriptBuilder } from '../components/TranscriptBuilder';
import { CertificateBuilder } from '../components/CertificateBuilder';
import { StudentProfileModal } from '../components/StudentProfileModal';
import { calculateAge } from '../lib/utils';
import { resizeImage } from '../utils/images';
import { SearchableStudentSelect } from '../components/SearchableStudentSelect';
import { studentService } from '../services/studentService';
import { classService } from '../services/classService';
import { subjectService } from '../services/subjectService';
import { scoreService } from '../services/scoreService';

export const StudentsScreen = () => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [gender, setGender] = useState('Male');
  const [classId, setClassId] = useState('');
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [photo, setPhoto] = useState('');
  const [admissionYear, setAdmissionYear] = useState('2023/2024');
  const [dob, setDob] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isPromoting, setIsPromoting] = useState(false);
  const [promoteMode, setPromoteMode] = useState<'bulk' | 'single'>('bulk');
  const [promoteFrom, setPromoteFrom] = useState('');
  const [promoteTo, setPromoteTo] = useState('');
  const [promoteExceptions, setPromoteExceptions] = useState<Record<number, string>>({});
  const [transitioningStudent, setTransitioningStudent] = useState<any>(null);
  const [targetClass, setTargetClass] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [viewingStudent, setViewingStudent] = useState<any>(null);
  const [profileStudent, setProfileStudent] = useState<any>(null);
  const [docType, setDocType] = useState<'transcript' | 'certificate' | ''>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const docRef = useRef<HTMLDivElement>(null);
  const [schoolProfile, setSchoolProfile] = useState<any>({});
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [statusFilter, setStatusFilter] = useState('all');
  const [formStatus, setFormStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [allScores, setAllScores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const p = localStorage.getItem('schoolProfile');
    if (p) { try { setSchoolProfile(JSON.parse(p)); } catch(e){} }
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [s, c, sub] = await Promise.all([
        studentService.getAll(),
        classService.getAll(),
        subjectService.getAll(),
      ]);
      setStudents(s);
      setClasses(c);
      setSubjects(sub);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleOpenIndividualTransition = (student: any) => {
    setPromoteMode('single');
    setSelectedStudentId(String(student.id));
    setPromoteTo('');
    setIsPromoting(true);
    setIsAdding(false);
    setEditingId(null);
  };

  useEffect(() => {
    if (!profileStudent?.id && !viewingStudent?.id) { setAllScores([]); return; }
    const id = viewingStudent?.id || profileStudent?.id;
    scoreService.getAll({ student_id: id }).then(setAllScores).catch(() => {});
  }, [profileStudent?.id, viewingStudent?.id]);

  const activeStudentId = viewingStudent?.id || profileStudent?.id;
  const studentScores = useMemo(() => allScores, [allScores]);

  const rankingInfo = null;

  useEffect(() => {
    if (!viewingStudent || !viewingStudent.id || students.length === 0) return;
  }, [viewingStudent, students]);

  const handleOpenPromote = () => {
    setPromoteFrom(''); setPromoteTo(''); setPromoteMode('bulk');
    setSelectedStudentId(''); setPromoteExceptions({});
    setIsPromoting(true); setIsAdding(false); setEditingId(null);
  };

  const handlePromote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (promoteMode === 'single') {
      if (!selectedStudentId || !promoteTo) return;
      const action = promoteTo === 'complete' ? 'complete' : null;
      const classIdNum = !action ? parseInt(promoteTo) : null;
      await studentService.transition(parseInt(selectedStudentId), action, classIdNum);
      setIsPromoting(false);
      alert("Transition successful!");
      await loadData();
      return;
    }
    if (!promoteFrom || !promoteTo) return;
    const studentsInClass = students.filter((s: any) => String(s.class_id) === promoteFrom && s.status !== 'completed');
    if (studentsInClass.length === 0) { alert("No active students found."); return; }
    if (!window.confirm(`Are you sure you want to transition ${studentsInClass.length} students?`)) return;
    await studentService.bulkTransition(parseInt(promoteFrom), parseInt(promoteTo), promoteExceptions);
    setIsPromoting(false);
    alert("Transition successful!");
    await loadData();
  };

  const resetForm = () => {
    setName(''); setGender('Male'); setClassId(''); setParentName('');
    setParentPhone(''); setPhoto(''); setAdmissionYear('2023/2024'); setDob(''); setEditingId(null);
  };

  const handleCloseForm = () => { resetForm(); setIsAdding(false); };

  const handleEdit = (student: any) => {
    setEditingId(student.id); setName(student.name); setGender(student.gender || 'Male');
    setClassId(String(student.class_id)); setParentName(student.parent_name || '');
    setParentPhone(student.parent_phone || ''); setPhoto(student.photo || '');
    setAdmissionYear(student.admission_year || '2023/2024'); setDob(student.dob || ''); setIsAdding(false);
  };

  const handleDeleteStudent = async (id: number) => {
    if (window.confirm("Are you sure you want to delete this student and all their scores?")) {
      await studentService.delete(id);
      await loadData();
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => { setPhoto(await resizeImage(reader.result as string)); };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !classId) return;
    const studentData: any = { name, gender, class_id: parseInt(classId), parent_name: parentName, parent_phone: parentPhone, photo, admission_year: admissionYear, dob };
    if (!editingId) studentData.status = 'active';
    try {
      if (editingId) {
        await studentService.update(editingId, studentData);
      } else {
        await studentService.create(studentData);
      }
      setFormStatus('success');
      setTimeout(() => { setFormStatus('idle'); handleCloseForm(); }, 1000);
      await loadData();
    } catch (err) {
      setFormStatus('error');
      setTimeout(() => setFormStatus('idle'), 2000);
    }
  };

  const getClassName = (cId: number) => classes.find((c: any) => c.id === cId)?.name || 'Unknown';

  const filteredStudents = useMemo(() => {
    return students.filter((s: any) => {
      const matchesStatus = statusFilter === 'all' || (s.status || 'active') === statusFilter;
      const matchesSearch = !searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase()) || (s.id && String(s.id).includes(searchQuery));
      return matchesStatus && matchesSearch;
    });
  }, [students, statusFilter, searchQuery]);

  const displayedStudents = searchQuery ? filteredStudents.slice(0, 50) : filteredStudents.slice(0, 5);

  const toggleSelection = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) newSelected.delete(id); else newSelected.add(id);
    setSelectedIds(newSelected);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (window.confirm(`Are you sure you want to delete ${selectedIds.size} students?`)) {
      await studentService.bulkDelete(Array.from(selectedIds));
      setSelectedIds(new Set());
      setIsSelectionMode(false);
      await loadData();
    }
  };

  const handleGeneratePDF = async (filename: string) => {
    if (!docRef.current) return;
    setIsGenerating(true);
    const opt: any = {
      margin: 0, filename: `${filename}.pdf`, image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 1.5, useCORS: true, logging: false },
      jsPDF: { unit: 'in', format: docType === 'certificate' ? 'letter' : 'a4', orientation: docType === 'certificate' ? 'landscape' : 'portrait' }
    };
    try {
      if (Capacitor.isNativePlatform()) {
        const pdfBase64 = await html2pdf().set(opt).from(docRef.current).outputPdf('datauristring');
        const base64Data = pdfBase64.split(',')[1];
        const writeResult = await Filesystem.writeFile({ path: opt.filename, data: base64Data, directory: Directory.Documents });
        await Share.share({ title: opt.filename, text: `Download ${opt.filename}`, url: writeResult.uri, dialogTitle: 'Save or Share PDF' });
      } else {
        await html2pdf().set(opt).from(docRef.current).save();
      }
    } catch (err) { console.error(err); }
    finally { setIsGenerating(false); }
  };

  const isFormOpen = isAdding || editingId !== null;
  const studentsInPromoteClass = useMemo(() => {
    if (!promoteFrom) return [];
    return students.filter((s: any) => String(s.class_id) === promoteFrom && s.status !== 'completed');
  }, [students, promoteFrom]);

  if (loading) return <div className="p-6 pt-4"><p className="text-slate-500">Loading students...</p></div>;

  return (
    <div className="p-6 pt-4 flex flex-col gap-6 relative pb-24">
      <div className="flex justify-between items-center">
        {isSelectionMode ? (
          <div className="flex items-center gap-3">
            <button onClick={() => { setIsSelectionMode(false); setSelectedIds(new Set()); }} className="text-slate-500 hover:text-slate-800 font-bold p-1">Cancel</button>
            <span className="text-sm font-bold text-slate-700">{selectedIds.size} Selected</span>
          </div>
        ) : (
          <div className="flex-1 max-w-[200px] relative group">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <input type="text" placeholder="Search students..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/50 border border-slate-200 text-[11px] font-bold text-slate-700 py-1.5 pl-8 pr-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-sm transition-all" />
          </div>
        )}
        <div className="flex gap-2 ml-4">
          {isSelectionMode ? (
            <GlassButton variant="primary" onClick={handleBulkDelete} className="px-4 py-2 w-auto rounded-xl !bg-red-500 !text-white border-red-600 disabled:opacity-50" disabled={selectedIds.size === 0}>
              <Trash2 size={16} className="mr-1" /> Delete
            </GlassButton>
          ) : (
            <>
              <GlassButton variant="secondary" onClick={() => setIsSelectionMode(true)} className="px-4 py-2 w-auto rounded-xl"><span className="font-bold text-sm tracking-wide">Select</span></GlassButton>
              <GlassButton variant="primary" onClick={() => { resetForm(); setIsAdding(true); }} className="px-4 py-2 w-auto rounded-xl"><Plus size={20} /></GlassButton>
              <GlassButton variant="secondary" onClick={handleOpenPromote} className="px-4 py-2 w-auto rounded-xl" title="Transition Students"><ArrowRight size={20} /></GlassButton>
            </>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {isPromoting && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <GlassCard droplet className="p-4 mb-2 relative">
              <button onClick={() => setIsPromoting(false)} className="absolute top-4 right-4 text-slate-500 hover:text-slate-800"><X size={20} /></button>
              <h2 className="text-lg font-bold text-slate-900 mb-4">Transition Students</h2>
              <div className="flex bg-slate-100 p-1 rounded-xl mb-4">
                <button onClick={() => setPromoteMode('bulk')} className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${promoteMode === 'bulk' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Bulk (By Class)</button>
                <button onClick={() => setPromoteMode('single')} className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${promoteMode === 'single' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Particular Student</button>
              </div>
              <form onSubmit={handlePromote} className="flex flex-col gap-4">
                {promoteMode === 'bulk' ? (
                  <GlassSelect label="From Class" value={promoteFrom} onChange={e => setPromoteFrom(e.target.value)} options={classes.map((c: any) => ({ value: c.id!, label: c.name }))} required />
                ) : (
                  <SearchableStudentSelect label="Select Student" students={students.filter((s: any) => s.status !== 'completed')} value={selectedStudentId} onChange={setSelectedStudentId} required sizing="sm" />
                )}
                <GlassSelect label={promoteMode === 'bulk' ? "To Class (Bulk Destination)" : "Move to Class"} value={promoteTo} onChange={e => setPromoteTo(e.target.value)}
                  options={[...classes.map((c: any) => ({ value: c.id!, label: c.name })), {value: 'complete', label: '✅ Mark as Completed School'}, ...(promoteMode === 'single' ? [{value: 'skip', label: '❌ Skip (Stay in class)'}] : [])]} required />
                {promoteMode === 'bulk' && promoteFrom && studentsInPromoteClass.length > 0 && (
                  <div className="mt-2 border-t border-slate-200 pt-4">
                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-3">Student Exceptions (Optional)</p>
                    <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-2 no-scrollbar">
                      {studentsInPromoteClass.map((s: any) => (
                        <div key={s.id} className="flex items-center justify-between gap-3 bg-white/40 p-2 rounded-xl border border-white/60">
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 truncate">{s.name}</p>
                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter">Current: {getClassName(s.class_id)}</p>
                          </div>
                          <select value={promoteExceptions[s.id!] || ''} onChange={(e) => setPromoteExceptions(prev => ({ ...prev, [s.id!]: e.target.value }))}
                            className="text-[10px] font-bold bg-white/80 border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500">
                            <option value="">Default (Bulk)</option>
                            <option value="skip">Skip (Stay in class)</option>
                            <option value="complete">Mark Completed</option>
                            {classes.filter((c: any) => String(c.id) !== promoteFrom).map((c: any) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <GlassButton type="submit" variant="primary" className="mt-2 w-full justify-center font-bold">Confirm {promoteMode === 'bulk' ? 'Transition' : 'Move'}</GlassButton>
              </form>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewingStudent && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
            <GlassCard className="max-w-4xl w-full max-h-[90vh] flex flex-col bg-white overflow-hidden p-0 relative">
              <div className="flex justify-between items-center p-4 border-b border-slate-200 shrink-0 bg-slate-50">
                <div className="flex gap-2">
                  <button onClick={() => setDocType('transcript')} className={`px-4 py-2 font-bold rounded-lg ${docType === 'transcript' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 border border-slate-200'}`}>Official Transcript</button>
                  <button onClick={() => setDocType('certificate')} className={`px-4 py-2 font-bold rounded-lg ${docType === 'certificate' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 border border-slate-200'}`}>Certificate</button>
                </div>
                <div className="flex gap-2">
                  <GlassButton onClick={() => handleGeneratePDF(`${viewingStudent.name.replace(/\s+/g,'_')}_${docType}`)} className="px-4 py-2 !bg-green-600 !text-white !border-green-700">
                    {isGenerating ? 'Generating PDF...' : <><Download size={18} /> Download PDF</>}
                  </GlassButton>
                  <button onClick={() => {setViewingStudent(null); setDocType('');}} className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg"><X size={24} /></button>
                </div>
              </div>
              <div className="flex-1 overflow-auto bg-slate-200 p-8 flex items-start justify-center relative">
                <div ref={docRef} className="shadow-2xl shrink-0">
                  {docType === 'transcript'
                    ? <TranscriptBuilder student={viewingStudent} allScores={studentScores.map((s: any) => ({...s, subjectName: subjects.find((sub: any) => sub.id === s.subject_id)?.name || 'Unknown'}))} schoolProfile={schoolProfile} />
                    : <CertificateBuilder student={viewingStudent} schoolProfile={schoolProfile} myClass={classes.find((c: any) => c.id === viewingStudent.class_id)} myRanking={null} totalInClass={null} term="" academicYear="" />
                  }
                </div>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {isFormOpen && !isPromoting && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <GlassCard droplet className="p-4 mb-2 relative">
              <button onClick={handleCloseForm} className="absolute top-4 right-4 text-slate-500 hover:text-slate-800"><X size={20} /></button>
              <h2 className="text-lg font-bold text-slate-900 mb-4">{editingId ? 'Edit Student' : 'Add New Student'}</h2>
              <form onSubmit={handleSave} className="flex flex-col gap-4">
                <GlassInput label="Full Name" value={name} onChange={e => setName(e.target.value)} required />
                <div className="grid grid-cols-2 gap-4">
                  <GlassInput label="Admission Year" value={admissionYear} onChange={e => setAdmissionYear(e.target.value)} placeholder="e.g. 2023" />
                  <GlassSelect label="Gender" value={gender} onChange={e => setGender(e.target.value)} options={[{ value: 'Male', label: 'Male'}, { value: 'Female', label: 'Female'}]} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <GlassSelect label="Class" value={classId} onChange={e => setClassId(e.target.value)} options={classes.map((c: any) => ({ value: c.id!, label: c.name }))} required />
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-slate-700 ml-1">Date of Birth {dob && <span className="text-indigo-600 text-[11px] font-black ml-1 uppercase">({calculateAge(dob)} Years)</span>}</label>
                    <input type="date" value={dob} onChange={e => setDob(e.target.value)} className="w-full bg-white/60 border border-white/80 rounded-xl px-4 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-medium shadow-sm backdrop-blur-md" />
                  </div>
                </div>
                <div className="border-t border-slate-200 mt-2 mb-1 pt-3">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 ml-2">Student Photo</p>
                  <div className="flex flex-col gap-1.5 px-2 mb-3 mt-1">
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      {photo ? (
                        <div className="relative shrink-0">
                          <img src={photo} className="w-20 h-20 rounded-xl object-cover border-4 border-white shadow-md" alt="preview" />
                          <button type="button" onClick={() => setPhoto('')} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 shadow-sm"><X size={14} /></button>
                        </div>
                      ) : <div className="w-20 h-20 rounded-xl bg-slate-200/50 border-2 border-dashed border-slate-300 flex items-center justify-center shrink-0"><User size={30} className="text-slate-400"/></div>}
                      <div className="flex flex-col flex-1 gap-2">
                        <label className="cursor-pointer bg-blue-50 border border-blue-100 rounded-xl px-4 py-2 text-sm font-bold text-blue-700 flex items-center justify-center gap-2"><User size={16} />Capture Photo<input type="file" accept="image/*" capture="user" className="hidden" onChange={handlePhotoUpload} /></label>
                        <label className="cursor-pointer bg-white/80 border border-white rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 flex items-center justify-center gap-2">Upload File<input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} /></label>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="border-t border-slate-200 mt-1 mb-1 pt-3">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 ml-2">Parent / Guardian Details</p>
                  <div className="flex flex-col gap-4">
                    <GlassInput label="Parent Name" value={parentName} onChange={e => setParentName(e.target.value)} placeholder="e.g. Mr. John Doe" />
                    <GlassInput label="WhatsApp Phone Number" value={parentPhone} onChange={e => setParentPhone(e.target.value)} placeholder="e.g. +233241234567" type="tel" />
                  </div>
                </div>
                <GlassButton type="submit" className={`mt-2 w-full transition-colors ${formStatus === 'success' ? '!bg-green-500 text-white' : formStatus === 'error' ? '!bg-red-500 text-white' : ''}`}>
                  {formStatus === 'success' ? 'Saved successfully!' : formStatus === 'error' ? 'Error saving student' : (editingId ? 'Update Student' : 'Save Student')}
                </GlassButton>
              </form>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between mt-2 mb-2">
        <h2 className="text-sm font-black text-slate-800 tracking-wider uppercase">Student Roster</h2>
        <div className="flex items-center gap-2">
          {searchQuery && <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">{filteredStudents.length} Found</span>}
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-white/50 border border-slate-200 text-xs font-bold text-slate-700 py-1.5 px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition-all">
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-3 pb-20">
        {profileStudent && (
          <StudentProfileModal
            student={profileStudent}
            allScores={studentScores}
            allStudents={students}
            subjects={subjects}
            classes={classes}
            onClose={() => setProfileStudent(null)}
            onViewDocument={(type) => { setProfileStudent(null); setViewingStudent(profileStudent); setDocType(type as any); }}
            onTransition={(s) => { setProfileStudent(null); handleOpenIndividualTransition(s); }}
          />
        )}
        {displayedStudents.length === 0 && !isFormOpen && <div className="text-center py-10 text-slate-500 italic">No students found</div>}
        <AnimatePresence mode="popLayout">
          {displayedStudents.map((student: any, i) => {
            const isCompleted = student.status === 'completed';
            return (
              <motion.div key={student.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }}
                onClick={() => isSelectionMode ? toggleSelection({ stopPropagation: () => {} } as any, student.id!) : setProfileStudent(student)} className="cursor-pointer">
                <GlassCard className={`p-1.5 pl-2 flex items-center justify-between transition-colors group relative overflow-hidden ${selectedIds.has(student.id!) ? 'bg-blue-50/50 border-blue-300 shadow-md' : 'hover:bg-white/50'} ${isCompleted ? 'opacity-60 grayscale-[0.5]' : ''}`}>
                  <div className="flex items-center gap-2 min-w-0 pr-4">
                    {isSelectionMode && <div className="shrink-0 flex items-center justify-center pl-1"><input type="checkbox" checked={selectedIds.has(student.id!)} readOnly className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer pointer-events-none" /></div>}
                    <div className="shrink-0 relative" style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.15))' }}>
                      {student.photo ? <img src={student.photo} className="w-10 h-10 rounded-lg object-cover bg-white border border-slate-200" alt="" /> : <div className="w-10 h-10 bg-indigo-50 flex items-center justify-center border border-indigo-100 rounded-lg"><User size={16} className="text-indigo-300" /></div>}
                      {isCompleted && <div className="absolute -bottom-1 -right-1 bg-emerald-100 text-emerald-600 border border-emerald-200 rounded-full w-4 h-4 flex items-center justify-center shadow-sm"><CheckCircle2 size={10} strokeWidth={4} /></div>}
                    </div>
                    <div className="flex-1 min-w-0 truncate py-0.5">
                      <p className={`font-bold text-[13px] truncate flex items-center gap-1.5 leading-tight ${isCompleted ? 'text-slate-500 line-through' : 'text-slate-900'}`}>
                        {student.name}{student.dob && <span className="text-[10px] text-slate-400 font-medium ml-1">({calculateAge(student.dob)} Yrs)</span>}
                        {student.status === 'completed' && <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1 py-0.5 rounded shadow-sm uppercase tracking-widest font-black inline-flex items-center gap-0.5 no-underline"><GraduationCap size={10}/></span>}
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium truncate uppercase tracking-widest mt-1 opacity-80">
                        <span className="text-blue-600 font-bold mr-1 bg-blue-50 px-1 rounded">#{student.id}</span>{getClassName(student.class_id)} &bull; {student.gender}
                      </p>
                    </div>
                  </div>
                  {!isSelectionMode && (
                    <div className="flex gap-1 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity bg-gradient-to-l from-white via-white to-transparent pl-4 pr-1 h-full items-center absolute right-0">
                      <button onClick={(e) => { e.stopPropagation(); handleOpenIndividualTransition(student); }} title="Transition" className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><ArrowRight size={16} /></button>
                      <button onClick={(e) => { e.stopPropagation(); setViewingStudent(student); setDocType('transcript'); }} title="Transcript" className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"><FileText size={16} /></button>
                      <button onClick={(e) => { e.stopPropagation(); handleEdit(student); }} title="Edit" className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"><Pencil size={16} /></button>
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteStudent(student.id!); }} title="Delete" className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                    </div>
                  )}
                </GlassCard>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};
