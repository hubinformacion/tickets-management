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
type Criterion = keyof typeof criteria;
export interface SurveyRatingBucket { criterion: Criterion; rating: number | null; count: number }

function emptyDistributions() {
  return { responseTime: [0, 0, 0, 0, 0], communication: [0, 0, 0, 0, 0], solution: [0, 0, 0, 0, 0], overall: [0, 0, 0, 0, 0] };
}

function finalizeSummary(distributions: ReturnType<typeof emptyDistributions>, totalSurveys: number, resolvedCount: number, invalidRatingCount: number) {
  const averages = { responseTime: 0, communication: 0, solution: 0, overall: 0 };
  const availableAverages: number[] = [];
  for (const criterion of Object.keys(criteria) as Criterion[]) {
    const counts = distributions[criterion];
    const total = counts.reduce((sum, count) => sum + count, 0);
    if (total) {
      averages[criterion] = counts.reduce((sum, count, index) => sum + count * (index + 1), 0) / total;
      availableAverages.push(averages[criterion]);
    }
  }
  const round = (value: number) => Math.round(value * 10) / 10;
  return {
    kpis: {
      totalSurveys, resolvedCount, invalidRatingCount,
      avgGeneral: availableAverages.length ? round(availableAverages.reduce((sum, value) => sum + value, 0) / availableAverages.length) : 0,
      avgOverall: round(averages.overall), avgResponseTime: round(averages.responseTime),
      avgCommunication: round(averages.communication), avgSolution: round(averages.solution),
      responseRate: resolvedCount > 0 ? round(totalSurveys / resolvedCount * 100) : 0,
    },
    distributions,
  };
}

/** Los buckets incluyen una fila nula por criterio para las calificaciones inválidas. */
export function summarizeUserSurveyBuckets(buckets: readonly SurveyRatingBucket[], resolvedCount: number) {
  const distributions = emptyDistributions();
  let totalSurveys = 0, invalidRatingCount = 0;
  for (const bucket of buckets) {
    if (bucket.criterion === "overall") totalSurveys += bucket.count;
    if (bucket.rating === null) invalidRatingCount += bucket.count;
    else distributions[bucket.criterion][bucket.rating - 1] += bucket.count;
  }
  return finalizeSummary(distributions, totalSurveys, resolvedCount, invalidRatingCount);
}

export function summarizeUserSurveys(surveys: readonly SurveyRatings[], resolvedCount: number) {
  const distributions = emptyDistributions();
  let invalidRatingCount = 0;
  for (const criterion of Object.keys(criteria) as Criterion[]) {
    for (const survey of surveys) {
      const rating = survey[criteria[criterion]];
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) invalidRatingCount++;
      else distributions[criterion][rating - 1]++;
    }
  }
  return finalizeSummary(distributions, surveys.length, resolvedCount, invalidRatingCount);
}
