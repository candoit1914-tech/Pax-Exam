import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { studentService } from '../services/studentService';
import { classService } from '../services/classService';
import { subjectService } from '../services/subjectService';
import { scoreService } from '../services/scoreService';
import { teacherService } from '../services/teacherService';

export type ImportEntityType = 'students' | 'teachers' | 'classes' | 'subjects' | 'scores';

export interface ImportResult {
  success: boolean;
  message: string;
  imported: number;
  skipped: number;
  errors: string[];
}

// Auto-detect file format from extension
function detectFormat(file: File): 'csv' | 'xlsx' | 'json' | 'txt' {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'json') return 'json';
  if (ext === 'xlsx' || ext === 'xls') return 'xlsx';
  if (ext === 'txt') return 'txt';
  return 'csv';
}

// Parse file to array of row objects
async function parseFile(file: File): Promise<Record<string, any>[]> {
  const format = detectFormat(file);
  
  if (format === 'json') {
    const text = await file.text();
    const data = JSON.parse(text);
    if (Array.isArray(data)) return data;
    // Support { students: [...] } or { data: [...] } wrapper
    if (data.students) return data.students;
    if (data.teachers) return data.teachers;
    if (data.classes) return data.classes;
    if (data.subjects) return data.subjects;
    if (data.scores) return data.scores;
    if (data.data) return data.data;
    throw new Error('JSON must be an array of objects or have a key (students/teachers/classes/subjects/scores/data)');
  }
  
  if (format === 'txt') {
    const text = await file.text();
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length < 2) throw new Error('TXT file must have a header row and at least one data row');
    // Assume tab or pipe or comma separated
    const separator = lines[0].includes('\t') ? '\t' : lines[0].includes('|') ? '|' : ',';
    const headers = lines[0].split(separator).map(h => h.trim().replace(/^["']|["']$/g, ''));
    return lines.slice(1).map(line => {
      const values = line.split(separator).map(v => v.trim().replace(/^["']|["']$/g, ''));
      const row: Record<string, any> = {};
      headers.forEach((h, i) => { row[h] = values[i] || ''; });
      return row;
    });
  }
  
  // CSV or XLSX - use XLSX library for both
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheet];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' }) as Record<string, any>[];
        resolve(jsonData);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

// Find a column by various possible names
function findCol(row: Record<string, any>, ...candidates: string[]): string | undefined {
  const keys = Object.keys(row);
  for (const c of candidates) {
    const found = keys.find(k => k.trim().toLowerCase() === c.toLowerCase());
    if (found && row[found] !== '' && row[found] !== undefined && row[found] !== null) return found;
  }
  return undefined;
}

// Validate and import students
async function importStudents(rows: Record<string, any>[], onProgress?: (n: number, total: number) => void): Promise<ImportResult> {
  const errors: string[] = [];
  let imported = 0;
  let skipped = 0;
  const total = rows.length;
  
  // Get existing classes for auto-creation
  const existingClasses = await classService.getAll();
  const classMap = new Map(existingClasses.map((c: any) => [c.name.toLowerCase(), c]));
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const nameKey = findCol(row, 'name', 'full name', 'student name');
    const genderKey = findCol(row, 'gender', 'sex');
    const classKey = findCol(row, 'class', 'class name', 'classname');
    const parentNameKey = findCol(row, 'parent name', 'parent', 'guardian', 'guardian name');
    const parentPhoneKey = findCol(row, 'parent phone', 'phone', 'guardian phone', 'telephone', 'contact');
    const dobKey = findCol(row, 'dob', 'date of birth', 'birthdate', 'birth date');
    const admissionYearKey = findCol(row, 'admission year', 'admission_year', 'year', 'year admitted');
    
    if (!nameKey || !String(row[nameKey]).trim()) {
      skipped++;
      errors.push(`Row ${i + 2}: Missing name`);
      if (onProgress && (i + 1) % 5 === 0) onProgress(i + 1, total);
      continue;
    }
    
    const name = String(row[nameKey]).trim();
    const gender = genderKey ? String(row[genderKey]).trim() : 'Male';
    
    // Find or create class
    let classId = 1;
    if (classKey && row[classKey]) {
      const className = String(row[classKey]).trim();
      let cls = classMap.get(className.toLowerCase());
      if (!cls) {
        try {
          const newClass = await classService.create({ name: className, teacher_name: 'Not Assigned' });
          classId = newClass.id;
          classMap.set(className.toLowerCase(), newClass);
        } catch {
          const allClasses = await classService.getAll();
          cls = allClasses.find((c: any) => c.name.toLowerCase() === className.toLowerCase());
          classId = cls?.id || 1;
          if (cls) classMap.set(className.toLowerCase(), cls);
        }
      } else {
        classId = cls.id;
      }
    }
    
    try {
      await studentService.create({
        name,
        gender: gender || 'Male',
        class_id: classId,
        parent_name: parentNameKey ? String(row[parentNameKey] || '').trim() : '',
        parent_phone: parentPhoneKey ? String(row[parentPhoneKey] || '').trim() : '',
        dob: dobKey ? String(row[dobKey] || '').trim() : '',
        admission_year: admissionYearKey ? String(row[admissionYearKey] || '').trim() : '2023/2024',
        status: 'active'
      });
      imported++;
    } catch (err: any) {
      errors.push(`Row ${i + 2} (${name}): ${err?.response?.data?.error || err?.message || 'Failed'}`);
      skipped++;
    }
    
    if (onProgress && (i + 1) % 5 === 0) {
      await new Promise(r => setTimeout(r, 5));
      onProgress(i + 1, total);
    }
  }
  
  if (onProgress) onProgress(total, total);
  return {
    success: imported > 0,
    message: `Imported ${imported} student(s). ${skipped > 0 ? `${skipped} skipped.` : ''}`,
    imported,
    skipped,
    errors
  };
}

// Validate and import teachers
async function importTeachers(rows: Record<string, any>[], onProgress?: (n: number, total: number) => void): Promise<ImportResult> {
  const errors: string[] = [];
  let imported = 0;
  let skipped = 0;
  const total = rows.length;
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const nameKey = findCol(row, 'name', 'full name', 'teacher name');
    const emailKey = findCol(row, 'email', 'e-mail', 'email address');
    
    if (!nameKey || !emailKey || !String(row[nameKey]).trim() || !String(row[emailKey]).trim()) {
      skipped++;
      errors.push(`Row ${i + 2}: Missing name or email`);
      if (onProgress && (i + 1) % 5 === 0) onProgress(i + 1, total);
      continue;
    }
    
    try {
      await teacherService.create({
        name: String(row[nameKey]).trim(),
        email: String(row[emailKey]).trim()
      });
      imported++;
    } catch (err: any) {
      errors.push(`Row ${i + 2}: ${err?.response?.data?.error || 'Failed'}`);
      skipped++;
    }
    
    if (onProgress && (i + 1) % 5 === 0) {
      await new Promise(r => setTimeout(r, 5));
      onProgress(i + 1, total);
    }
  }
  
  if (onProgress) onProgress(total, total);
  return {
    success: imported > 0,
    message: `Imported ${imported} teacher(s). ${skipped > 0 ? `${skipped} skipped.` : ''}`,
    imported,
    skipped,
    errors
  };
}

// Validate and import classes
async function importClasses(rows: Record<string, any>[], onProgress?: (n: number, total: number) => void): Promise<ImportResult> {
  const errors: string[] = [];
  let imported = 0;
  let skipped = 0;
  const total = rows.length;
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const nameKey = findCol(row, 'name', 'class', 'class name');
    const teacherKey = findCol(row, 'teacher', 'teacher name', 'class teacher');
    
    if (!nameKey || !String(row[nameKey]).trim()) {
      skipped++;
      errors.push(`Row ${i + 2}: Missing class name`);
      if (onProgress && (i + 1) % 5 === 0) onProgress(i + 1, total);
      continue;
    }
    
    try {
      await classService.create({
        name: String(row[nameKey]).trim(),
        teacher_name: teacherKey ? String(row[teacherKey] || 'Not Assigned').trim() : 'Not Assigned'
      });
      imported++;
    } catch (err: any) {
      errors.push(`Row ${i + 2}: ${err?.response?.data?.error || 'Failed'}`);
      skipped++;
    }
    
    if (onProgress && (i + 1) % 5 === 0) {
      await new Promise(r => setTimeout(r, 5));
      onProgress(i + 1, total);
    }
  }
  
  if (onProgress) onProgress(total, total);
  return {
    success: imported > 0,
    message: `Imported ${imported} class(es). ${skipped > 0 ? `${skipped} skipped.` : ''}`,
    imported,
    skipped,
    errors
  };
}

// Validate and import subjects
async function importSubjects(rows: Record<string, any>[], onProgress?: (n: number, total: number) => void): Promise<ImportResult> {
  const errors: string[] = [];
  let imported = 0;
  let skipped = 0;
  const total = rows.length;
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const nameKey = findCol(row, 'name', 'subject', 'subject name');
    
    if (!nameKey || !String(row[nameKey]).trim()) {
      skipped++;
      errors.push(`Row ${i + 2}: Missing subject name`);
      if (onProgress && (i + 1) % 5 === 0) onProgress(i + 1, total);
      continue;
    }
    
    try {
      await subjectService.create({ name: String(row[nameKey]).trim() });
      imported++;
    } catch (err: any) {
      errors.push(`Row ${i + 2}: ${err?.response?.data?.error || 'Failed'}`);
      skipped++;
    }
    
    if (onProgress && (i + 1) % 5 === 0) {
      await new Promise(r => setTimeout(r, 5));
      onProgress(i + 1, total);
    }
  }
  
  if (onProgress) onProgress(total, total);
  return {
    success: imported > 0,
    message: `Imported ${imported} subject(s). ${skipped > 0 ? `${skipped} skipped.` : ''}`,
    imported,
    skipped,
    errors
  };
}

// Validate and import scores
async function importScores(rows: Record<string, any>[], onProgress?: (n: number, total: number) => void): Promise<ImportResult> {
  const errors: string[] = [];
  let imported = 0;
  let skipped = 0;
  const total = rows.length;
  
  const existingStudents = await studentService.getAll();
  const existingSubjects = await subjectService.getAll();
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const studentNameKey = findCol(row, 'student', 'student name', 'student_name');
    const subjectNameKey = findCol(row, 'subject', 'subject name', 'subject_name');
    const classScoreKey = findCol(row, 'class score', 'class_score', 'classwork', 'cw', 'coursework');
    const examScoreKey = findCol(row, 'exam score', 'exam_score', 'exam', 'examination');
    const termKey = findCol(row, 'term');
    const yearKey = findCol(row, 'academic year', 'academic_year', 'year');
    
    if (!studentNameKey || !subjectNameKey || !classScoreKey || !examScoreKey) {
      skipped++;
      errors.push(`Row ${i + 2}: Missing required fields (student, subject, class score, exam score)`);
      if (onProgress && (i + 1) % 5 === 0) onProgress(i + 1, total);
      continue;
    }
    
    const studentName = String(row[studentNameKey]).trim();
    const subjectName = String(row[subjectNameKey]).trim();
    const classScore = parseFloat(String(row[classScoreKey]));
    const examScore = parseFloat(String(row[examScoreKey]));
    const term = termKey ? String(row[termKey]).trim() || 'Term 1' : 'Term 1';
    const year = yearKey ? String(row[yearKey]).trim() || '2023/2024' : '2023/2024';
    
    if (isNaN(classScore) || isNaN(examScore)) {
      skipped++;
      errors.push(`Row ${i + 2} (${studentName}): Invalid score values`);
      if (onProgress && (i + 1) % 5 === 0) onProgress(i + 1, total);
      continue;
    }
    
    if (classScore < 0 || classScore > 50 || examScore < 0 || examScore > 50) {
      skipped++;
      errors.push(`Row ${i + 2} (${studentName}): Scores must be 0-50`);
      if (onProgress && (i + 1) % 5 === 0) onProgress(i + 1, total);
      continue;
    }
    
    const student = existingStudents.find((s: any) => s.name.toLowerCase() === studentName.toLowerCase());
    const subject = existingSubjects.find((s: any) => s.name.toLowerCase() === subjectName.toLowerCase());
    
    if (!student) { skipped++; errors.push(`Row ${i + 2}: Student "${studentName}" not found`); continue; }
    if (!subject) { skipped++; errors.push(`Row ${i + 2}: Subject "${subjectName}" not found`); continue; }
    
    try {
      await scoreService.upsert({
        student_id: student.id,
        subject_id: subject.id,
        class_score: classScore,
        exam_score: examScore,
        term,
        academic_year: year
      });
      imported++;
    } catch (err: any) {
      errors.push(`Row ${i + 2}: ${err?.response?.data?.error || 'Failed'}`);
      skipped++;
    }
    
    if (onProgress && (i + 1) % 5 === 0) {
      await new Promise(r => setTimeout(r, 5));
      onProgress(i + 1, total);
    }
  }
  
  if (onProgress) onProgress(total, total);
  return {
    success: imported > 0,
    message: `Imported ${imported} score(s). ${skipped > 0 ? `${skipped} skipped.` : ''}`,
    imported,
    skipped,
    errors
  };
}

// Main import function
export async function importData(
  file: File,
  entityType: ImportEntityType,
  onProgress?: (processed: number, total: number) => void
): Promise<ImportResult> {
  try {
    const rows = await parseFile(file);
    if (!rows || rows.length === 0) {
      return { success: false, message: 'File is empty or contains no data.', imported: 0, skipped: 0, errors: ['Empty file'] };
    }
    
    switch (entityType) {
      case 'students': return importStudents(rows, onProgress);
      case 'teachers': return importTeachers(rows, onProgress);
      case 'classes': return importClasses(rows, onProgress);
      case 'subjects': return importSubjects(rows, onProgress);
      case 'scores': return importScores(rows, onProgress);
      default: return { success: false, message: 'Unknown entity type.', imported: 0, skipped: 0, errors: ['Invalid type'] };
    }
  } catch (err: any) {
    return { success: false, message: `Failed to parse file: ${err.message}`, imported: 0, skipped: 0, errors: [err.message] };
  }
}

// Generate a template for each entity type
export function getTemplateFilename(entityType: ImportEntityType): string {
  switch (entityType) {
    case 'students': return 'students_template.csv';
    case 'teachers': return 'teachers_template.csv';
    case 'classes': return 'classes_template.csv';
    case 'subjects': return 'subjects_template.csv';
    case 'scores': return 'scores_template.csv';
    default: return 'template.csv';
  }
}

export function getTemplateData(entityType: ImportEntityType): Record<string, string>[] {
  switch (entityType) {
    case 'students': return [{ Name: 'John Doe', Gender: 'Male', Class: 'Form 1A', 'Parent Name': 'Jane Doe', 'Parent Phone': '+1234567890' }];
    case 'teachers': return [{ Name: 'Mr. Smith', Email: 'smith@school.com' }];
    case 'classes': return [{ Name: 'Form 1A', Teacher: 'Mr. Smith' }];
    case 'subjects': return [{ Name: 'Mathematics' }];
    case 'scores': return [{ Student: 'John Doe', Subject: 'Mathematics', 'Class Score': 40, 'Exam Score': 35, Term: 'Term 1', 'Academic Year': '2023/2024' }];
    default: return [];
  }
}
