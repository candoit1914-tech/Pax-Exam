import Papa from 'papaparse';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import db from '../database/db';
import * as XLSX from 'xlsx';

export const exportStudentsToCSV = async () => {
  const students = await db.students.toArray();
  const classes = await db.classes.toArray();
  
  const classMap = Object.fromEntries(classes.map(c => [c.id, c.name]));
  
  const data = students.map(s => ({
    ID: s.id,
    Name: s.name,
    Gender: s.gender,
    Class: classMap[s.class_id] || 'Unknown',
    "Parent Name": s.parent_name || '',
    "Parent Phone": s.parent_phone || ''
  }));

  const csv = Papa.unparse(data);
  return downloadCSV(csv, 'students_export.csv');
};

export const exportScoresToCSV = async () => {
  const scores = await db.scores.toArray();
  const students = await db.students.toArray();
  const subjects = await db.subjects.toArray();
  
  const studentMap = Object.fromEntries(students.map(s => [s.id, s.name]));
  const subjectMap = Object.fromEntries(subjects.map(s => [s.id, s.name]));

  const data = scores.map(s => ({
    "Score ID": s.id,
    "Student": studentMap[s.student_id] || 'Unknown',
    "Subject": subjectMap[s.subject_id] || 'Unknown',
    "Class Score": s.class_score,
    "Exam Score": s.exam_score,
    "Total Score": s.total,
    "Grade": s.grade
  }));

  const csv = Papa.unparse(data);
  return downloadCSV(csv, 'scores_export.csv');
};

const downloadCSV = async (csvData: string, filename: string) => {
  if (Capacitor.isNativePlatform()) {
    try {
      const writeResult = await Filesystem.writeFile({
        path: filename,
        data: csvData,
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
      });
      await Share.share({
        title: 'Export CSV',
        text: `Exported ${filename}`,
        url: writeResult.uri,
        dialogTitle: 'Save or Share CSV'
      });
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  } else {
    try {
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }
};

export const importCsvFile = (file: File, onProgress?: (processed: number, total: number) => void): Promise<{success: boolean, message: string}> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert sheet to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' }) as any[];
        
        if (jsonData.length === 0) {
          resolve({ success: false, message: 'File is empty or contains no data.' });
          return;
        }

        // Get headers from first object
        const headers = Object.keys(jsonData[0]).map(h => h.trim().toLowerCase());
        
        // Find which columns map to which
        const nameKey = Object.keys(jsonData[0]).find(k => k.trim().toLowerCase() === 'name');
        const genderKey = Object.keys(jsonData[0]).find(k => k.trim().toLowerCase() === 'gender');
        const classKey = Object.keys(jsonData[0]).find(k => k.trim().toLowerCase() === 'class');
        const parentNameKey = Object.keys(jsonData[0]).find(k => k.trim().toLowerCase() === 'parent name');
        const parentPhoneKey = Object.keys(jsonData[0]).find(k => k.trim().toLowerCase() === 'parent phone');
        
        if (nameKey && genderKey) {
          // Import Students
          const classes = await db.classes.toArray();
          const rowsToProcess = jsonData.filter(row => row[nameKey] && row[genderKey]);
          const total = rowsToProcess.length;
          let added = 0;

          if (onProgress) onProgress(0, total);

          for (const row of rowsToProcess) {
             const name = row[nameKey];
             const gender = row[genderKey];
             const className = classKey ? row[classKey] : null;
             const pName = parentNameKey ? row[parentNameKey] : '';
             const pPhone = parentPhoneKey ? row[parentPhoneKey] : '';
             
             // Find or create class
             let classId = classes.length > 0 ? classes[0].id! : 1;
             if (className) {
                let cls = classes.find(c => c.name.toLowerCase() === String(className).toLowerCase());
                if (!cls) {
                   classId = await db.classes.add({ name: String(className) });
                   classes.push({ id: classId, name: String(className), teacher_name: 'Not Assigned' });
                } else {
                   classId = cls.id!;
                }
             }
             
             await db.students.add({
               name: String(name),
               gender: String(gender),
               class_id: classId,
               parent_name: String(pName),
               parent_phone: String(pPhone),
               status: 'active'
             });
             added++;
             if (onProgress && added % 5 === 0) {
               // yield to allow UI to update
               await new Promise(r => setTimeout(r, 10));
               onProgress(added, total);
             }
          }
          if (onProgress) onProgress(total, total);
          resolve({ success: true, message: `Successfully imported ${added} students!` });
        } else {
           resolve({ success: false, message: 'File format not recognized. Ensure columns include "Name" and "Gender".' });
        }
      } catch (err) {
        console.error(err);
        resolve({ success: false, message: 'Error processing file data. Make sure it is a valid CSV or Excel file.' });
      }
    };
    reader.readAsArrayBuffer(file);
  });
};
