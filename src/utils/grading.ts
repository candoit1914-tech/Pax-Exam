export const getGrade = (score: number) => {
  if (score >= 80) return '1';
  if (score >= 70) return '2';
  if (score >= 65) return '3';
  if (score >= 60) return '4';
  if (score >= 55) return '5';
  if (score >= 50) return '6';
  if (score >= 45) return '7';
  if (score >= 40) return '8';
  return '9';
};

export const getGradePoint = (grade: string) => {
  switch (grade) {
    case '1': return 4.0;
    case '2': return 3.6;
    case '3': return 3.2;
    case '4': return 2.8;
    case '5': return 2.4;
    case '6': return 2.0;
    case '7': return 1.6;
    case '8': return 1.2;
    default: return 0.0;
  }
};

export const calculateTotal = (classScore: number, examScore: number) => {
  return classScore + examScore;
};

export const getRemark = (grade: string) => {
  switch (grade) {
    case '1': return 'Excellent';
    case '2': return 'Very Good';
    case '3': return 'Good';
    case '4': return 'Credit';
    case '5': return 'Credit';
    case '6': return 'Credit';
    case '7': return 'Pass';
    case '8': return 'Pass';
    case '9': return 'Fail';
    default: return '';
  }
}
