/**
 * Day Detail Screen
 * 
 * This screen displays exercises for a specific day in a workout plan, showing:
 * 1. Day name in the header
 * 2. List of exercises with their details
 * 3. 'Go' button at the bottom
 */

import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import React from 'react'
import { useLocalSearchParams, useRouter, Stack } from 'expo-router'
import { useFocusEffect } from '@react-navigation/native'
import { createSupabaseClient } from '../../../../../src/lib/supabase'
import { useAuth, useUser } from '@clerk/clerk-expo'
import { FontAwesome5 } from '@expo/vector-icons'

type Plan = {
  id: string
  name: string
  is_current: boolean
}

type PlanExercise = {
  id: string
  exercise_id: string
  sets: number
  reps: number
  rest_seconds: number
  exercises: {
    name: string
  }
}

export default function DayDetailScreen() {
  const { getToken } = useAuth()
  const { user } = useUser()
  const router = useRouter()
  const params = useLocalSearchParams()
  const planId = typeof params.id === 'string' ? params.id : undefined
  const dayName = typeof params.day === 'string' ? decodeURIComponent(params.day) : undefined
  const [exercises, setExercises] = React.useState<PlanExercise[]>([])
  const [plan, setPlan] = React.useState<Plan | null>(null)
  const [loading, setLoading] = React.useState(true)

  // If no valid ID or day is provided, go back
  React.useEffect(() => {
    if (!planId || !dayName) {
      router.back()
    }
  }, [planId, dayName, router])

  const fetchDayExercises = React.useCallback(async () => {
    if (!planId || !dayName) return

    try {
      setLoading(true)
      const token = await getToken({ template: 'supabase' })
      const supabase = createSupabaseClient(token || undefined)

      // Fetch plan details first
      const { data: planData, error: planError } = await supabase
        .from('workout_plans')
        .select('id, name, is_current')
        .eq('id', planId)
        .single()

      if (planError) throw planError
      setPlan(planData)
      
      const { data, error } = await supabase
        .from('plan_day_exercises')
        .select('id, exercise_id, sets, reps, rest_seconds, exercises(name)')
        .eq('plan_id', planId)
        .eq('day_name', dayName)
        .order('created_at', { ascending: true })

      if (error) throw error
      
      setExercises(data.filter(exercise => exercise.exercises?.name))
    } catch (error) {
      console.error('Error fetching day exercises:', error)
    } finally {
      setLoading(false)
    }
  }, [planId, dayName, getToken])

  // Track if this is the initial mount
  const isInitialMount = React.useRef(true)

  // Initial fetch on mount
  React.useEffect(() => {
    fetchDayExercises()
    // After initial mount, set the ref to false
    isInitialMount.current = false
  }, [planId, dayName])

  // Refresh data on focus, but only after initial mount
  useFocusEffect(
    React.useCallback(() => {
      // Skip the refresh on initial mount
      if (!isInitialMount.current) {
        fetchDayExercises()
      }
    }, [planId, dayName])
  )

  const handleChangePlan = async () => {
    if (!planId || !user?.id) return
    try {
      const token = await getToken({ template: 'supabase' })
      const supabase = createSupabaseClient(token || undefined)

      // First, set all plans and days to not current
      await supabase
        .from('workout_plans')
        .update({ is_current: false })
        .eq('user_id', user.id)

      await supabase
        .from('plan_day_exercises')
        .update({ is_current: false })
        .eq('plan_id', planId)

      // Then set this plan as current
      await supabase
        .from('workout_plans')
        .update({ is_current: true })
        .eq('id', planId)

      // Get the first day and set it as current
      const { data: daysData } = await supabase
        .from('plan_day_exercises')
        .select('day_name')
        .eq('plan_id', planId)
        .order('day_order', { ascending: true })
        .limit(1)

      if (daysData && daysData.length > 0) {
        await supabase
          .from('plan_day_exercises')
          .update({ is_current: true })
          .eq('plan_id', planId)
          .eq('day_name', daysData[0].day_name)
      }

      // Refetch day exercises to update UI
      fetchDayExercises()
    } catch (error) {
      console.error('Error changing plan:', error)
      Alert.alert('Error', 'Failed to change current plan')
    }
  }

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{
          title: dayName,
          headerShown: true,
          headerLeft: () => (
            <TouchableOpacity 
              onPress={() => router.push(`/plans/view/${planId}`)}
              style={styles.backButton}
            >
              <FontAwesome5 name="chevron-left" size={16} color="#007AFF" />
            </TouchableOpacity>
          ),
          // Hide bottom tabs but keep header
          tabBarStyle: { display: 'none' }
        }}
      />
      
      <ScrollView style={styles.scrollView}>
        {loading ? (
          <Text style={styles.loadingText}>Loading exercises...</Text>
        ) : exercises.length === 0 ? (
          <Text style={styles.emptyText}>No exercises for this day</Text>
        ) : (
          exercises.map((exercise) => (
            <View key={exercise.id} style={styles.exerciseCard}>
              <Text style={styles.exerciseName}>{exercise.exercises.name}</Text>
              <Text style={styles.exerciseDetails}>
                {exercise.sets} sets × {exercise.reps} reps
                {exercise.rest_seconds > 0 && ` • ${exercise.rest_seconds}s rest`}
              </Text>
            </View>
          ))
        )}
      </ScrollView>

      <View style={styles.bottomContainer}>
        {!loading && plan && (
          <TouchableOpacity 
            style={[styles.actionButton, plan.is_current && styles.currentActionButton]}
            onPress={plan.is_current ? () => router.push('/') : handleChangePlan}
          >
            <Text style={styles.actionButtonText}>
              {plan.is_current ? 'Go' : 'Change to this plan'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#666',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#666',
  },
  exerciseCard: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
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
  bottomContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  actionButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  currentActionButton: {
    backgroundColor: '#34C759',  // iOS green color for success
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  backButton: {
    padding: 8,
    marginLeft: 8,
  },
})
