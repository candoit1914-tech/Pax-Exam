import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { studentService } from '../services/studentService';
import { classService } from '../services/classService';
import { subjectService } from '../services/subjectService';
import { scoreService } from '../services/scoreService';
import { teacherService } from '../services/teacherService';
import { resizeImage } from '../utils/images';

const MAX_IMAGE_BYTES = 500_000;

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
      const result = await Filesystem.writeFile({
        path: filename,
        data: json,
        directory: Directory.Downloads,
        encoding: Encoding.UTF8,
      });
      alert(`Backup saved to Downloads/${filename}`);
      return true;
    }

    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return true;
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

interface CreateResult {
  count: number;
  idMap: Map<number, number>;
}

const createBatchWithIdMap = async (
  items: any[],
  service: { create: (item: any) => Promise<any> },
  onProgress?: (done: number, total: number, error?: string) => void,
): Promise<CreateResult> => {
  if (!items?.length) return { count: 0, idMap: new Map() };
  let successCount = 0;
  const idMap = new Map<number, number>();
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const oldId = getId(item);
    try {
      const payload = { ...item };
      delete payload.id;
      delete payload.created_at;
      delete payload.updated_at;
      if (payload.photo) payload.photo = await compressIfLarge(payload.photo);
      const created = await service.create(payload);
      successCount++;
      if (oldId && created?.id) {
        idMap.set(oldId, created.id);
      }
      onProgress?.(i + 1, items.length);
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.response?.data?.error || e?.message || 'Unknown error';
      console.warn('Skipping item:', item?.name || item?.[Object.keys(item)[0]], msg);
      onProgress?.(i + 1, items.length, `Skipped: ${msg}`);
    }
  }
  return { count: successCount, idMap };
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

    onProgress?.('Fetching existing data…', 0, 1);
    const [existingScores, existingStudents, existingSubjects, existingClasses, existingTeachers] = await Promise.all([
      scoreService.getAll(),
      studentService.getAll(),
      subjectService.getAll(),
      classService.getAll(),
      teacherService.getAll(),
    ]);

    onProgress?.('Deleting existing data…', 0, 1);
    await deleteAll(existingScores, scoreService);
    await deleteAll(existingStudents, studentService);
    await deleteAll(existingSubjects, subjectService);
    await deleteAll(existingClasses, classService);
    await deleteAll(existingTeachers, teacherService);

    if (data.schoolProfile) {
      const profile = { ...data.schoolProfile };
      if (profile.logo) profile.logo = await compressIfLarge(profile.logo);
      if (profile.principalSignature) profile.principalSignature = await compressIfLarge(profile.principalSignature);
      if (profile.teacherSignature) profile.teacherSignature = await compressIfLarge(profile.teacherSignature);
      localStorage.setItem('schoolProfile', JSON.stringify(profile));
    }

    const classIdMap = new Map<number, number>();
    const subjectIdMap = new Map<number, number>();
    const studentIdMap = new Map<number, number>();

    let succeeded = 0;
    let failed = 0;

    if (data.classes?.length) {
      const { count, idMap } = await createBatchWithIdMap(data.classes, classService, (d, t, e) => {
        onProgress?.(`Classes ${d}/${t}`, d, t, e);
      });
      succeeded += count;
      failed += data.classes.length - count;
      idMap.forEach((v, k) => classIdMap.set(k, v));
    }

    if (data.subjects?.length) {
      const { count, idMap } = await createBatchWithIdMap(data.subjects, subjectService, (d, t, e) => {
        onProgress?.(`Subjects ${d}/${t}`, d, t, e);
      });
      succeeded += count;
      failed += data.subjects.length - count;
      idMap.forEach((v, k) => subjectIdMap.set(k, v));
    }

    if (data.teachers?.length) {
      const { count } = await createBatchWithIdMap(data.teachers, teacherService, (d, t, e) => {
        onProgress?.(`Teachers ${d}/${t}`, d, t, e);
      });
      succeeded += count;
      failed += data.teachers.length - count;
    }

    if (data.students?.length) {
      const remappedStudents = data.students.map((s: any) => {
        const payload = { ...s };
        delete payload.id;
        delete payload.created_at;
        delete payload.updated_at;
        if (payload.class_id && classIdMap.has(payload.class_id)) {
          payload.class_id = classIdMap.get(payload.class_id);
        }
        return payload;
      });
      const { count, idMap } = await createBatchWithIdMap(remappedStudents, studentService, (d, t, e) => {
        onProgress?.(`Students ${d}/${t}`, d, t, e);
      });
      succeeded += count;
      failed += data.students.length - count;
      idMap.forEach((v, k) => studentIdMap.set(k, v));
    }

    let msg = `Restore complete. ${succeeded} item(s) created.`;
    if (failed > 0) msg += ` ${failed} item(s) skipped (check console).`;
    if (!succeeded && !failed) msg = 'Backup file contains no data.';

    if (data.scores?.length) {
      const remappedScores = data.scores.map((sc: any) => {
        const payload = { ...sc };
        delete payload.id;
        delete payload.created_at;
        delete payload.updated_at;
        delete payload.total;
        if (payload.student_id && studentIdMap.has(payload.student_id)) {
          payload.student_id = studentIdMap.get(payload.student_id);
        }
        if (payload.subject_id && subjectIdMap.has(payload.subject_id)) {
          payload.subject_id = subjectIdMap.get(payload.subject_id);
        }
        return payload;
      });
      try {
        await scoreService.bulkUpsert(remappedScores);
        msg += ` ${data.scores.length} scores upserted.`;
      } catch (e: any) {
        const errMsg = e?.response?.data?.message || e?.response?.data?.error || e?.message || 'Unknown error';
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
