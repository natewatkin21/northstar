/**
 * View Plan Screen
 * 
 * This screen displays a read-only view of a workout plan, showing:
 * 1. Plan name
 * 2. Days and their exercises
 * 3. Exercise details (sets, reps, rest time)
 * 
 * Data Display:
 * - Exercises are grouped by day and ordered consistently with the edit screen
 * - Exercise order: day_order (ascending) -> created_at (ascending)
 * 
 * Exercise Display Rules:
 * - Exercises without names are filtered out
 * - Empty days show "No exercises this day"
 * - Rest time is only shown if greater than 0 seconds
 * 
 * Data Refresh:
 * - Exercise data is refreshed when the screen gains focus
 * - This ensures consistency with any edits made in other screens
 */

import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import React from 'react'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useFocusEffect } from '@react-navigation/native'
import { FontAwesome5 } from '@expo/vector-icons'
import { createSupabaseClient } from '../../../../src/lib/supabase'
import { useAuth } from '@clerk/clerk-expo'

type WorkoutPlan = {
  id: string
  name: string
  created_at: string
}

type PlanExercise = {
  id: string
  exercise_id: string
  day_name: string | null
  sets: number
  reps: number
  rest_seconds: number
  exercises: {
    name: string
  }
}

export default function ViewPlanScreen() {
  const { getToken } = useAuth()
  const router = useRouter()
  const params = useLocalSearchParams()
  const id = typeof params.id === 'string' ? params.id : undefined
  const [plan, setPlan] = React.useState<WorkoutPlan | null>(null)
  const [exercises, setExercises] = React.useState<PlanExercise[]>([])
  const [loading, setLoading] = React.useState(true)

  // If no valid ID is provided, go back to plans list
  React.useEffect(() => {
    if (!id) {
      router.replace('/plans')
    }
  }, [id, router])

  // Update header title when plan loads
  React.useEffect(() => {
    if (plan?.name) {
      router.setParams({ title: plan.name })
    }
  }, [plan?.name, router])

  const fetchPlanDetails = async () => {
    console.log('Fetching plan details for id:', id)
    if (!id) {
      console.log('No id provided, returning')
      return
    }
    try {
      setLoading(true)
      const token = await getToken({ template: 'supabase' })
      const supabase = createSupabaseClient(token || undefined)
      
      console.log('Fetching plan data...')
      const { data: planData, error: planError } = await supabase
        .from('workout_plans')
        .select('*')
        .eq('id', id)
        .single()

      if (planError) {
        console.log('Plan error:', planError)
        throw planError
      }
      console.log('Plan data:', planData)
      setPlan(planData)

      const { data: exerciseData, error: exerciseError } = await supabase
        .from('plan_day_exercises')
        .select('id, exercise_id, day_name, sets, reps, rest_seconds, day_order, exercises(name)')
        .eq('plan_id', id)
        .order('day_order', { ascending: true })
        .order('created_at', { ascending: true })

      if (exerciseError) throw exerciseError
      setExercises(exerciseData)
    } catch (error) {
      console.error('Error fetching plan details:', error)
      Alert.alert('Error', 'Failed to load workout plan')
      // Don't navigate away automatically, let user see the error
    } finally {
      setLoading(false)
    }
  }

  // Track if this is the initial mount
  const isInitialMount = React.useRef(true)

  // Initial fetch on mount
  React.useEffect(() => {
    fetchPlanDetails()
    // After initial mount, set the ref to false
    isInitialMount.current = false
  }, [id])

  // Refresh data on focus, but only after initial mount
  useFocusEffect(
    React.useCallback(() => {
      // Skip the refresh on initial mount
      if (!isInitialMount.current) {
        fetchPlanDetails()
      }
    }, [id])
  )

  // Group exercises by day name
  const exercisesByDay = React.useMemo(() => {
    const grouped: { [key: string]: PlanExercise[] } = {}
    exercises.forEach(exercise => {
      const dayName = exercise.day_name || 'Unnamed Day'
      if (!grouped[dayName]) {
        grouped[dayName] = []
      }
      grouped[dayName].push(exercise)
    })
    return grouped
  }, [exercises])

  if (loading || !plan) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading plan...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        {Object.entries(exercisesByDay).map(([dayName, dayExercises]) => (
          <View key={dayName} style={styles.daySection}>
            <View style={styles.dayHeader}>
              <View style={styles.dayTitles}>
                <Text style={styles.dayName}>{dayName}</Text>
              </View>
            </View>

            {dayExercises.filter(exercise => exercise.exercises?.name).length > 0 ? (
              dayExercises
                .filter(exercise => exercise.exercises?.name)
                .map((exercise) => (
                  <View key={exercise.id} style={styles.exerciseCard}>
                    <Text style={styles.exerciseName}>{exercise.exercises.name}</Text>
                    <Text style={styles.exerciseDetails}>
                      {exercise.sets} sets × {exercise.reps} reps
                    </Text>
                    {exercise.rest_seconds > 0 && (
                      <Text style={styles.exerciseDetails}>
                        {exercise.rest_seconds}s rest
                      </Text>
                    )}
                  </View>
                ))
            ) : (
              <Text style={styles.noExercises}>No exercises this day</Text>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  dayTitles: {
    flex: 1,
  },
  noExercises: {
    textAlign: 'center',
    color: '#666',
    padding: 16,
    fontStyle: 'italic',
  },
  dayType: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  daySection: {
    marginBottom: 24,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dayName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  exerciseCard: {
    backgroundColor: '#f8f8f8',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  exerciseDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  noExercises: {
    color: '#666',
    fontStyle: 'italic',
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#666',
  },
})
