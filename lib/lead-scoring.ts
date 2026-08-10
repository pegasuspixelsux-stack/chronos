import type { BudgetRange, LeadTemperature, PropertyUsage, QualifiedLeadInput, Timeframe } from "@/lib/types";

const TIMEFRAME_WEIGHTS: Record<Timeframe, number> = {
  "Inmediato (Menos de 1 mes)": 40,
  "A corto plazo (1 a 3 meses)": 25,
  "A mediano plazo (3 a 6 meses)": 10,
  "Exploratorio / Sin prisa definida": 0,
};

const BUDGET_WEIGHTS: Record<BudgetRange, number> = {
  "Menos de $500,000 USD": 15,
  "$500,000 - $1,000,000 USD": 20,
  "$1,000,000 - $2,500,000 USD": 25,
  "Más de $2,500,000 USD": 30,
};

const USAGE_WEIGHTS: Record<PropertyUsage, number> = {
  "Vivienda permanente (Todo el año)": 15,
  "Inversión para renta (Temporal/Anual)": 15,
  "Residencia de descanso / Recreación": 10,
  Otro: 5,
};

const PREFERRED_AREAS_WEIGHT = 10;

type ScoringAnswers = Pick<QualifiedLeadInput, "timeframe" | "budgetRange" | "propertyUsage" | "preferredAreas">;

/**
 * Deterministic stand-in for the backend SLM readiness analysis. Runs
 * entirely client-side because this project has no server routes / Admin
 * SDK — there is nowhere else for this scoring to run. Produces a 0-100
 * score for sorting/display in the admin dashboard.
 */
export function calculateReadinessScore(answers: ScoringAnswers): number {
  const areaScore = answers.preferredAreas.length > 0 ? PREFERRED_AREAS_WEIGHT : 0;
  return (
    TIMEFRAME_WEIGHTS[answers.timeframe] +
    BUDGET_WEIGHTS[answers.budgetRange] +
    USAGE_WEIGHTS[answers.propertyUsage] +
    areaScore
  );
}

/**
 * Hot: immediate timeframe + a defined budget (always true — budget is a
 * required field) + matching criteria (at least one preferred area
 * selected). Everything else routes as a warm/nurturing lead.
 */
export function classifyLeadTemperature(answers: ScoringAnswers): LeadTemperature {
  const isImmediate = answers.timeframe === "Inmediato (Menos de 1 mes)";
  const hasMatchingCriteria = answers.preferredAreas.length > 0;
  return isImmediate && hasMatchingCriteria ? "hot" : "warm";
}
