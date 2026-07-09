import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { studentService } from '../services/studentService';
import { classService } from '../services/classService';
import { subjectService } from '../services/subjectService';
import { scoreService } from '../services/scoreService';
import { teacherService } from '../services/teacherService';

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

const createBatch = async (items: any[], service: { create: (item: any) => Promise<any> }) => {
  if (!items?.length) return;
  for (const item of items) {
    try { await service.create(item); } catch (e) { console.warn('Skipping item:', item, e); }
  }
};

export const restoreDatabase = async (fileOrData: any) => {
  try {
    let data;
    if (fileOrData instanceof File) {
      const text = await fileOrData.text();
      data = JSON.parse(text);
    } else {
      data = fileOrData;
    }

    if (!data || typeof data !== 'object') throw new Error("Invalid format");

    // 1. Fetch existing data from server
    const [existingScores, existingStudents, existingSubjects, existingClasses, existingTeachers] = await Promise.all([
      scoreService.getAll(),
      studentService.getAll(),
      subjectService.getAll(),
      classService.getAll(),
      teacherService.getAll(),
    ]);

    // 2. Delete existing data (children first to respect foreign keys)
    await deleteAll(existingScores, scoreService);
    await deleteAll(existingStudents, studentService);
    await deleteAll(existingSubjects, subjectService);
    await deleteAll(existingClasses, classService);
    await deleteAll(existingTeachers, teacherService);

    // 3. Restore school profile
    if (data.schoolProfile) {
      localStorage.setItem('schoolProfile', JSON.stringify(data.schoolProfile));
    }

    // 4. Create backed-up data (parents first)
    await createBatch(data.teachers, teacherService);
    await createBatch(data.classes, classService);
    await createBatch(data.subjects, subjectService);
    await createBatch(data.students, studentService);

    if (data.scores?.length) {
      await scoreService.bulkUpsert(data.scores);
    }

    return true;
  } catch (error: any) {
    console.error("Restore failed:", error);
    throw error;
  }
};
