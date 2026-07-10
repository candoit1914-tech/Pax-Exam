import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { studentService } from '../services/studentService';
import { classService } from '../services/classService';
import { subjectService } from '../services/subjectService';
import { scoreService } from '../services/scoreService';
import { teacherService } from '../services/teacherService';
import { resizeImage } from '../utils/images';

const MAX_IMAGE_BYTES = 500_000; // 500KB — resize if larger

const compressIfLarge = async (value: string | undefined): Promise<string | undefined> => {
  if (!value || !value.startsWith('data:image')) return value;
  if (value.length <= MAX_IMAGE_BYTES) return value;
  try {
    return await resizeImage(value);
  } catch {
    return value;
  }
};

export const exportBackup = async () => {
  const filename = `Ok20_Backup_${new Date().toISOString().split('T')[0]}.json`;

  try {
    const [students, teachers, classes, subjects, scores] = await Promise.all([
      studentService.getAll(),
      teacherService.getAll(),
      classService.getAll(),
      subjectService.getAll(),
      scoreService.getAll(),
    ]);

    const backupData = {
      students, teachers, classes, subjects, scores,
      schoolProfile: JSON.parse(localStorage.getItem('schoolProfile') || 'null'),
      _timestamp: new Date().toISOString()
    };

    const json = JSON.stringify(backupData);

    if (Capacitor.isNativePlatform()) {
      await Filesystem.writeFile({
        path: filename,
        data: json,
        directory: Directory.Documents,
        encoding: Encoding.UTF8
      });
      return true;
    } else {
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.body.appendChild(document.createElement('a'));
      a.href = url;
      a.download = filename;
      a.click();
      setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
      return true;
    }
  } catch (error: any) {
    console.error("Backup failed:", error);
    alert(`Backup error: ${error.message || 'The data is too large'}`);
    return false;
  }
};

const getId = (item: any) => item.id ?? item._id;

const deleteAll = async (items: any[], service: { delete: (id: any) => Promise<any> }) => {
  if (!items?.length) return;
  const ids = items.map(getId).filter(Boolean);
  if (!ids.length) return;
  await Promise.all(ids.map(id => service.delete(id).catch(e => console.warn('Delete failed:', id, e))));
};

const createBatch = async (
  items: any[],
  service: { create: (item: any) => Promise<any> },
  onProgress?: (done: number, total: number, error?: string) => void,
) => {
  if (!items?.length) return 0;
  let successCount = 0;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    try {
      const payload = { ...item };
      if (payload.photo) payload.photo = await compressIfLarge(payload.photo);
      await service.create(payload);
      successCount++;
      onProgress?.(i + 1, items.length);
    } catch (e: any) {
      const msg = e?.response?.data?.error || e?.message || 'Unknown error';
      console.warn('Skipping item:', item?.[Object.keys(item)[0]], e);
      onProgress?.(i + 1, items.length, `Skipped: ${msg}`);
    }
  }
  return successCount;
};

export const restoreDatabase = async (
  fileOrData: any,
  onProgress?: (phase: string, done: number, total: number, error?: string) => void,
): Promise<{ success: boolean; message: string }> => {
  try {
    let data;
    if (fileOrData instanceof File) {
      onProgress?.('Reading file…', 0, 1);
      const text = await fileOrData.text();
      data = JSON.parse(text);
    } else {
      data = fileOrData;
    }

    if (!data || typeof data !== 'object') throw new Error("Invalid backup format");

    // 1. Fetch existing data from server
    onProgress?.('Fetching existing data…', 0, 1);
    const [existingScores, existingStudents, existingSubjects, existingClasses, existingTeachers] = await Promise.all([
      scoreService.getAll(),
      studentService.getAll(),
      subjectService.getAll(),
      classService.getAll(),
      teacherService.getAll(),
    ]);

    // 2. Delete existing data (children first to respect foreign keys)
    onProgress?.('Deleting existing data…', 0, 1);
    await deleteAll(existingScores, scoreService);
    await deleteAll(existingStudents, studentService);
    await deleteAll(existingSubjects, subjectService);
    await deleteAll(existingClasses, classService);
    await deleteAll(existingTeachers, teacherService);

    // 3. Restore school profile (compress large images)
    if (data.schoolProfile) {
      const profile = { ...data.schoolProfile };
      if (profile.logo) profile.logo = await compressIfLarge(profile.logo);
      if (profile.principalSignature) profile.principalSignature = await compressIfLarge(profile.principalSignature);
      if (profile.teacherSignature) profile.teacherSignature = await compressIfLarge(profile.teacherSignature);
      localStorage.setItem('schoolProfile', JSON.stringify(profile));
    }

    // 4. Create backed-up data (parents first)
    const totals = [
      { label: 'Teachers', items: data.teachers, service: teacherService },
      { label: 'Classes', items: data.classes, service: classService },
      { label: 'Subjects', items: data.subjects, service: subjectService },
      { label: 'Students', items: data.students, service: studentService },
    ];

    let succeeded = 0;
    let failed = 0;

    for (const { label, items, service } of totals) {
      if (!items?.length) continue;
      const count = await createBatch(items, service, (d, t, e) => {
        onProgress?.(`${label} ${d}/${t}`, d, t, e);
      });
      succeeded += count;
      failed += items.length - count;
    }

    let msg = `Restore complete. ${succeeded} item(s) created.`;
    if (failed > 0) msg += ` ${failed} item(s) skipped (check console).`;
    if (!succeeded && !failed) msg = 'Backup file contains no data.';

    // 5. Scores
    if (data.scores?.length) {
      try {
        await scoreService.bulkUpsert(data.scores);
        msg += ` ${data.scores.length} scores upserted.`;
      } catch (e: any) {
        const errMsg = e?.response?.data?.error || e?.message || 'Unknown error';
        msg += ` Scores failed: ${errMsg}`;
      }
    }

    onProgress?.('Done', 1, 1);
    return { success: true, message: msg };
  } catch (error: any) {
    const msg = error?.message || 'Unknown error during restore';
    console.error("Restore failed:", error);
    onProgress?.('Error', 0, 1, msg);
    return { success: false, message: `Restore failed: ${msg}` };
  }
};
