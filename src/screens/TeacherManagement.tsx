import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { GlassCard, GlassInput, GlassButton } from '../components/ui/Glass';
import { UserPlus, Key, Copy, Check, Users, RefreshCw, X } from 'lucide-react';
import { authService } from '../services/authService';

export const TeacherManagementScreen = () => {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const loadTeachers = async () => {
    try {
      const data = await authService.listTeachers();
      setTeachers(data);
    } catch { }
  };

  useEffect(() => { loadTeachers(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) { setError('Name and email required.'); return; }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const result = await authService.createTeacher(name, email);
      setSuccess(`Teacher created! Password: ${result.credentials.password}`);
      setName('');
      setEmail('');
      setShowForm(false);
      await loadTeachers();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create teacher.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (id: number) => {
    if (!confirm('Reset this teacher\'s password?')) return;
    try {
      const result = await authService.resetTeacherPassword(id);
      setSuccess(`Password reset! New password: ${result.credentials.password}`);
      await loadTeachers();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to reset password.');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-slate-800">Teacher Accounts</h2>
        <GlassButton onClick={() => setShowForm(!showForm)} sizing="sm">
          {showForm ? <X size={16} /> : <UserPlus size={16} />}
          {showForm ? 'Cancel' : 'Add Teacher'}
        </GlassButton>
      </div>

      {error && <p className="text-red-600 text-xs bg-red-50 p-2 rounded-lg">{error}</p>}
      {success && (
        <div className="bg-green-50 border border-green-200 p-3 rounded-xl space-y-1">
          <p className="text-green-700 text-xs font-bold">{success}</p>
          <GlassButton sizing="sm" onClick={() => copyToClipboard(success.split(': ')[1])}>
            {copied === success.split(': ')[1] ? <Check size={14} /> : <Copy size={14} />}
            Copy Password
          </GlassButton>
        </div>
      )}

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <GlassCard className="p-4 space-y-3">
            <h3 className="text-sm font-bold text-slate-700">New Teacher</h3>
            <form onSubmit={handleCreate} className="space-y-3">
              <GlassInput label="Full Name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. John Doe" sizing="sm" required />
              <GlassInput label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="teacher@school.com" sizing="sm" required />
              <GlassButton type="submit" disabled={loading} className="w-full">
                <UserPlus size={16} /> {loading ? 'Creating...' : 'Create & Generate Password'}
              </GlassButton>
            </form>
          </GlassCard>
        </motion.div>
      )}

      {teachers.length === 0 ? (
        <p className="text-center text-slate-500 text-sm py-8">No teachers yet. Add one above.</p>
      ) : (
        <div className="space-y-2 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-3 md:space-y-0">
          {teachers.map((t: any) => (
            <GlassCard key={t.id} className="p-4 flex justify-between items-center md:flex-col md:items-start md:gap-3">
              <div>
                <p className="font-bold text-slate-800 text-sm">{t.name}</p>
                <p className="text-slate-500 text-xs">{t.email}</p>
                <p className="text-[10px] text-slate-400">Active: {t.is_active ? 'Yes' : 'No'}</p>
              </div>
              <GlassButton sizing="sm" variant="secondary" onClick={() => handleReset(t.id)}>
                <RefreshCw size={14} /> Reset
              </GlassButton>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
};
