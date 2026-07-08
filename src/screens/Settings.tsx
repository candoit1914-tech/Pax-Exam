import React, { useRef, useState, useEffect } from 'react';
import { GlassCard, GlassButton, GlassInput, GlassSelect } from '../components/ui/Glass';
import { exportBackup, restoreDatabase } from '../utils/backup';
import { exportStudentsToCSV, exportScoresToCSV, importCsvFile } from '../utils/csv';
import { motion, AnimatePresence } from 'motion/react';
import { Database, Download, Upload, CheckCircle2, AlertCircle, Building2, Save, FileSpreadsheet, X, Loader2, User, Lock, Eye, EyeOff } from 'lucide-react';
import { authService } from '../services/authService';
import { useAuth } from '../contexts/AuthContext';
import { calculateAverage, rankStudents } from '../utils/ranking';
import { BroadsheetBuilder } from '../components/BroadsheetBuilder';
import html2pdf from 'html2pdf.js';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { resizeImage } from '../utils/images';
import { studentService } from '../services/studentService';
import { classService } from '../services/classService';
import { subjectService } from '../services/subjectService';
import { scoreService } from '../services/scoreService';

export const SettingsScreen = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const broadsheetRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<{type: 'success' | 'error' | null, message: string}>({ type: null, message: '' });
  
  const [profile, setProfile] = useState({ name: '', address: '', location: '', phone: '', email: '', logo: '', teacherSignature: '', principalSignature: '' });
  const [importProgress, setImportProgress] = useState<{processed: number, total: number} | null>(null);
  const [isBackingUp, setIsBackingUp] = useState(false);

  const { user, refreshUser } = useAuth();
  const [myName, setMyName] = useState(user?.name || '');
  const [myEmail, setMyEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [profileStatus, setProfileStatus] = useState('');

  const handleUpdateProfile = async () => {
    try {
      await authService.updateProfile(myName, myEmail);
      await refreshUser();
      setProfileStatus('Profile updated.');
    } catch (err: any) {
      setProfileStatus(err.response?.data?.error || 'Failed to update.');
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) { setProfileStatus('Fill all fields.'); return; }
    try {
      await authService.changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setProfileStatus('Password changed.');
    } catch (err: any) {
      setProfileStatus(err.response?.data?.error || 'Failed to change password.');
    }
  };

  // Broadsheet Modal State
  const [isBroadsheetModalOpen, setIsBroadsheetModalOpen] = useState(false);
  const [bsClassId, setBsClassId] = useState('');
  const [bsTerm, setBsTerm] = useState('Term 1');
  const [bsYear, setBsYear] = useState('2023/2024');
  const [bsTeacher, setBsTeacher] = useState('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Broadsheet data loaded via API
  const [classes, setClasses] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [allSubjects, setAllSubjects] = useState<any[]>([]);
  const [allScores, setAllScores] = useState<any[]>([]);
  const [bsLoading, setBsLoading] = useState(false);

  useEffect(() => {
    if (isBroadsheetModalOpen && classes.length === 0) {
      loadBroadsheetData();
    }
  }, [isBroadsheetModalOpen]);

  const loadBroadsheetData = async () => {
    setBsLoading(true);
    try {
      const [c, s, sub, sc] = await Promise.all([
        classService.getAll(),
        studentService.getAll(),
        subjectService.getAll(),
        scoreService.getAll()
      ]);
      setClasses(c);
      setAllStudents(s);
      setAllSubjects(sub);
      setAllScores(sc);
    } catch (err) { console.error(err); }
    setBsLoading(false);
  };

  const handleGenerateBroadsheet = async () => {
    if (!bsClassId) {
      showStatus('error', 'Please select a class first.');
      return;
    }
    if (!broadsheetRef.current) return;
    
    setIsGeneratingPdf(true);
    try {
      const cls = classes.find((c: any) => String(c.id) === bsClassId);
      const filename = `${cls?.name.replace(/\s+/g, '_')}_Broadsheet_${bsTerm.replace(/\s+/g, '')}.pdf`;
      
      const opt: any = {
        margin:       0.2,
        filename:     filename,
        image:        { type: 'jpeg', quality: 1 },
        html2canvas:  { scale: 1.5, useCORS: true, windowWidth: 1122, logging: false },
        jsPDF:        { unit: 'in', format: 'a4', orientation: 'landscape' }
      };
      
      if (Capacitor.isNativePlatform()) {
        const pdfBase64 = await html2pdf().set(opt).from(broadsheetRef.current).outputPdf('datauristring');
        const base64Data = pdfBase64.split(',')[1];
        const writeResult = await Filesystem.writeFile({
          path: opt.filename,
          data: base64Data,
          directory: Directory.Documents
        });
        await Share.share({ title: opt.filename, text: `Download ${opt.filename}`, url: writeResult.uri, dialogTitle: 'Save or Share PDF' });
      } else {
        await html2pdf().set(opt).from(broadsheetRef.current).save();
      }
      showStatus('success', 'Broadsheet generated successfully!');
      setIsBroadsheetModalOpen(false);
    } catch (e: any) {
      showStatus('error', `Failed to generate PDF: ${e.message}`);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  useEffect(() => {
    const p = localStorage.getItem('schoolProfile');
    if(p) {
      try { 
        const parsed = JSON.parse(p);
        setProfile(prev => ({ ...prev, ...parsed })); 
      } catch(e){}
    }
  }, []);

  const showStatus = (type: 'success' | 'error', message: string) => {
    setStatus({ type, message });
    setTimeout(() => setStatus({ type: null, message: '' }), 4000);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('schoolProfile', JSON.stringify(profile));
    showStatus('success', 'School profile saved successfully!');
  };

  const handleExport = async () => {
    setIsBackingUp(true);
    try {
      const success = await exportBackup();
      if (success) {
        showStatus('success', 'Backup exported successfully!');
      } else {
        showStatus('error', 'Failed to export backup.');
      }
    } catch (e) {
      showStatus('error', 'Backup failed due to memory limits.');
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleExportCSV = async (type: 'students' | 'scores') => {
    let success = false;
    if (type === 'students') {
      success = await exportStudentsToCSV();
    } else {
      success = await exportScoresToCSV();
    }
    
    if (success) {
      showStatus('success', `${type} CSV exported successfully!`);
    } else {
      showStatus('error', `Failed to export ${type} CSV.`);
    }
  };

  const handleCsvChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportProgress({ processed: 0, total: 0 });
    const result = await importCsvFile(file, (processed, total) => {
      setImportProgress({ processed, total });
    });
    setImportProgress(null);

    if (result.success) {
      showStatus('success', result.message);
    } else {
      showStatus('error', result.message);
    }

    if(csvInputRef.current) csvInputRef.current.value = '';
  };

  const [isOptimizing, setIsOptimizing] = useState(false);

  const handleOptimizeDatabase = async () => {
    if (!window.confirm("This will resize all student photos and the school logo to save memory. This can fix errors when exporting large data. Continue?")) return;
    
    setIsOptimizing(true);
    try {
      const data = await studentService.getAll();
      let optimizedCount = 0;
      for (const student of data) {
        if (student.photo && student.photo.startsWith('data:image')) {
          const resized = await resizeImage(student.photo);
          if (resized.length < student.photo.length) {
            await studentService.update(student.id, { photo: resized });
            optimizedCount++;
          }
        }
      }

      const p = localStorage.getItem('schoolProfile');
      if (p) {
        const parsed = JSON.parse(p);
        let changed = false;
        if (parsed.logo && parsed.logo.startsWith('data:image')) {
          const resized = await resizeImage(parsed.logo);
          if (resized.length < parsed.logo.length) {
            parsed.logo = resized;
            changed = true;
          }
        }
        if (parsed.principalSignature && parsed.principalSignature.startsWith('data:image')) {
          const resized = await resizeImage(parsed.principalSignature);
          if (resized.length < parsed.principalSignature.length) {
            parsed.principalSignature = resized;
            changed = true;
          }
        }
        if (changed) {
          localStorage.setItem('schoolProfile', JSON.stringify(parsed));
          setProfile(parsed);
        }
      }

      showStatus('success', `Optimized ${optimizedCount} photos. Database is now more efficient.`);
    } catch (err) {
      console.error(err);
      showStatus('error', 'Failed to optimize database.');
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (window.confirm("WARNING: Restoring a backup will erase ALL current data on this device and replace it with the backup. Proceed?")) {
      restoreDatabase(file).then(() => {
        showStatus('success', 'Database restored successfully!');
        const p = localStorage.getItem('schoolProfile');
        if (p) {
          try { setProfile(JSON.parse(p)); } catch(e){}
        }
      }).catch(err => {
        console.error(err);
        showStatus('error', 'Failed to restore database. Make sure it is a valid .json or .zip backup.');
      }).finally(() => {
        if(fileInputRef.current) fileInputRef.current.value = '';
      });
    } else {
      if(fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleReset = async () => {
    if (window.confirm("Are you sure you want to absolute wipe all data? This will reset the app to an entirely fresh state. This cannot be undone.")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className="p-6 pt-4 flex flex-col gap-6 relative pb-24">
      <AnimatePresence>
        {status.type && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`p-4 rounded-2xl flex items-center gap-3 backdrop-blur-md shadow-sm border ${
              status.type === 'success' 
              ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-900' 
              : 'bg-red-500/20 border-red-500/30 text-red-900'
            }`}
          >
            {status.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            <span className="font-semibold text-sm">{status.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col gap-6">
        
        {/* My Profile */}
        <GlassCard droplet className="p-4 sm:p-5 border-sky-200">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-10 h-10 bg-sky-500/10 border border-sky-500/30 rounded-2xl flex items-center justify-center shrink-0">
              <User className="text-sky-600" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-1">My Profile</h2>
              <p className="text-[11px] font-medium text-slate-600">Update your name, email, or password.</p>
            </div>
          </div>
          {profileStatus && <p className="text-xs text-emerald-700 bg-emerald-50 p-2 rounded-lg mb-3">{profileStatus}</p>}
          <div className="flex flex-col gap-3">
            <GlassInput label="Name" value={myName} onChange={e => setMyName(e.target.value)} sizing="sm" />
            <GlassInput label="Email" type="email" value={myEmail} onChange={e => setMyEmail(e.target.value)} sizing="sm" />
            <GlassButton sizing="sm" onClick={handleUpdateProfile}><Save size={14} /> Save Changes</GlassButton>
          </div>
          <div className="border-t border-white/30 my-4 pt-4">
            <div className="flex items-center gap-2 mb-3">
              <Lock size={16} className="text-slate-500" />
              <span className="text-sm font-bold text-slate-700">Change Password</span>
            </div>
            <div className="flex flex-col gap-3">
              <GlassInput label="Current Password" type={showPw ? 'text' : 'password'} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} sizing="sm" />
              <div className="relative">
                <GlassInput label="New Password" type={showPw ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} sizing="sm" />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-[60%] -translate-y-1/2 text-slate-500">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <GlassButton sizing="sm" variant="secondary" onClick={handleChangePassword}><Lock size={14} /> Update Password</GlassButton>
            </div>
          </div>
        </GlassCard>

        {/* School Profile */}
        <GlassCard droplet className="p-4 sm:p-5 border-indigo-200">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-10 h-10 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl flex items-center justify-center shrink-0">
              <Building2 className="text-indigo-600" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-1">School Profile</h2>
              <p className="text-[11px] font-medium text-slate-600">These details will appear on the generated Report Cards.</p>
            </div>
          </div>
          
          <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
            <GlassInput 
              label="School Name" 
              value={profile.name} 
              onChange={e => setProfile({...profile, name: e.target.value})} 
              placeholder="e.g. St. Andrews Academy"
              required 
            />
            <GlassInput 
              label="Address" 
              value={profile.address} 
              onChange={e => setProfile({...profile, address: e.target.value})} 
              placeholder="e.g. P.O. Box 123, School Lane"
            />
            <GlassInput 
              label="Location / City" 
              value={profile.location} 
              onChange={e => setProfile({...profile, location: e.target.value})} 
              placeholder="e.g. Accra, Ghana"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <GlassInput 
                label="Headmaster's Phone" 
                value={profile.phone || ''} 
                onChange={e => setProfile({...profile, phone: e.target.value})} 
                placeholder="e.g. +233 24 123 4567"
              />
              <GlassInput 
                label="Headmaster's Email" 
                value={profile.email || ''} 
                onChange={e => setProfile({...profile, email: e.target.value})} 
                placeholder="e.g. headmaster@school.com"
              />
            </div>
            <div className="flex flex-col gap-2 mb-2 mt-1">
              <label className="text-slate-700 text-sm ml-2 font-medium">School Logo</label>
              <div className="flex items-center gap-4 bg-white/30 backdrop-blur-md p-3 rounded-2xl border border-white/40 shadow-sm">
                {profile.logo ? (
                  <img src={profile.logo} alt="Logo Preview" className="w-16 h-16 object-contain rounded-lg border border-slate-200 bg-white shadow-sm" />
                ) : (
                  <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center border border-slate-200 text-xs text-slate-400">No Logo</div>
                )}
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = async (ev) => {
                        const resized = await resizeImage(ev.target?.result as string);
                        setProfile({ ...profile, logo: resized });
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">              
              <div className="flex flex-col gap-2 mt-1">
                <label className="text-slate-700 text-sm font-medium">Headmaster Signature</label>
                <div className="flex items-center gap-4 bg-white/30 backdrop-blur-md p-3 rounded-2xl border border-white/40 shadow-sm">
                  {profile.principalSignature ? (
                    <img src={profile.principalSignature} alt="Principal Signature" className="w-16 h-8 object-contain rounded border border-slate-200 bg-white" />
                  ) : (
                    <div className="w-16 h-8 bg-slate-100 rounded flex items-center justify-center border border-slate-200 text-[10px] text-slate-400">None</div>
                  )}
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = async (ev) => {
                          const resized = await resizeImage(ev.target?.result as string);
                          setProfile({ ...profile, principalSignature: resized });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="text-xs text-slate-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer w-full"
                  />
                </div>
              </div>
            </div>

            <GlassButton type="submit" className="w-full mt-4">
              <Save size={18} /> Save Settings
            </GlassButton>
          </form>
        </GlassCard>

        {/* CSV Data Management */}
        <GlassCard droplet className="p-4 sm:p-5 border-emerald-200">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center shrink-0">
              <FileSpreadsheet className="text-emerald-600" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-1">CSV Management</h2>
              <p className="text-[11px] font-medium text-slate-600">Import and export tabular data (.csv files) separate from complete backups.</p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
             <GlassButton onClick={() => handleExportCSV('students')} className="flex-1 text-emerald-900 border-emerald-600/30" variant="secondary">
               <Download size={18} /> Export Students CSV
             </GlassButton>
             <GlassButton onClick={() => setIsBroadsheetModalOpen(true)} className="flex-1 text-emerald-900 border-emerald-600/30" variant="secondary">
               <Download size={18} /> Export Scores
             </GlassButton>
          </div>

          <div className="border-t border-slate-200 pt-4">
             <input 
              type="file" 
              ref={csvInputRef} 
              onChange={handleCsvChange} 
              accept=".csv,.doc,.docx,.xls,.xlsx" 
              className="hidden" 
            />
             <GlassButton 
              onClick={() => csvInputRef.current?.click()} 
              className="w-full text-emerald-900 bg-emerald-500/20 border-emerald-500/40 hover:bg-emerald-500/30 relative overflow-hidden"
              disabled={importProgress !== null}
             >
                {importProgress ? (
                  <>
                    <div className="absolute left-0 top-0 bottom-0 bg-emerald-400/30 transition-all duration-300 pointer-events-none" style={{ width: `${importProgress.total > 0 ? (importProgress.processed / importProgress.total) * 100 : 0}%` }} />
                    <Loader2 size={18} className="animate-spin relative z-10" /> 
                    <span className="relative z-10">Importing {importProgress.processed} / {importProgress.total}...</span>
                  </>
                ) : (
                  <>
                    <Upload size={18} /> Import Students
                  </>
                )}
             </GlassButton>
          </div>
        </GlassCard>

        {/* Export Backup Data */}
        <GlassCard droplet className="p-4 sm:p-5 border-blue-200">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-10 h-10 bg-blue-500/10 border border-blue-500/30 rounded-2xl flex items-center justify-center shrink-0">
              {isBackingUp ? <Loader2 size={20} className="animate-spin text-blue-600" /> : <Download className="text-blue-600" size={20} />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-1">Export Data</h2>
              <p className="text-[11px] font-medium text-slate-600">Download a complete compressed backup of all school records.</p>
            </div>
          </div>
          <GlassButton 
            onClick={handleExport} 
            className="w-full text-blue-900" 
            variant="secondary"
            disabled={isBackingUp}
          >
            <Database size={18} /> {isBackingUp ? 'Preparing Backup...' : 'Download Backup (.zip)'}
          </GlassButton>
        </GlassCard>

        {/* Restore Data */}
        <GlassCard droplet className="p-4 sm:p-5 border-amber-200">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-10 h-10 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-center shrink-0">
              <Upload className="text-amber-600" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-1">Restore Database</h2>
              <p className="text-[11px] font-medium text-slate-600">Select a previously exported .json file. <strong className="text-red-500">This erases current data!</strong></p>
            </div>
          </div>

          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="application/json,application/zip" 
            className="hidden" 
          />
          <GlassButton 
            onClick={() => fileInputRef.current?.click()} 
            className="w-full text-amber-900 bg-amber-500/20 border-amber-500/40 hover:bg-amber-500/30"
          >
           Upload Backup
          </GlassButton>
        </GlassCard>

        {/* Database Optimization */}
        <GlassCard droplet className="p-4 sm:p-5 border-blue-200">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-10 h-10 bg-blue-500/10 border border-blue-500/30 rounded-2xl flex items-center justify-center shrink-0">
              <Database className="text-blue-600" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-1">Database Optimization</h2>
              <p className="text-[11px] font-medium text-slate-600">Resize existing photos and logos to reduce file size and fix memory errors.</p>
            </div>
          </div>
          <GlassButton 
            variant="secondary" 
            onClick={handleOptimizeDatabase} 
            disabled={isOptimizing}
            className="w-full justify-center gap-2 border-blue-200 hover:bg-blue-50"
          >
            {isOptimizing ? (
              <><Loader2 className="animate-spin" size={18} /> Optimizing...</>
            ) : (
              <><Database size={18} /> Optimize Database</>
            )}
          </GlassButton>
        </GlassCard>

        {/* Logout */}
        <div className="flex justify-center mt-4">
          <button
            onClick={async () => {
              await authService.logout();
              window.location.href = '/login';
            }}
            className="text-red-600 font-black uppercase text-sm tracking-widest hover:bg-red-50 px-4 py-2 rounded-lg transition-colors"
          >
            Sign Out
          </button>
        </div>

        {/* Reset App */}
        <div className="flex justify-center mt-4 pb-8">
          <button 
            onClick={handleReset}
            className="text-black font-black uppercase text-sm tracking-widest hover:bg-slate-200 px-4 py-2 rounded-lg transition-colors"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Hidden Broadsheet Renderer for PDF generation */}
      <div style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
         <div ref={broadsheetRef} className="bg-white">
            <BroadsheetBuilder
                students={rankStudents(allStudents.filter((s: any) => s.status !== 'completed' && String(s.class_id) === bsClassId).map((st: any) => {
                    const sScores = allScores.filter((sc: any) => sc.student_id === st.id && (sc.term || 'Term 1') === bsTerm && (sc.academic_year || '2023/2024') === bsYear);
                    const avg = calculateAverage(sScores);
                    const examTotal = sScores.reduce((sum: number, curr: any) => sum + (Number(curr.exam_score) || 0), 0) * 2;
                    return { id: st.id!, name: st.name, average: avg, rankScore: examTotal };
                }))}
                subjects={allSubjects}
                scores={allScores.filter((sc: any) => (sc.term || 'Term 1') === bsTerm && (sc.academic_year || '2023/2024') === bsYear)}
                schoolProfile={profile}
                className={classes.find((c: any) => String(c.id) === bsClassId)?.name}
                term={bsTerm}
                academicYear={bsYear}
                classTeacher={bsTeacher}
            />
         </div>
      </div>

      {/* Broadsheet Modal */}
      <AnimatePresence>
        {isBroadsheetModalOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-xl w-full max-w-lg border border-slate-200 overflow-hidden"
            >
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-800">Export Broadsheet (Scores)</h2>
                <button onClick={() => setIsBroadsheetModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 flex flex-col gap-4">
                {bsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 size={24} className="animate-spin text-indigo-600" />
                    <span className="ml-3 text-slate-600 font-medium">Loading data...</span>
                  </div>
                ) : (
                  <>
                    <GlassSelect
                      label="Class"
                      value={bsClassId}
                      onChange={(e) => setBsClassId(e.target.value)}
                      options={[
                        { value: '', label: 'Select a Class' },
                        ...classes.map((c: any) => ({ value: String(c.id!), label: c.name }))
                      ]}
                    />
                    
                    <div className="grid grid-cols-2 gap-4">
                       <GlassSelect
                         label="Term"
                         value={bsTerm}
                         onChange={(e) => setBsTerm(e.target.value)}
                         options={[
                           { value: 'Term 1', label: 'Term 1' },
                           { value: 'Term 2', label: 'Term 2' },
                           { value: 'Term 3', label: 'Term 3' }
                         ]}
                       />
                       <GlassInput
                         label="Academic Year"
                         value={bsYear}
                         onChange={(e) => setBsYear(e.target.value)}
                         placeholder="e.g. 2023/2024"
                       />
                    </div>

                    <GlassInput
                      label="Class Teacher's Name"
                      value={bsTeacher}
                      onChange={(e) => setBsTeacher(e.target.value)}
                      placeholder="e.g. Mr. John Doe"
                    />

                    <GlassButton 
                      onClick={handleGenerateBroadsheet} 
                      className="w-full mt-2" 
                      disabled={isGeneratingPdf || !bsClassId}
                    >
                      {isGeneratingPdf ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                      {isGeneratingPdf ? 'Generating PDF...' : 'Download PDF'}
                    </GlassButton>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
