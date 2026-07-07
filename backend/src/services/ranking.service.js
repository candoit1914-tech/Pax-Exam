export function rankStudents(students) {
  const sorted = [...students].sort((a, b) => {
    const scoreA = a.rankScore !== undefined ? a.rankScore : a.average;
    const scoreB = b.rankScore !== undefined ? b.rankScore : b.average;
    return scoreB - scoreA;
  });

  let rank = 1;
  let prevScore = null;
  let actualRank = 1;

  return sorted.map(student => {
    const currentScore = student.rankScore !== undefined ? student.rankScore : student.average;
    if (prevScore !== null && currentScore < prevScore) {
      rank = actualRank;
    }
    prevScore = currentScore;
    actualRank++;
    return { ...student, position: rank };
  });
}

export function calculateAverage(scores) {
  if (!scores || scores.length === 0) return 0;
  const total = scores.reduce((sum, s) => sum + (parseFloat(s.total) || 0), 0);
  return total / scores.length;
}

export function getGrade(score) {
  if (score >= 80) return '1';
  if (score >= 70) return '2';
  if (score >= 65) return '3';
  if (score >= 60) return '4';
  if (score >= 55) return '5';
  if (score >= 50) return '6';
  if (score >= 45) return '7';
  if (score >= 40) return '8';
  return '9';
}

export function calculateTotal(classScore, examScore) {
  return (parseFloat(classScore) || 0) + (parseFloat(examScore) || 0);
}
