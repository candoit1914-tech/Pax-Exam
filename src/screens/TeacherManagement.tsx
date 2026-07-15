import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { GlassCard, GlassInput, GlassButton } from '../components/ui/Glass';
import { UserPlus, Key, Copy, Check, Users, RefreshCw, X, Pencil, Trash2 } from 'lucide-react';
import { authService } from '../services/authService';

export const TeacherManagementScreen = () => {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [createdCredentials, setCreatedCredentials] = useState<{email: string; password: string} | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');

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
      setSuccess(`Teacher created successfully!`);
      setCreatedCredentials(result.credentials);
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
      setSuccess(`Password reset successfully!`);
      setCreatedCredentials(result.credentials);
      await loadTeachers();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to reset password.');
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || !editName || !editEmail) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await authService.updateTeacher(editingId, editName, editEmail);
      setSuccess('Teacher updated successfully!');
      setEditingId(null);
      setEditName('');
      setEditEmail('');
      await loadTeachers();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update teacher.');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (teacher: any) => {
    setEditingId(teacher.id);
    setEditName(teacher.name);
    setEditEmail(teacher.email);
    setSuccess('');
    setError('');
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete teacher "${name}"? This cannot be undone.`)) return;
    try {
      await authService.deleteTeacher(id);
      setSuccess('Teacher deleted successfully!');
      await loadTeachers();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete teacher.');
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
        <GlassButton onClick={() => { setShowForm(!showForm); setCreatedCredentials(null); setSuccess(''); }} sizing="sm">
          {showForm ? <X size={16} /> : <UserPlus size={16} />}
          {showForm ? 'Cancel' : 'Add Teacher'}
        </GlassButton>
      </div>

      {error && <p className="text-red-600 text-xs bg-red-50 p-2 rounded-lg">{error}</p>}
      {success && (
        <div className="bg-green-50 border border-green-200 p-3 rounded-xl space-y-2">
          <p className="text-green-700 text-xs font-bold">{success}</p>
          {createdCredentials && (
            <div className="bg-white rounded-lg p-3 border border-green-100 space-y-2">
              <p className="text-xs text-slate-600 font-medium">Login Credentials:</p>
              <div className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-bold">Email</p>
                  <p className="text-sm font-bold text-slate-800">{createdCredentials.email}</p>
                </div>
                <GlassButton sizing="sm" variant="secondary" onClick={() => copyToClipboard(createdCredentials.email)}>
                  {copied === createdCredentials.email ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                </GlassButton>
              </div>
              <div className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-bold">Password</p>
                  <p className="text-sm font-bold text-slate-800 font-mono tracking-wide">{createdCredentials.password}</p>
                </div>
                <GlassButton sizing="sm" variant="secondary" onClick={() => copyToClipboard(createdCredentials.password)}>
                  {copied === createdCredentials.password ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                </GlassButton>
              </div>
              <GlassButton sizing="sm" onClick={() => copyToClipboard(`Email: ${createdCredentials.email}\nPassword: ${createdCredentials.password}`)}>
                {copied === `Email: ${createdCredentials.email}\nPassword: ${createdCredentials.password}` ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                Copy Both
              </GlassButton>
            </div>
          )}
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
            <GlassCard key={t.id} className="p-4 flex flex-col gap-3">
              {editingId === t.id ? (
                <form onSubmit={handleEditSubmit} className="space-y-2 w-full">
                  <GlassInput label="Full Name" value={editName} onChange={e => setEditName(e.target.value)} sizing="sm" required />
                  <GlassInput label="Email" type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} sizing="sm" required />
                  <div className="flex gap-2">
                    <GlassButton type="submit" disabled={loading} sizing="sm" className="flex-1">
                      {loading ? 'Saving...' : 'Save'}
                    </GlassButton>
                    <GlassButton sizing="sm" variant="secondary" onClick={() => setEditingId(null)} className="flex-1">
                      Cancel
                    </GlassButton>
                  </div>
                </form>
              ) : (
                <>
                  <div>
                    <p className="font-bold text-slate-800 text-sm">{t.name}</p>
                    <p className="text-slate-500 text-xs">{t.email}</p>
                    <p className="text-[10px] text-slate-400">Active: {t.is_active ? 'Yes' : 'No'}</p>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    <GlassButton sizing="sm" variant="secondary" onClick={() => startEdit(t)}>
                      <Pencil size={14} /> <span className="hidden min-[400px]:inline">Edit</span>
                    </GlassButton>
                    <GlassButton sizing="sm" variant="secondary" onClick={() => handleReset(t.id)}>
                      <RefreshCw size={14} /> <span className="hidden min-[400px]:inline">Reset</span>
                    </GlassButton>
                    <GlassButton sizing="sm" variant="secondary" onClick={() => handleDelete(t.id, t.name)}>
                      <Trash2 size={14} /> <span className="hidden min-[400px]:inline">Delete</span>
                    </GlassButton>
                  </div>
                </>
              )}
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
};
