export type WorkoutExercise = {
  name: string
  durationMinutes: number
  notes?: string
}

export type Workout = {
  id: string
  name: string
  focus: 'strength' | 'cardio' | 'mobility' | 'mixed'
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  equipment: string[]
  exercises: WorkoutExercise[]
  tips?: string
}

export type WorkoutCategory = {
  id: string
  label: string
  description: string
  workouts: Workout[]
}

export const workoutLibrary: WorkoutCategory[] = [
  {
    id: 'quick-start',
    label: 'Quick Start',
    description: '15–20 minute routines for busy days.',
    workouts: [
      {
        id: 'express-strength',
        name: '20-Minute Strength Express',
        focus: 'strength',
        difficulty: 'beginner',
        equipment: ['bodyweight'],
        exercises: [
          { name: 'Bodyweight Squats', durationMinutes: 4, notes: 'Steady pace, full range of motion.' },
          { name: 'Push-Ups', durationMinutes: 4, notes: 'Drop to knees if form breaks.' },
          { name: 'Glute Bridge Hold', durationMinutes: 3, notes: 'Squeeze at the top.' },
          { name: 'Reverse Lunges', durationMinutes: 4, notes: 'Alternate legs, maintain balance.' },
          { name: 'Plank Series', durationMinutes: 5, notes: 'Front, left, right — repeat as needed.' },
        ],
        tips: 'Move briskly between exercises to keep the tempo high.'
      },
      {
        id: 'cardio-boost',
        name: '18-Minute Cardio Boost',
        focus: 'cardio',
        difficulty: 'intermediate',
        equipment: ['jump rope (optional)'],
        exercises: [
          { name: 'Jumping Jacks', durationMinutes: 3 },
          { name: 'Mountain Climbers', durationMinutes: 3 },
          { name: 'High Knees', durationMinutes: 3 },
          { name: 'Jump Rope or Shadow Skipping', durationMinutes: 4 },
          { name: 'Burpee Ladder', durationMinutes: 5, notes: 'Add one burpee each minute.' },
        ],
        tips: 'Aim for consistent breathing — in through the nose, out through the mouth.'
      },
    ],
  },
  {
    id: 'strength-blocks',
    label: 'Strength Blocks',
    description: 'Progressive strength workouts balancing upper and lower body.',
    workouts: [
      {
        id: 'full-body-lift',
        name: 'Full Body Lift',
        focus: 'strength',
        difficulty: 'intermediate',
        equipment: ['dumbbells'],
        exercises: [
          { name: 'Goblet Squats', durationMinutes: 6 },
          { name: 'Bent Over Rows', durationMinutes: 5 },
          { name: 'Single Arm Overhead Press', durationMinutes: 5 },
          { name: 'Romanian Deadlift', durationMinutes: 6 },
          { name: 'Farmer Carry Finisher', durationMinutes: 3, notes: 'Multiple short carries.' },
        ],
      },
      {
        id: 'upper-lower-split',
        name: 'Upper / Lower Split',
        focus: 'strength',
        difficulty: 'advanced',
        equipment: ['barbell', 'bench'],
        exercises: [
          { name: 'Back Squats', durationMinutes: 8 },
          { name: 'Bench Press', durationMinutes: 7 },
          { name: 'Pull-Ups or Assisted Pull-Ups', durationMinutes: 5 },
          { name: 'Walking Lunges', durationMinutes: 6 },
          { name: 'Core Tri-Set', durationMinutes: 4, notes: 'Hanging knee raises, ab wheel, hollow hold.' },
        ],
        tips: 'Rest 90 seconds between heavier sets, 45 seconds for accessories.'
      },
    ],
  },
  {
    id: 'mobility',
    label: 'Mobility Reset',
    description: 'Gentle flows to restore range of motion and reduce stiffness.',
    workouts: [
      {
        id: 'morning-flow',
        name: 'Morning Mobility Flow',
        focus: 'mobility',
        difficulty: 'beginner',
        equipment: ['yoga mat'],
        exercises: [
          { name: 'Cat-Cow', durationMinutes: 3 },
          { name: 'Worlds Greatest Stretch', durationMinutes: 4 },
          { name: 'Dynamic Hamstring Sweep', durationMinutes: 3 },
          { name: 'Twisting Lunge Flow', durationMinutes: 4 },
          { name: 'Child\'s Pose Breathing', durationMinutes: 4 },
        ],
        tips: 'Hold gentle tension, avoid sharp pain.'
      },
      {
        id: 'desk-break',
        name: 'Desk Break Reset',
        focus: 'mobility',
        difficulty: 'beginner',
        equipment: ['chair'],
        exercises: [
          { name: 'Neck Releases', durationMinutes: 3 },
          { name: 'Thoracic Extensions', durationMinutes: 4 },
          { name: 'Standing Hip Openers', durationMinutes: 4 },
          { name: 'Wrist Flexor / Extensor Stretch', durationMinutes: 3 },
          { name: 'Supported Hamstring Stretch', durationMinutes: 3 },
        ],
        tips: 'Use your breath to ease into each stretch.'
      },
    ],
  },
]
