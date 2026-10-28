interface SurveyRatings {
  responseTimeRating: number;
  communicationRating: number;
  solutionRating: number;
  overallRating: number;
}

const criteria = {
  responseTime: "responseTimeRating", communication: "communicationRating",
  solution: "solutionRating", overall: "overallRating",
} as const;

export function summarizeUserSurveys(surveys: readonly SurveyRatings[], resolvedCount: number) {
  const distributions = { responseTime: [0, 0, 0, 0, 0], communication: [0, 0, 0, 0, 0], solution: [0, 0, 0, 0, 0], overall: [0, 0, 0, 0, 0] };
  const averages = { responseTime: 0, communication: 0, solution: 0, overall: 0 };
  const availableAverages: number[] = [];
  let invalidRatingCount = 0;

  for (const criterion of Object.keys(criteria) as (keyof typeof criteria)[]) {
    const ratings: number[] = [];
    for (const survey of surveys) {
      const rating = survey[criteria[criterion]];
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        invalidRatingCount++;
        continue;
      }
      ratings.push(rating);
      distributions[criterion][rating - 1]++;
    }
    if (ratings.length) {
      averages[criterion] = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
      availableAverages.push(averages[criterion]);
    }
  }
  const round = (value: number) => Math.round(value * 10) / 10;
  return {
    kpis: {
      totalSurveys: surveys.length, resolvedCount, invalidRatingCount,
      avgGeneral: availableAverages.length ? round(availableAverages.reduce((sum, value) => sum + value, 0) / availableAverages.length) : 0,
      avgOverall: round(averages.overall), avgResponseTime: round(averages.responseTime),
      avgCommunication: round(averages.communication), avgSolution: round(averages.solution),
      responseRate: resolvedCount > 0 ? round(surveys.length / resolvedCount * 100) : 0,
    },
    distributions,
  };
}
