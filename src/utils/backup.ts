import db from '../database/db';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export const exportBackup = async () => {
  const filename = `Ok20_Backup_${new Date().toISOString().split('T')[0]}.json`;

  try {
    if (Capacitor.isNativePlatform()) {
      // 1. Initialize file with start of JSON
      await Filesystem.writeFile({
        path: filename,
        data: '{"_timestamp":"' + new Date().toISOString() + '",',
        directory: Directory.Cache,
        encoding: Encoding.UTF8
      });

      // 2. Append school profile
      const sp = localStorage.getItem('schoolProfile') || 'null';
      await Filesystem.appendFile({
        path: filename,
        data: '"schoolProfile":' + sp + ',',
        directory: Directory.Cache,
        encoding: Encoding.UTF8
      });

      // 3. Process tables sequentially and in batches to prevent memory spikes
      const tables = ['students', 'teachers', 'classes', 'subjects', 'scores'];

      for (let i = 0; i < tables.length; i++) {
        const table = tables[i];
        await Filesystem.appendFile({
          path: filename,
          data: '"' + table + '":[',
          directory: Directory.Cache,
          encoding: Encoding.UTF8
        });

        const allRows = await (db as any)[table].toArray();
        // Use a smaller batch size for students because of photos
        const batchSize = table === 'students' ? 5 : 50;

        for (let j = 0; j < allRows.length; j += batchSize) {
          const batch = allRows.slice(j, j + batchSize);
          let batchString = batch.map(row => JSON.stringify(row)).join(',');

          if (j + batchSize < allRows.length) {
            batchString += ',';
          }

          await Filesystem.appendFile({
            path: filename,
            data: batchString,
            directory: Directory.Cache,
            encoding: Encoding.UTF8
          });

          // Yield to UI thread
          await new Promise(resolve => setTimeout(resolve, 0));
        }

        await Filesystem.appendFile({
          path: filename,
          data: i < tables.length - 1 ? '],' : ']',
          directory: Directory.Cache,
          encoding: Encoding.UTF8
        });
      }

      // 4. Close JSON
      await Filesystem.appendFile({
        path: filename,
        data: '}',
        directory: Directory.Cache,
        encoding: Encoding.UTF8
      });

      // 5. Get URI and Share
      const uriResult = await Filesystem.getUri({
        path: filename,
        directory: Directory.Cache
      });

      await Share.share({
        title: 'Ok20 School Backup',
        text: 'Full backup of all school records.',
        url: uriResult.uri,
        dialogTitle: 'Save Backup'
      });

      return true;
    } else {
      // Web logic - build standard object and download
      const [students, teachers, classes, subjects, scores] = await Promise.all([
        db.students.toArray(),
        db.teachers.toArray(),
        db.classes.toArray(),
        db.subjects.toArray(),
        db.scores.toArray()
      ]);

      const backupData = {
        students, teachers, classes, subjects, scores,
        schoolProfile: JSON.parse(localStorage.getItem('schoolProfile') || 'null'),
        _timestamp: new Date().toISOString()
      };

      const blob = new Blob([JSON.stringify(backupData)], { type: 'application/json' });
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

    await db.transaction('rw', [db.students, db.teachers, db.classes, db.subjects, db.scores], async () => {
      await Promise.all([
        db.students.clear(),
        db.teachers.clear(),
        db.classes.clear(),
        db.subjects.clear(),
        db.scores.clear()
      ]);

      if (data.students?.length) await db.students.bulkAdd(data.students);
      if (data.teachers?.length) await db.teachers.bulkAdd(data.teachers);
      if (data.classes?.length) await db.classes.bulkAdd(data.classes);
      if (data.subjects?.length) await db.subjects.bulkAdd(data.subjects);
      if (data.scores?.length) await db.scores.bulkAdd(data.scores);
    });

    if (data.schoolProfile) {
      localStorage.setItem('schoolProfile', JSON.stringify(data.schoolProfile));
    }
    return true;
  } catch (error: any) {
    console.error("Restore failed:", error);
    throw error;
  }
};
