/**
 * New Plan Screen
 * 
 * Allows users to create a new workout plan with multiple days and exercises.
 * 
 * Plan Creation Flow:
 * 1. Enter plan name
 * 2. Add days with custom names
 * 3. Add exercises to each day with:
 *    - Exercise name (selected from list)
 *    - Sets (> 0)
 *    - Reps (> 0)
 *    - Rest time in seconds (>= 0)
 * 
 * Data Structure:
 * - Each day has a numeric order (0-based)
 * - Exercises within a day are ordered by created_at
 * - All exercises for a day share the same day_name
 * 
 * Validation:
 * 1. Plan name is required
 * 2. Each day must have a name
 * 3. Exercise details must be valid numbers
 * 
 * After Creation:
 * - Redirects to plan list
 * - New plan appears at top of list
 */

import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native'
import React from 'react'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { createSupabaseClient } from '../../../src/lib/supabase'
import { useAuth } from '@clerk/clerk-expo'
import { FontAwesome5 } from '@expo/vector-icons'

type Exercise = {
  id: string
  name: string
}

type DayExercise = {
  exercise: Exercise
  sets: number
  reps: number
  rest_seconds: number
  created_at?: string // Optional since existing exercises might not have it
}

export default function NewPlanScreen() {
  const { getToken } = useAuth()
  const router = useRouter()
  const params = useLocalSearchParams()
  const [name, setName] = React.useState('')
  const [saving, setSaving] = React.useState(false)
  const [dayExercises, setDayExercises] = React.useState<{ [key: number]: DayExercise[] }>({})
  const [dayNames, setDayNames] = React.useState<{ [key: number]: string }>({})

  // Function to clear form data
  const clearFormData = React.useCallback(() => {
    setName('')
    setDayExercises({})
    setDayNames({})
    setSaving(false)
  }, [])

  // Clear form data and URL params on mount and unmount
  React.useEffect(() => {
    // Clear URL params on mount
    router.setParams({
      exerciseId: undefined,
      exerciseName: undefined,
      day: undefined,
      sets: undefined,
      reps: undefined,
      restSeconds: undefined
    })

    // Clear form data on unmount
    return () => {
      clearFormData()
    }
  }, [])

  // Function to update exercises for a day
  // Handle exercise params when returning from add exercise screen
  React.useEffect(() => {
    const exerciseId = params.exerciseId as string | undefined
    const exerciseName = params.exerciseName as string | undefined
    const day = params.day ? Number(params.day) : undefined
    const sets = params.sets ? Number(params.sets) : undefined
    const reps = params.reps ? Number(params.reps) : undefined
    const restSeconds = params.restSeconds ? Number(params.restSeconds) : undefined

    if (exerciseId && exerciseName && day !== undefined && 
        sets && !isNaN(sets) && 
        reps && !isNaN(reps) && 
        restSeconds !== undefined && !isNaN(restSeconds)) {
      
      setDayExercises(prev => {
        // Simply append the new exercise to the end of the array
        return {
          ...prev,
          [day]: [
            ...(prev[day] || []),
            {
              exercise: {
                id: exerciseId,
                name: exerciseName
              },
              sets: sets,
              reps: reps,
              rest_seconds: restSeconds
            }
          ]
        }
      })
    }
  }, [params.exerciseId, params.exerciseName, params.day, params.sets, params.reps, params.restSeconds])

  const handleSavePlan = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a plan name')
      return
    }

    // Check if all days with exercises have names
    const daysWithExercises = Object.keys(dayExercises)
    const missingDayNames = daysWithExercises.filter(day => {
      const dayIndex = parseInt(day)
      return dayExercises[dayIndex]?.length > 0 && !dayNames[dayIndex]?.trim()
    })

    if (missingDayNames.length > 0) {
      Alert.alert('Error', 'Please enter names for all days that have exercises')
      return
    }

    try {
      setSaving(true)
      const token = await getToken({ template: 'supabase' })
      const supabase = createSupabaseClient(token || undefined)
      
      // Create the plan
      const { data: plan, error: planError } = await supabase
        .from('workout_plans')
        .insert([{ name: name.trim() }])
        .select()
        .single()

      if (planError) throw planError

      console.log('Creating plan with days:', dayNames)
      console.log('Creating plan with exercises:', dayExercises)
      
      // Prepare all inserts
      const inserts = []
      
      // First, add any days that have names but no exercises
      for (const [day, name] of Object.entries(dayNames)) {
        const dayIndex = parseInt(day)
        const trimmedName = name?.trim()
        if (trimmedName && !dayExercises[day]?.length) {
          console.log(`Adding day without exercises: ${trimmedName}`)
          inserts.push({
            plan_id: plan.id,
            day_name: trimmedName,
            day_order: dayIndex
          })
        }
      }

      // Then add exercises for days that have them
      for (const [day, exercises] of Object.entries(dayExercises)) {
        const dayIndex = parseInt(day)
        const dayName = dayNames[day]?.trim()
        if (!dayName) {
          console.log(`Skipping exercises for day ${day} - no day name`)
          continue
        }

        console.log(`Adding ${exercises.length} exercises for day ${dayName}`)
        exercises.forEach(exercise => {
          inserts.push({
            plan_id: plan.id,
            exercise_id: exercise.exercise.id,
            day_name: dayName,
            sets: exercise.sets,
            reps: exercise.reps,
            rest_seconds: exercise.rest_seconds,
            day_order: dayIndex
          })
        })
      }

      // Insert all records at once
      console.log('Inserting all plan day exercises:', inserts)
      const { data, error } = await supabase
        .from('plan_day_exercises')
        .insert(inserts)
        .select()
        .order('day_order', { ascending: true })
        .order('created_at', { ascending: true })
      
      if (error) {
        console.error('Error inserting plan day exercises:', error)
        throw error
      }
      console.log('Successfully inserted all plan day exercises:', data)

      // All operations completed successfully

      // Clear form data, URL params, and navigate to the view screen
      clearFormData()
      router.setParams({
        exerciseId: undefined,
        exerciseName: undefined,
        day: undefined,
        sets: undefined,
        reps: undefined,
        restSeconds: undefined
      })
      router.replace(`/plans/view/${plan.id}`)
    } catch (error) {
      console.error('Error creating plan:', error)
      Alert.alert('Error', 'Failed to create workout plan')
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.container}>
        <TextInput
          style={styles.nameInput}
          placeholder="Plan Name"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />

        <ScrollView style={styles.content}>
          {[0,1,2,3,4,5,6].map((index) => (
            <View key={index} style={styles.daySection}>
              <View style={styles.dayHeader}>
                <TextInput
                  style={styles.dayNameInput}
                  placeholder="Day Name (e.g., Arms)"
                  value={dayNames[index] || ''}
                  onChangeText={(text) => setDayNames(prev => ({ ...prev, [index]: text }))}
                  autoCapitalize="words"
                />
                <TouchableOpacity
                  onPress={() => {
                    router.push({
                      pathname: '/plans/new/add-exercise',
                      params: { day: index }
                    })
                  }}
                >
                  <FontAwesome5 name="plus" size={20} color="#0891b2" />
                </TouchableOpacity>
              </View>
              {dayExercises[index]?.map((exercise, exerciseIndex) => (
                <View key={exerciseIndex} style={styles.exerciseItem}>
                  <Text style={styles.exerciseName}>{exercise.exercise.name}</Text>
                  <Text style={styles.exerciseDetails}>
                    {exercise.sets} sets × {exercise.reps} reps ({exercise.rest_seconds}s rest)
                  </Text>
                </View>
              ))}
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
  dayNameInput: {
    flex: 1,
    marginHorizontal: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    fontSize: 14,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  nameInput: {
    borderBottomWidth: 1,
    borderColor: '#ccc',
    padding: 16,
    fontSize: 18,
    marginBottom: 16,
  },
  weekView: {
    flex: 1,
  },
  dayContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dayTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  exerciseItem: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '500',
  },
  exerciseDetails: {
    color: '#666',
    marginTop: 4,
  },
  bottomSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  bottomSheetContent: {
    padding: 16,
    flex: 1,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  searchResults: {
    maxHeight: 200,
  },
  searchResult: {
    padding: 12,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  selectedSearchResult: {
    backgroundColor: '#0891b2',
  },
  searchResultText: {
    fontSize: 16,
  },
  selectedSearchResultText: {
    color: '#fff',
  },
  exerciseForm: {
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  addButton: {
    backgroundColor: '#0891b2',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#0891b2',
    padding: 16,
    margin: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSheetBackground: {
    backgroundColor: '#fff',
  },
  bottomSheetIndicator: {
    backgroundColor: '#ccc',
    width: 40,
    height: 4,
    borderRadius: 2,
  }
})
