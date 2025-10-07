import type { ProgramDay } from '../types'

export const programDayFixture: ProgramDay = {
  id: '2b3bbf9b-4b2f-4a66-82de-1c2408fe1c50',
  week: 1,
  dateISO: '2025-10-06',
  exercises: [
    {
      id: 'f9b1f7c6-2fdf-42f6-a215-664b0e17739e',
      name: 'Barbell Squat',
      order: 1,
      targetRepMin: 8,
      targetRepMax: 10,
      prescribedSets: 4,
    },
    {
      id: 'e5372c97-3ced-4c4e-8eef-53702d293b4c',
      name: 'Romanian Deadlift',
      order: 2,
      targetRepMin: 10,
      targetRepMax: 12,
      prescribedSets: 3,
    },
    {
      id: 'c4dac8b1-8a99-43ba-9c14-7f57e5389c6b',
      name: 'Leg Press',
      order: 3,
      targetRepMin: 12,
      targetRepMax: 15,
      prescribedSets: 3,
    },
  ],
}
