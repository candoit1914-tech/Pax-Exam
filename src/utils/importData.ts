import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { studentService } from '../services/studentService';
import { classService } from '../services/classService';
import { subjectService } from '../services/subjectService';
import { scoreService } from '../services/scoreService';
import { teacherService } from '../services/teacherService';

export type ImportEntityType = 'students' | 'teachers' | 'classes' | 'subjects' | 'scores';

export interface ImportError {
  row: number;
  name?: string;
  field?: string;
  message: string;
}

export interface ImportResult {
  success: boolean;
  message: string;
  imported: number;
  skipped: number;
  errors: string[];
  errorDetails: ImportError[];
}

function detectFormat(file: File): 'csv' | 'xlsx' | 'json' | 'txt' | 'docx' {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'json') return 'json';
  if (ext === 'xlsx' || ext === 'xls') return 'xlsx';
  if (ext === 'txt') return 'txt';
  if (ext === 'docx' || ext === 'doc') return 'docx';
  return 'csv';
}

async function parseFile(file: File): Promise<Record<string, any>[]> {
  const format = detectFormat(file);

  if (format === 'json') {
    const text = await file.text();
    const data = JSON.parse(text);
    if (Array.isArray(data)) return data;
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
    const separator = lines[0].includes('\t') ? '\t' : lines[0].includes('|') ? '|' : ',';
    const headers = lines[0].split(separator).map(h => h.trim().replace(/^["']|["']$/g, ''));
    return lines.slice(1).map(line => {
      const values = line.split(separator).map(v => v.trim().replace(/^["']|["']$/g, ''));
      const row: Record<string, any> = {};
      headers.forEach((h, i) => { row[h] = values[i] || ''; });
      return row;
    });
  }

  if (format === 'docx') {
    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);
    const docXml = await zip.file('word/document.xml')?.async('text');
    if (!docXml) throw new Error('Could not find document content in the DOCX file');

    const parser = new DOMParser();
    const doc = parser.parseFromString(docXml, 'application/xml');
    const rows = doc.querySelectorAll('w\\:tr');

    if (rows.length < 2) throw new Error('DOCX file must contain a table with at least a header row and one data row');

    const getCellText = (row: Element): string[] => {
      const cells = row.querySelectorAll('w\\:tc');
      return Array.from(cells).map(cell => {
        const textNodes = cell.querySelectorAll('w\\:t');
        return Array.from(textNodes).map(t => t.textContent || '').join(' ').trim();
      });
    };

    const headerRow = getCellText(rows[0]);
    const headers = headerRow.map(h => h.replace(/^["']|["']$/g, ''));

    const result: Record<string, any>[] = [];
    for (let i = 1; i < rows.length; i++) {
      const values = getCellText(rows[i]);
      const row: Record<string, any> = {};
      headers.forEach((h, idx) => { row[h] = values[idx] || ''; });
      if (Object.values(row).some(v => v !== '')) {
        result.push(row);
      }
    }
    return result;
  }

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

function findCol(row: Record<string, any>, ...candidates: string[]): string | undefined {
  const keys = Object.keys(row);
  for (const c of candidates) {
    const found = keys.find(k => k.trim().toLowerCase() === c.toLowerCase());
    if (found && row[found] !== '' && row[found] !== undefined && row[found] !== null) return found;
  }
  return undefined;
}

function safeTrim(val: any): string {
  if (val === undefined || val === null) return '';
  return String(val).trim();
}

function isValidDate(dateStr: string): boolean {
  if (!dateStr) return true;
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

function normalizeGender(raw: string): string {
  const g = raw.toLowerCase().trim();
  if (g === 'male' || g === 'm') return 'Male';
  if (g === 'female' || g === 'f') return 'Female';
  return raw || 'Male';
}

function validateStudentRow(row: Record<string, any>, rowIndex: number, nameKey?: string, genderKey?: string, classKey?: string, dobKey?: string): ImportError | null {
  if (!nameKey || !safeTrim(row[nameKey])) {
    return { row: rowIndex, field: 'name', message: 'Missing name' };
  }
  if (genderKey) {
    const gender = safeTrim(row[genderKey]);
    if (gender && !['male', 'female', 'm', 'f'].includes(gender.toLowerCase())) {
      return { row: rowIndex, name: safeTrim(row[nameKey]), field: 'gender', message: `Invalid gender "${gender}". Expected Male, Female, M, or F` };
    }
  }
  if (dobKey) {
    const dob = safeTrim(row[dobKey]);
    if (dob && !isValidDate(dob)) {
      return { row: rowIndex, name: safeTrim(row[nameKey]), field: 'dob', message: `Invalid date of birth "${dob}". Expected a valid date format` };
    }
  }
  return null;
}

async function importStudents(rows: Record<string, any>[], onProgress?: (n: number, total: number) => void): Promise<ImportResult> {
  const errors: string[] = [];
  const errorDetails: ImportError[] = [];
  let imported = 0;
  let skipped = 0;
  const total = rows.length;

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

    const validationError = validateStudentRow(row, i + 2, nameKey, genderKey, classKey, dobKey);
    if (validationError) {
      skipped++;
      errors.push(`Row ${validationError.row}${validationError.name ? ` (${validationError.name})` : ''}: ${validationError.message}`);
      errorDetails.push(validationError);
      if (onProgress && (i + 1) % 5 === 0) onProgress(i + 1, total);
      continue;
    }

    const name = safeTrim(row[nameKey!]);
    const gender = normalizeGender(genderKey ? safeTrim(row[genderKey]) : 'Male');

    let classId: number | null = null;
    if (classKey && row[classKey]) {
      const className = safeTrim(row[classKey]);
      let cls = classMap.get(className.toLowerCase());
      if (!cls) {
        try {
          const newClass = await classService.create({ name: className, teacher_name: 'Not Assigned' });
          classId = newClass.id;
          classMap.set(className.toLowerCase(), newClass);
        } catch {
          const allClasses = await classService.getAll();
          cls = allClasses.find((c: any) => c.name.toLowerCase() === className.toLowerCase());
          if (cls) {
            classId = cls.id;
            classMap.set(className.toLowerCase(), cls);
          }
        }
      } else {
        classId = cls.id;
      }
    }

    if (!classId) {
      if (existingClasses.length > 0) {
        classId = existingClasses[0].id;
      } else {
        skipped++;
        const errMsg = `Row ${i + 2} (${name}): No classes exist. Create at least one class before importing students.`;
        errors.push(errMsg);
        errorDetails.push({ row: i + 2, name, field: 'class_id', message: 'No classes available' });
        if (onProgress && (i + 1) % 5 === 0) onProgress(i + 1, total);
        continue;
      }
    }

    const dobValue = dobKey ? safeTrim(row[dobKey]) : '';
    const dobToSend = dobValue && isValidDate(dobValue) ? dobValue : null;

    try {
      await studentService.create({
        name,
        gender,
        class_id: classId,
        parent_name: parentNameKey ? safeTrim(row[parentNameKey]) : null,
        parent_phone: parentPhoneKey ? safeTrim(row[parentPhoneKey]) : null,
        dob: dobToSend,
        admission_year: admissionYearKey ? safeTrim(row[admissionYearKey]) : null,
        status: 'active'
      });
      imported++;
    } catch (err: any) {
      const serverMsg = err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Failed';
      const serverField = err?.response?.data?.field || 'unknown';
      const errMsg = `Row ${i + 2} (${name}): ${serverMsg}`;
      errors.push(errMsg);
      errorDetails.push({ row: i + 2, name, field: serverField, message: serverMsg });
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
    errors,
    errorDetails,
  };
}

async function importTeachers(rows: Record<string, any>[], onProgress?: (n: number, total: number) => void): Promise<ImportResult> {
  const errors: string[] = [];
  const errorDetails: ImportError[] = [];
  let imported = 0;
  let skipped = 0;
  const total = rows.length;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const nameKey = findCol(row, 'name', 'full name', 'teacher name');
    const emailKey = findCol(row, 'email', 'e-mail', 'email address');

    if (!nameKey || !emailKey || !safeTrim(row[nameKey]) || !safeTrim(row[emailKey])) {
      skipped++;
      const missing = !nameKey || !safeTrim(row[nameKey]) ? 'name' : 'email';
      const msg = `Row ${i + 2}: Missing ${missing}`;
      errors.push(msg);
      errorDetails.push({ row: i + 2, field: missing, message: `Missing ${missing}` });
      if (onProgress && (i + 1) % 5 === 0) onProgress(i + 1, total);
      continue;
    }

    try {
      await teacherService.create({
        name: safeTrim(row[nameKey]),
        email: safeTrim(row[emailKey])
      });
      imported++;
    } catch (err: any) {
      const serverMsg = err?.response?.data?.message || err?.response?.data?.error || 'Failed';
      errors.push(`Row ${i + 2}: ${serverMsg}`);
      errorDetails.push({ row: i + 2, name: safeTrim(row[nameKey]), field: 'server', message: serverMsg });
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
    errors,
    errorDetails,
  };
}

async function importClasses(rows: Record<string, any>[], onProgress?: (n: number, total: number) => void): Promise<ImportResult> {
  const errors: string[] = [];
  const errorDetails: ImportError[] = [];
  let imported = 0;
  let skipped = 0;
  const total = rows.length;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const nameKey = findCol(row, 'name', 'class', 'class name');
    const teacherKey = findCol(row, 'teacher', 'teacher name', 'class teacher');

    if (!nameKey || !safeTrim(row[nameKey])) {
      skipped++;
      errors.push(`Row ${i + 2}: Missing class name`);
      errorDetails.push({ row: i + 2, field: 'name', message: 'Missing class name' });
      if (onProgress && (i + 1) % 5 === 0) onProgress(i + 1, total);
      continue;
    }

    try {
      await classService.create({
        name: safeTrim(row[nameKey]),
        teacher_name: teacherKey ? safeTrim(row[teacherKey]) || 'Not Assigned' : 'Not Assigned'
      });
      imported++;
    } catch (err: any) {
      const serverMsg = err?.response?.data?.message || err?.response?.data?.error || 'Failed';
      errors.push(`Row ${i + 2}: ${serverMsg}`);
      errorDetails.push({ row: i + 2, name: safeTrim(row[nameKey]), field: 'server', message: serverMsg });
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
    errors,
    errorDetails,
  };
}

async function importSubjects(rows: Record<string, any>[], onProgress?: (n: number, total: number) => void): Promise<ImportResult> {
  const errors: string[] = [];
  const errorDetails: ImportError[] = [];
  let imported = 0;
  let skipped = 0;
  const total = rows.length;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const nameKey = findCol(row, 'name', 'subject', 'subject name');

    if (!nameKey || !safeTrim(row[nameKey])) {
      skipped++;
      errors.push(`Row ${i + 2}: Missing subject name`);
      errorDetails.push({ row: i + 2, field: 'name', message: 'Missing subject name' });
      if (onProgress && (i + 1) % 5 === 0) onProgress(i + 1, total);
      continue;
    }

    try {
      await subjectService.create({ name: safeTrim(row[nameKey]) });
      imported++;
    } catch (err: any) {
      const serverMsg = err?.response?.data?.message || err?.response?.data?.error || 'Failed';
      errors.push(`Row ${i + 2}: ${serverMsg}`);
      errorDetails.push({ row: i + 2, name: safeTrim(row[nameKey]), field: 'server', message: serverMsg });
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
    errors,
    errorDetails,
  };
}

async function importScores(rows: Record<string, any>[], onProgress?: (n: number, total: number) => void): Promise<ImportResult> {
  const errors: string[] = [];
  const errorDetails: ImportError[] = [];
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
      const missingFields = [];
      if (!studentNameKey) missingFields.push('student');
      if (!subjectNameKey) missingFields.push('subject');
      if (!classScoreKey) missingFields.push('class score');
      if (!examScoreKey) missingFields.push('exam score');
      const msg = `Row ${i + 2}: Missing required fields (${missingFields.join(', ')})`;
      errors.push(msg);
      errorDetails.push({ row: i + 2, field: missingFields.join(', '), message: msg });
      if (onProgress && (i + 1) % 5 === 0) onProgress(i + 1, total);
      continue;
    }

    const studentName = safeTrim(row[studentNameKey]);
    const subjectName = safeTrim(row[subjectNameKey]);
    const classScore = parseFloat(String(row[classScoreKey]));
    const examScore = parseFloat(String(row[examScoreKey]));
    const term = termKey ? safeTrim(row[termKey]) || 'Term 1' : 'Term 1';
    const year = yearKey ? safeTrim(row[yearKey]) || '2023/2024' : '2023/2024';

    if (isNaN(classScore) || isNaN(examScore)) {
      skipped++;
      const msg = `Row ${i + 2} (${studentName}): Invalid score values`;
      errors.push(msg);
      errorDetails.push({ row: i + 2, name: studentName, field: 'scores', message: 'Invalid score values' });
      if (onProgress && (i + 1) % 5 === 0) onProgress(i + 1, total);
      continue;
    }

    if (classScore < 0 || classScore > 50 || examScore < 0 || examScore > 50) {
      skipped++;
      const msg = `Row ${i + 2} (${studentName}): Scores must be 0-50`;
      errors.push(msg);
      errorDetails.push({ row: i + 2, name: studentName, field: 'scores', message: 'Scores must be 0-50' });
      if (onProgress && (i + 1) % 5 === 0) onProgress(i + 1, total);
      continue;
    }

    const student = existingStudents.find((s: any) => s.name.toLowerCase() === studentName.toLowerCase());
    const subject = existingSubjects.find((s: any) => s.name.toLowerCase() === subjectName.toLowerCase());

    if (!student) {
      skipped++;
      const msg = `Row ${i + 2}: Student "${studentName}" not found`;
      errors.push(msg);
      errorDetails.push({ row: i + 2, name: studentName, field: 'student_id', message: `Student "${studentName}" not found in database` });
      continue;
    }
    if (!subject) {
      skipped++;
      const msg = `Row ${i + 2}: Subject "${subjectName}" not found`;
      errors.push(msg);
      errorDetails.push({ row: i + 2, name: studentName, field: 'subject_id', message: `Subject "${subjectName}" not found in database` });
      continue;
    }

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
      const serverMsg = err?.response?.data?.message || err?.response?.data?.error || 'Failed';
      errors.push(`Row ${i + 2} (${studentName}): ${serverMsg}`);
      errorDetails.push({ row: i + 2, name: studentName, field: 'server', message: serverMsg });
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
    errors,
    errorDetails,
  };
}

export async function importData(
  file: File,
  entityType: ImportEntityType,
  onProgress?: (processed: number, total: number) => void
): Promise<ImportResult> {
  try {
    const rows = await parseFile(file);
    if (!rows || rows.length === 0) {
      return { success: false, message: 'File is empty or contains no data.', imported: 0, skipped: 0, errors: ['Empty file'], errorDetails: [] };
    }

    switch (entityType) {
      case 'students': return importStudents(rows, onProgress);
      case 'teachers': return importTeachers(rows, onProgress);
      case 'classes': return importClasses(rows, onProgress);
      case 'subjects': return importSubjects(rows, onProgress);
      case 'scores': return importScores(rows, onProgress);
      default: return { success: false, message: 'Unknown entity type.', imported: 0, skipped: 0, errors: ['Invalid type'], errorDetails: [] };
    }
  } catch (err: any) {
    return { success: false, message: `Failed to parse file: ${err.message}`, imported: 0, skipped: 0, errors: [err.message], errorDetails: [] };
  }
}

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
    case 'scores': return [{ Student: 'John Doe', Subject: 'Mathematics', 'Class Score': '40', 'Exam Score': '35', Term: 'Term 1', 'Academic Year': '2023/2024' }];
    default: return [];
  }
}
