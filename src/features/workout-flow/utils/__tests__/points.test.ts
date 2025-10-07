import { describe, expect, it } from 'vitest'
import {
  BASE_POINTS_PER_SET,
  EXCEEDED_RANGE_BONUS,
  EXERCISE_STREAK_BONUS,
  exerciseStreakBonus,
  pointsForSet,
  totalPointsForExercise,
} from '../points'

describe('pointsForSet', () => {
  it('awards base points when within range', () => {
    expect(pointsForSet(BASE_POINTS_PER_SET, false)).toBe(BASE_POINTS_PER_SET)
  })

  it('adds bonus when exceeded range', () => {
    expect(pointsForSet(BASE_POINTS_PER_SET, true)).toBe(BASE_POINTS_PER_SET + EXCEEDED_RANGE_BONUS)
  })
})

describe('exerciseStreakBonus', () => {
  it('awards streak bonus when eligible', () => {
    expect(exerciseStreakBonus(true)).toBe(EXERCISE_STREAK_BONUS)
  })

  it('awards zero when not eligible', () => {
    expect(exerciseStreakBonus(false)).toBe(0)
  })
})

describe('totalPointsForExercise', () => {
  it('sums base points and bonuses', () => {
    const exceededFlags = [false, true, true]
    const total = totalPointsForExercise(exceededFlags, true)
    const expected =
      BASE_POINTS_PER_SET * exceededFlags.length + EXCEEDED_RANGE_BONUS * 2 + EXERCISE_STREAK_BONUS
    expect(total).toBe(expected)
  })

  it('handles no exceeded sets and no streak bonus', () => {
    const exceededFlags = [false, false]
    const total = totalPointsForExercise(exceededFlags, false)
    expect(total).toBe(BASE_POINTS_PER_SET * exceededFlags.length)
  })
})
