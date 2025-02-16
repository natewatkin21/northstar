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
  day_of_week: number
  sets: number
  reps: number
  rest_seconds: number
  exercises: {
    name: string
  }
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

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
        .select('*, exercises(name)')
        .eq('plan_id', id)
        .order('day_of_week')

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

  // Organize exercises by day
  const exercisesByDay = React.useMemo(() => {
    const days: { [key: number]: PlanExercise[] } = {}
    DAYS.forEach((_, index) => {
      days[index] = exercises.filter(e => e.day_of_week === index)
    })
    return days
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
        {DAYS.map((day, index) => (
          <View key={day} style={styles.daySection}>
            <View style={styles.dayHeader}>
              <Text style={styles.dayName}>{day}</Text>
            </View>

            {exercisesByDay[index].length > 0 ? (
              exercisesByDay[index].map((exercise) => (
                <View key={exercise.id} style={styles.exerciseCard}>
                  <Text style={styles.exerciseName}>{exercise.exercises.name}</Text>
                  <Text style={styles.exerciseDetails}>
                    {exercise.sets} sets × {exercise.reps} reps
                  </Text>
                  <Text style={styles.exerciseDetails}>
                    {exercise.rest_seconds}s rest
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.noExercises}>No exercises added</Text>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
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
