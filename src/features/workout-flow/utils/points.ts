export const BASE_POINTS_PER_SET = 10
export const EXCEEDED_RANGE_BONUS = 5
export const EXERCISE_STREAK_BONUS = 10

export function pointsForSet(base = BASE_POINTS_PER_SET, exceeded: boolean): number {
  return base + (exceeded ? EXCEEDED_RANGE_BONUS : 0)
}

export function exerciseStreakBonus(allSetsDoneInline: boolean): number {
  return allSetsDoneInline ? EXERCISE_STREAK_BONUS : 0
}

export function totalPointsForExercise(
  exceededFlags: boolean[],
  allSetsDoneInline: boolean,
): number {
  const pointsFromSets = exceededFlags.reduce<number>((sum, exceeded) => {
    return sum + pointsForSet(BASE_POINTS_PER_SET, exceeded)
  }, 0)

  return pointsFromSets + exerciseStreakBonus(allSetsDoneInline)
}
