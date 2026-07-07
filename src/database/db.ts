import Dexie, { type EntityTable } from 'dexie';

export interface Student {
  id?: number;
  name: string;
  gender: string;
  class_id: number;
  parent_name?: string;
  parent_phone?: string;
  photo?: string; // Base64 encoded string
  admission_year?: string;
  status?: string; // 'active' | 'completed'
  dob?: string;
}

export interface Teacher {
  id?: number;
  name: string;
}

export interface Class {
  id?: number;
  name: string;
  teacher_name?: string;
}

export interface Subject {
  id?: number;
  name: string;
}

export interface Score {
  id?: number;
  student_id: number;
  subject_id: number;
  class_score: number;
  exam_score: number;
  total: number;
  grade: string;
  term?: string;
  academic_year?: string;
}

const db = new Dexie('SchoolAppDB') as Dexie & {
  students: EntityTable<Student, 'id'>,
  teachers: EntityTable<Teacher, 'id'>,
  classes: EntityTable<Class, 'id'>,
  subjects: EntityTable<Subject, 'id'>,
  scores: EntityTable<Score, 'id'>,
};

db.version(1).stores({
  students: '++id, name, gender, class_id',
  teachers: '++id, name',
  classes: '++id, name',
  subjects: '++id, name',
  scores: '++id, student_id, subject_id, class_score, exam_score, total, grade'
});

db.version(2).stores({
  students: '++id, name, gender, class_id, parent_phone',
}).upgrade(tx => {
});

db.version(3).stores({
  students: '++id, name, gender, class_id, parent_phone, admission_year, status',
  scores: '++id, student_id, subject_id, class_score, exam_score, total, grade, term, academic_year'
}).upgrade(tx => {
  return tx.table('students').toCollection().modify(student => {
    if (!student.admission_year) student.admission_year = '2023/2024';
    if (!student.status) student.status = 'active';
  }).then(() => {
    return tx.table('scores').toCollection().modify(score => {
      if (!score.term) score.term = 'Term 1';
      if (!score.academic_year) score.academic_year = '2023/2024';
    });
  });
});

db.version(4).stores({
  students: '++id, name, gender, class_id, parent_phone, admission_year, status, dob',
}).upgrade(tx => {
});

db.version(5).stores({
  students: '++id, name, gender, class_id, parent_phone, admission_year, status, dob',
  scores: '++id, student_id, subject_id, term, academic_year, [academic_year+term], [student_id+academic_year+term], [subject_id+academic_year+term]',
});

export default db;
