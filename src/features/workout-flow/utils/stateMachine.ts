import type { ExerciseFlowState } from '../types'

export function editingStateForSet(setIndex: number): ExerciseFlowState {
  return `EDITING_SET_${setIndex}`
}

export function savingStateForSet(setIndex: number): ExerciseFlowState {
  return `SAVING_SET_${setIndex}`
}

export function isEditingState(state: ExerciseFlowState): boolean {
  return state.startsWith('EDITING_SET_')
}

export function isSavingState(state: ExerciseFlowState): boolean {
  return state.startsWith('SAVING_SET_')
}

export function extractSetIndex(state: ExerciseFlowState): number | null {
  const match = state.match(/_(\d+)$/)
  if (!match) return null
  return Number.parseInt(match[1], 10)
}

export function nextFlowState(
  state: ExerciseFlowState,
  prescribedSets: number,
): ExerciseFlowState {
  if (state === 'IDLE') {
    return editingStateForSet(1)
  }

  if (isEditingState(state) || isSavingState(state)) {
    return state
  }

  if (state === 'SUCCESS') {
    return 'READY_FOR_NEXT'
  }

  if (state === 'ERROR') {
    return 'IDLE'
  }

  if (state === 'EXERCISE_COMPLETE' || state === 'READY_FOR_NEXT') {
    return 'READY_FOR_NEXT'
  }

  const currentIndex = extractSetIndex(state)
  if (currentIndex === null) {
    return 'IDLE'
  }

  const nextIndex = currentIndex + 1
  if (nextIndex > prescribedSets) {
    return 'EXERCISE_COMPLETE'
  }

  return editingStateForSet(nextIndex)
}
