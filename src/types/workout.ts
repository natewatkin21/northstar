export interface WorkoutPlan {
  id: string
  name: string
  created_at: string
  is_current?: boolean
}

export interface PlanWeek {
  id: string
  plan_id: string
  week_number: number
  created_at: string
}

export interface Exercise {
  id: string
  name: string
  description: string | null
  created_at: string
}

export interface PlanDayExercise {
  id: string
  exercise_id: string
  week_id: string
  day_number: number
  sets: number
  reps: number
  rest_seconds: number
  exercises?: {
    name: string
  }
  name?: string
}

export interface DayExercise {
  exercise: Exercise
  sets: number
  reps: number
  rest_seconds: number
  created_at?: string
}

export interface WeekFormData {
  dayExercises: { [key: number]: DayExercise[] }
  dayNames: { [key: number]: string }
}
