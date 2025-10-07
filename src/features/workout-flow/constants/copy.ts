import type { WorkoutFlowCopy } from '../types'

export const workoutFlowCopy: WorkoutFlowCopy = {
  header: {
    weekPrefix: 'Week',
    progressLabel: 'Progress',
    exit: 'Exit & Resume Later',
  },
  actions: {
    next: 'Next Exercise',
    back: 'Back',
    skip: 'Skip Exercise',
    skipConfirmTitle: 'Skip this exercise?',
    skipConfirmBody: 'You can come back later. We will record this exercise as incomplete for today.',
    skipConfirmYes: 'Confirm skip',
    skipConfirmNo: 'Keep going',
    saveSet: 'Save set',
    updateSet: 'Update set',
    editSet: 'Edit set',
    resume: 'Resume workout',
  },
  labels: {
    reps: 'Reps',
    weight: 'Weight (kg)',
    commentPlaceholder: 'Add coaching notes or reminders',
    addComment: 'Add comment',
    hideComment: 'Hide comment',
    repRange: (min, max) => `Target: ${min}-${max} reps`,
    beyondRange: 'Beyond range',
    optional: 'Optional',
    completed: 'Completed',
  },
  feedback: {
    setComplete: 'Set saved',
    exerciseComplete: 'Exercise complete',
    streakBonus: 'Streak bonus! +10 points',
    pointsAwarded: (points) => `+${points} pts`,
  },
  errors: {
    generic: 'Something went wrong. Please retry.',
    repsRequired: 'Enter the number of reps.',
    weightRequired: 'Enter the weight used.',
    saveFailed: 'Could not save set. Your changes were rolled back.',
  },
}
