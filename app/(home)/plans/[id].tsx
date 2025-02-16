import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native'
import React from 'react'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useFocusEffect } from '@react-navigation/native'
import { FontAwesome5 } from '@expo/vector-icons'
import { createSupabaseClient } from '../../../src/lib/supabase'
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

export default function PlanDetailScreen() {
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

  const fetchPlanDetails = React.useCallback(async () => {
    if (!id) return
    try {
      setLoading(true)
      
      // Fetch plan details
      const token = await getToken({ template: 'supabase' })
      const supabase = createSupabaseClient(token || undefined)
      
      const { data: planData, error: planError } = await supabase
        .from('workout_plans')
        .select('*')
        .eq('id', id)
        .single()

      if (planError) throw planError
      setPlan(planData)

      // Fetch exercises for this plan
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
      router.back()
    } finally {
      setLoading(false)
    }
  }, [id])



  // Fetch plan details when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      fetchPlanDetails()
    }, [fetchPlanDetails])
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
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => router.push(`/plans/${id}/add-exercise?day=${index}`)}
              >
                <FontAwesome5 name="plus" size={16} color="#007AFF" />
              </TouchableOpacity>
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
      <TouchableOpacity 
        style={styles.saveButton} 
        onPress={() => {
          Alert.alert('Success', 'Plan saved!')
          router.replace('/plans')
        }}
      >
        <Text style={styles.saveButtonText}>Save Plan</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingBottom: 80, // Make room for save button
  },
  content: {
    flex: 1,
    padding: 16,
  },
  planName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 24,
    color: '#333',
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
  addButton: {
    padding: 8,
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
  },
  noExercises: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 32,
  },
  headerButton: {
    marginRight: 16,
  },
  saveButton: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0891b2',
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
})
