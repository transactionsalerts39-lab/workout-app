const EXERCISE_API_BASE = 'https://wger.de/api/v2/exerciseinfo/'
const MAX_RESULTS = 300
const PAGE_SIZE = 100

type ExerciseApiEquipment = {
  id: number
  name: string
}

type ExerciseApiMuscle = {
  id: number
  name: string
  name_en: string
}

type ExerciseApiTranslation = {
  id: number
  name: string
  description: string
  language: number
}

type ExerciseApiResult = {
  id: number
  uuid: string
  category: {
    id: number
    name: string
  }
  muscles: ExerciseApiMuscle[]
  muscles_secondary: ExerciseApiMuscle[]
  equipment: ExerciseApiEquipment[]
  translations: ExerciseApiTranslation[]
}

type ExerciseApiResponse = {
  next: string | null
  results: ExerciseApiResult[]
}

export type ExerciseLibrarySource = 'api' | 'fallback'

export interface ExerciseLibraryEntry {
  id: string
  name: string
  primaryFocus: string
  equipment: string
  movementType: string
  muscleGroup: string
  source: ExerciseLibrarySource
}

const CATEGORY_PRIMARY_FOCUS: Record<string, string> = {
  Abs: 'strength',
  Arms: 'hypertrophy',
  Back: 'strength',
  Calves: 'strength',
  Cardio: 'endurance',
  Chest: 'hypertrophy',
  Legs: 'strength',
  Shoulders: 'hypertrophy',
}

const MOVEMENT_KEYWORDS: Array<{ match: RegExp; label: string }> = [
  { match: /(squat|lunge|step)/i, label: 'Lower body - compound' },
  { match: /(deadlift|hinge|rdl)/i, label: 'Hinge' },
  { match: /(press|push)/i, label: 'Press' },
  { match: /(row|pull|chin-up|pull-up)/i, label: 'Pull' },
  { match: /(carry|farmers?)/i, label: 'Carry' },
  { match: /(jump|plyo|box)/i, label: 'Plyometric' },
  { match: /(sprint|bike|run|cardio|rower)/i, label: 'Conditioning' },
  { match: /(plank|hold|iso|brace|hollow)/i, label: 'Core stability' },
  { match: /(swing|snatch|clean)/i, label: 'Explosive' },
]

const FALLBACK_EXERCISES_RAW = [
  { name: 'Back Squat', focus: 'strength', equipment: 'Barbell', movementType: 'Lower body - compound', muscleGroup: 'Quadriceps' },
  { name: 'Bench Press', focus: 'hypertrophy', equipment: 'Barbell', movementType: 'Press', muscleGroup: 'Chest' },
  { name: 'Deadlift', focus: 'strength', equipment: 'Barbell', movementType: 'Hinge', muscleGroup: 'Posterior chain' },
  { name: 'Romanian Deadlift', focus: 'strength', equipment: 'Barbell', movementType: 'Hinge', muscleGroup: 'Hamstrings' },
  { name: 'Pull-Up', focus: 'strength', equipment: 'Bodyweight', movementType: 'Pull', muscleGroup: 'Lats' },
  { name: 'Seated Row', focus: 'strength', equipment: 'Cable', movementType: 'Pull', muscleGroup: 'Upper back' },
  { name: 'Split Squat', focus: 'hypertrophy', equipment: 'Dumbbell', movementType: 'Single-leg', muscleGroup: 'Quadriceps' },
  { name: 'Hip Thrust', focus: 'strength', equipment: 'Barbell', movementType: 'Bridge', muscleGroup: 'Glutes' },
  { name: 'Box Jump', focus: 'endurance', equipment: 'Plyo box', movementType: 'Plyometric', muscleGroup: 'Lower body' },
  { name: 'Medicine Ball Slam', focus: 'endurance', equipment: 'Medicine ball', movementType: 'Power', muscleGroup: 'Full body' },
  { name: 'Plank', focus: 'strength', equipment: 'Bodyweight', movementType: 'Core stability', muscleGroup: 'Core' },
  { name: 'Hollow Rock', focus: 'strength', equipment: 'Bodyweight', movementType: 'Core stability', muscleGroup: 'Core' },
  { name: 'Farmer Carry', focus: 'strength', equipment: 'Kettlebell', movementType: 'Carry', muscleGroup: 'Grip & core' },
  { name: 'Assault Bike', focus: 'endurance', equipment: 'Machine', movementType: 'Conditioning', muscleGroup: 'Full body' },
  { name: 'Tempo Push-Up', focus: 'hypertrophy', equipment: 'Bodyweight', movementType: 'Press', muscleGroup: 'Chest' },
  { name: 'Trap Bar Deadlift', focus: 'strength', equipment: 'Trap bar', movementType: 'Hinge', muscleGroup: 'Posterior chain' },
  { name: 'Overhead Press', focus: 'hypertrophy', equipment: 'Barbell', movementType: 'Press', muscleGroup: 'Shoulders' },
  { name: 'Lat Pulldown', focus: 'hypertrophy', equipment: 'Cable', movementType: 'Pull', muscleGroup: 'Lats' },
  { name: 'Sled Push', focus: 'endurance', equipment: 'Sled', movementType: 'Conditioning', muscleGroup: 'Lower body' },
  { name: 'Nordic Curl', focus: 'strength', equipment: 'Assisted', movementType: 'Hinge', muscleGroup: 'Hamstrings' },
]

export const FALLBACK_EXERCISES: ExerciseLibraryEntry[] = FALLBACK_EXERCISES_RAW.map((entry, index) => ({
  id: `fallback-${index + 1}`,
  name: entry.name,
  primaryFocus: capitalise(entry.focus),
  equipment: entry.equipment,
  movementType: capitalise(entry.movementType),
  muscleGroup: entry.muscleGroup,
  source: 'fallback',
}))

function capitalise(value: string) {
  if (!value) return ''
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function determinePrimaryFocus(categoryName: string): string {
  const normalised = CATEGORY_PRIMARY_FOCUS[categoryName] ?? 'strength'
  return capitalise(normalised)
}

function determineMovementType(exerciseName: string, categoryName: string): string {
  for (const { match, label } of MOVEMENT_KEYWORDS) {
    if (match.test(exerciseName)) {
      return label
    }
  }
  return `${categoryName} work`
}

function extractMuscleGroup(result: ExerciseApiResult): string {
  const primary = result.muscles[0]?.name_en || result.muscles[0]?.name
  if (primary) return primary
  const secondary = result.muscles_secondary[0]?.name_en || result.muscles_secondary[0]?.name
  if (secondary) return secondary
  return result.category.name
}

function extractEquipment(result: ExerciseApiResult): string {
  if (result.equipment.length === 0) return 'Bodyweight'
  return result.equipment.map((item) => item.name).join(', ')
}

function normaliseExercise(result: ExerciseApiResult): ExerciseLibraryEntry | null {
  const englishTranslation = result.translations.find((translation) => translation.language === 2)
  if (!englishTranslation) {
    return null
  }

  const name = englishTranslation.name.trim()
  if (!name) {
    return null
  }

  return {
    id: `api-${result.uuid ?? result.id}`,
    name,
    primaryFocus: determinePrimaryFocus(result.category.name),
    equipment: extractEquipment(result),
    movementType: determineMovementType(name, result.category.name),
    muscleGroup: extractMuscleGroup(result),
    source: 'api',
  }
}

export async function fetchExerciseLibrary(signal?: AbortSignal): Promise<ExerciseLibraryEntry[]> {
  let url: string | null = `${EXERCISE_API_BASE}?language=2&status=2&limit=${PAGE_SIZE}`
  const items: ExerciseLibraryEntry[] = []

  while (url && items.length < MAX_RESULTS) {
    const response = await fetch(url, { signal })
    if (!response.ok) {
      throw new Error(`Exercise library request failed: ${response.status}`)
    }

    const data = (await response.json()) as ExerciseApiResponse
    data.results.forEach((result) => {
      const normalised = normaliseExercise(result)
      if (normalised) {
        items.push(normalised)
      }
    })

    url = data.next
  }

  return items
}
