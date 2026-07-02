import type { PenaltyPolicyResponse } from '#hey-api'

export interface PenaltyInfo {
  originalScore: number
  finalScore: number
  penaltyCount: number
  bonusCount: number
}

// lessonsOffset: >0 — сдано позже дедлайна (штраф), <0 — раньше (бонус), 0 — вовремя.
// Сервер фиксирует смещение при выставлении оценки.

export function computePenaltyCount(
  policy: PenaltyPolicyResponse,
  lessonsOffset: number | null | undefined,
): number {
  if (!policy.enabled || lessonsOffset == null || lessonsOffset <= 0)
    return 0

  const grace = policy.gracePeriodLessons ?? 0
  if (lessonsOffset <= grace)
    return 0

  const interval = policy.intervalLessons ?? 1
  const maxReductions = policy.maxReductions ?? 1

  return Math.min(Math.ceil((lessonsOffset - grace) / interval), maxReductions)
}

export function computeBonusCount(
  policy: PenaltyPolicyResponse,
  lessonsOffset: number | null | undefined,
): number {
  if (!policy.bonusEnabled || lessonsOffset == null || lessonsOffset >= 0)
    return 0

  const earlyBy = -lessonsOffset
  const grace = policy.bonusGracePeriodLessons ?? 0
  if (earlyBy <= grace)
    return 0

  const interval = policy.bonusIntervalLessons ?? 1
  const maxIncreases = policy.bonusMaxIncreases ?? 1

  return Math.min(Math.ceil((earlyBy - grace) / interval), maxIncreases)
}

export function applyPenalty(
  originalScore: number,
  penaltyCount: number,
  policy: PenaltyPolicyResponse,
): number {
  if (penaltyCount <= 0)
    return originalScore

  if (policy.operation === 'MULTIPLY') {
    const step = policy.step ?? 1
    return originalScore * step ** penaltyCount
  }

  const step = policy.step ?? 0
  return Math.max(0, originalScore - penaltyCount * step)
}

export function applyBonus(
  score: number,
  bonusCount: number,
  policy: PenaltyPolicyResponse,
): number {
  if (bonusCount <= 0)
    return score

  if (policy.bonusOperation === 'MULTIPLY') {
    const step = policy.bonusStep ?? 1
    return score * step ** bonusCount
  }

  const step = policy.bonusStep ?? 0
  return score + bonusCount * step
}

export function computePenalty(
  policy: PenaltyPolicyResponse,
  originalScore: number,
  lessonsOffset: number | null | undefined,
): PenaltyInfo {
  const penaltyCount = computePenaltyCount(policy, lessonsOffset)
  const bonusCount = computeBonusCount(policy, lessonsOffset)
  const afterPenalty = applyPenalty(originalScore, penaltyCount, policy)
  const finalScore = applyBonus(afterPenalty, bonusCount, policy)
  return { originalScore, finalScore, penaltyCount, bonusCount }
}
