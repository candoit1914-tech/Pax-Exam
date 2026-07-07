export interface RankedStudent {
  id: number;
  name: string;
  average: number;
  position?: number;
  rankScore?: number;
}

export const rankStudents = (students: RankedStudent[]) => {
  // Sort descending by rankScore if available, else by average
  const sorted = [...students].sort((a, b) => {
    const scoreA = a.rankScore !== undefined ? a.rankScore : a.average;
    const scoreB = b.rankScore !== undefined ? b.rankScore : b.average;
    return scoreB - scoreA;
  });

  let rank = 1;
  let prevScore: number | null = null;
  let actualRank = 1;

  return sorted.map((student) => {
    const currentScore = student.rankScore !== undefined ? student.rankScore : student.average;
    if (prevScore !== null && currentScore < prevScore) {
      rank = actualRank;
    }
    prevScore = currentScore;
    actualRank++;

    return {
      ...student,
      position: rank
    };
  });
};

export const calculateAverage = (scores: { total: number }[]) => {
  const total = scores.reduce((sum, s) => sum + s.total, 0);
  return scores.length ? total / scores.length : 0;
};
