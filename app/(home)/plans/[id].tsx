/**
 * Edit Plan Screen
 * 
 * This screen allows users to edit an existing workout plan, including:
 * 1. Renaming the plan
 * 2. Editing day names
 * 3. Adding exercises to days
 * 
 * Data Flow:
 * - Exercises are ordered by day_order (ascending) and created_at (ascending)
 * - New exercises are added to the bottom of each day's list
 * - Exercise data is refreshed when the screen gains focus
 * 
 * Exercise Display Rules:
 * - Exercises without names ("Unknown Exercise") are filtered out
 * - Empty days show "No exercises this day"
 * 
 * State Management:
 * - Plan name is controlled via local state
 * - Day names are managed in a mapping object: { [dayOrder: number]: string }
 * - Exercise list is refreshed on focus to ensure consistency
 */

import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, TextInput } from 'react-native'
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
  day_name: string | null
  day_order: number
  sets: number
  reps: number
  rest_seconds: number
  exercises: {
    name: string
  }
}

export default function PlanDetailScreen() {
  const { getToken } = useAuth()
  const router = useRouter()
  const params = useLocalSearchParams()
  const id = typeof params.id === 'string' ? params.id : undefined
  const [plan, setPlan] = React.useState<WorkoutPlan | null>(null)
  const [planName, setPlanName] = React.useState('')
  const [exercises, setExercises] = React.useState<PlanExercise[]>([])
  const [dayNames, setDayNames] = React.useState<{ [key: number]: string }>({})
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)

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
      setPlanName(planData.name)

      console.log('Fetching exercises for plan...')
      
      const { data: exerciseData, error: exerciseError } = await supabase
        .from('plan_day_exercises')
        .select(`
          id,
          exercise_id,
          day_name,
          day_order,
          sets,
          reps,
          rest_seconds,
          exercises (name)
        `)
        .eq('plan_id', id)
        .order('day_order', { ascending: true })
        .order('created_at', { ascending: true })

      console.log('Raw exercise data:', JSON.stringify(exerciseData, null, 2))
      
      console.log('Exercise data:', JSON.stringify(exerciseData, null, 2))
      if (exerciseError) {
        console.error('Exercise fetch error:', exerciseError)
      }

      if (exerciseError) throw exerciseError
      setExercises(exerciseData)

      // Load existing day names
      const existingDayNames: { [key: number]: string } = {}
      exerciseData.forEach((exercise: PlanExercise) => {
        if (exercise.day_name && exercise.day_order !== null) {
          existingDayNames[exercise.day_order] = exercise.day_name
        }
      })
      setDayNames(existingDayNames)
    } catch (error) {
      console.error('Error fetching plan details:', error)
      Alert.alert('Error', 'Failed to load workout plan')
      router.back()
    } finally {
      setLoading(false)
    }
  }, [id, getToken, router])



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

  // Group exercises by day order
  const exercisesByDay = React.useMemo(() => {
    const grouped: { [key: number]: PlanExercise[] } = {}
    exercises.forEach(exercise => {
      if (exercise.day_order === null) return
      if (!grouped[exercise.day_order]) {
        grouped[exercise.day_order] = []
      }
      grouped[exercise.day_order].push(exercise)
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

  const handleSavePlan = async () => {
    if (!planName.trim()) {
      Alert.alert('Error', 'Please enter a plan name')
      return
    }

    // Validate that all days with exercises have names
    const daysWithExercises = Object.keys(exercisesByDay)
    const missingDayNames = daysWithExercises.filter(dayOrder => !dayNames[parseInt(dayOrder)]?.trim())
    if (missingDayNames.length > 0) {
      Alert.alert('Error', 'Please enter names for all days that have exercises')
      return
    }

    try {
      setSaving(true)
      const token = await getToken({ template: 'supabase' })
      const supabase = createSupabaseClient(token || undefined)

      // Update plan name
      const { error: planError } = await supabase
        .from('workout_plans')
        .update({ name: planName.trim() })
        .eq('id', id)

      if (planError) throw planError

      // Update day names for exercises
      const updatePromises = Object.entries(exercisesByDay).map(async ([oldDayName, exercises]) => {
        if (exercises.length === 0) return []
        
        // Ensure we have a day name
        const newDayName = dayNames[oldDayName]?.trim()
        if (!newDayName) {
          throw new Error(`Day name is required for ${oldDayName}`)
        }

        // Update all exercises for this day to have the same day name
        const { data: updatedExercises, error: updateError } = await supabase
          .from('plan_day_exercises')
          .update({ day_name: newDayName })
          .eq('day_order', oldDayName)
          .select()
          .order('created_at', { ascending: true })

        if (updateError) {
          console.error('Error updating day name:', updateError)
          throw updateError
        }

        return []
      })

      const results = await Promise.all(updatePromises)
      const errors = results.filter(result => result.error)

      if (errors.length > 0) {
        throw new Error('Failed to update some exercises')
      }

      Alert.alert('Success', 'Plan updated successfully', [
        { 
          text: 'OK',
          onPress: () => router.replace(`/plans/view/${id}`)
        }
      ])
    } catch (error) {
      console.error('Error updating plan:', error)
      Alert.alert('Error', 'Failed to update workout plan')
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.nameInput}
        placeholder="Plan Name"
        value={planName}
        onChangeText={setPlanName}
        autoCapitalize="words"
      />
      <ScrollView style={styles.content}>
        
        {Object.entries(exercisesByDay).map(([dayOrder, dayExercises]) => (
          <View key={dayOrder} style={styles.daySection}>
            <View style={styles.dayHeader}>
              <View style={styles.dayTitles}>
                <TextInput
                  style={styles.dayNameInput}
                  placeholder="Day Name (e.g., Arms)"
                  value={dayNames[parseInt(dayOrder)] || dayExercises[0]?.day_name || ''}
                  onChangeText={(text) => setDayNames(prev => ({ ...prev, [parseInt(dayOrder)]: text }))}
                  autoCapitalize="words"
                />
              </View>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => {
                  if (!id) return
                  const currentDayName = dayNames[parseInt(dayOrder)] || dayExercises[0]?.day_name
                  if (!currentDayName) {
                    Alert.alert('Error', 'Please enter a name for this day first')
                    return
                  }
                  router.push(`/plans/${id}/add-exercise?day=${encodeURIComponent(currentDayName)}&order=${dayOrder}`)
                }}
              >
                <FontAwesome5 name="plus" size={16} color="#007AFF" />
              </TouchableOpacity>
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
      <TouchableOpacity
        style={[styles.saveButton, saving && styles.buttonDisabled]}
        onPress={handleSavePlan}
        disabled={saving}
      >
        <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save Plan'}</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  nameInput: {
    fontSize: 24,
    fontWeight: '600',
    padding: 16,
    backgroundColor: '#fff',
  },
  dayNameInput: {
    flex: 1,
    marginHorizontal: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    fontSize: 14,
  },
  saveButton: {
    backgroundColor: '#0891b2',
    padding: 16,
    borderRadius: 8,
    margin: 16,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  dayTitles: {
    flex: 1,
  },
  dayType: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
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
