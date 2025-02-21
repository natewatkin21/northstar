/**
 * Week Configuration Screen
 * 
 * This screen handles both creating new weeks and editing existing weeks in a workout plan.
 * It supports two main modes:
 * 1. Create Mode: Creating a new week (planId exists but not in edit mode)
 * 2. Edit Mode: Editing an existing week (mode=edit in URL params)
 * 
 * State Management:
 * - Current State: Stored in AsyncStorage for immediate updates
 * - Initial State: Captured when entering edit mode, used for change detection
 * - Supabase: Source of truth for committed data
 * 
 * Change Detection:
 * - Tracks changes to both day names and exercises
 * - Compares current state against initial state
 * - Prompts for confirmation when discarding changes
 * 
 * Navigation:
 * - Back button behavior varies based on mode and changes:
 *   - With changes: Shows discard confirmation
 *   - No changes: Returns to previous screen
 *   - Create mode: Returns to plan edit screen
 *   - Edit mode: Returns to plan view screen
 * 
 * Data Structure:
 * - Day Names: { [dayNumber: number]: string }
 * - Day Exercises: { [dayNumber: number]: DayExercise[] }
 * 
 * AsyncStorage Keys:
 * - Day Names: plan_${planId}_week${weekNumber}DayNames
 * - Exercises: plan_${planId}_week${weekNumber}Exercises
 */

import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native'
import React from 'react'
import { useRouter, useLocalSearchParams, Stack } from 'expo-router'
import { useFocusEffect } from '@react-navigation/native'
import { FontAwesome5 } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { DayExercise, WeekFormData } from '../../../../../src/types/workout'
import { createSupabaseClient } from '../../../../../src/lib/supabase'
import { useAuth } from '@clerk/clerk-expo'

export default function WeekConfigScreen() {
  console.log('WeekConfigScreen mounting')
  const router = useRouter()
  const params = useLocalSearchParams()
  const weekNumber = params.weekNumber ? parseInt(params.weekNumber as string) : params.number ? parseInt(params.number as string) : 1
  const planId = typeof params.planId === 'string' ? params.planId : undefined
  const isEditMode = params.mode === 'edit'
  console.log('Params:', { weekNumber, planId, isEditMode })

  const [dayExercises, setDayExercises] = React.useState<{ [key: number]: DayExercise[] }>({})
  const [dayNames, setDayNames] = React.useState<{ [key: number]: string }>({})
  
  // Store initial state for change detection in update mode
  const [initialDayExercises, setInitialDayExercises] = React.useState<{ [key: number]: DayExercise[] }>({})
  const [initialDayNames, setInitialDayNames] = React.useState<{ [key: number]: string }>({})

  // Load saved day names and set initial state if needed
  useFocusEffect(
    React.useCallback(() => {
      const loadDayNames = async () => {
        try {
          console.log('Loading day names for week', weekNumber)
          const storageKey = `plan_${planId}_week${weekNumber}DayNames`
          const savedNames = await AsyncStorage.getItem(storageKey)
          console.log('Loaded day names:', savedNames)
          const parsedNames = savedNames ? JSON.parse(savedNames) : {}
          setDayNames(parsedNames)
          // Set initial state when first entering edit mode or creating new week
          if ((isEditMode || planId) && Object.keys(initialDayNames).length === 0) {
            console.log('Setting initial day names on first load')
            // For new weeks, initial state is empty
            setInitialDayNames(isEditMode ? parsedNames : {})
          }
        } catch (error) {
          console.error('Error loading day names:', error)
        }
      }
      loadDayNames()
    }, [weekNumber, planId])
  )

  // Save day names when they change
  const handleDayNameChange = React.useCallback(async (dayNumber: number, name: string) => {
    console.log('Saving day name for day', dayNumber, 'name:', name)
    const newNames = { ...dayNames, [dayNumber]: name }
    setDayNames(newNames)
    try {
      const storageKey = `plan_${planId}_week${weekNumber}DayNames`
      await AsyncStorage.setItem(storageKey, JSON.stringify(newNames))
      console.log('Saved day names to', storageKey, ':', JSON.stringify(newNames))
    } catch (error) {
      console.error('Error saving day names:', error)
    }
  }, [dayNames, weekNumber])
  const [saving, setSaving] = React.useState(false)
  const [loading, setLoading] = React.useState(true)
  const { getToken } = useAuth()



  // Load initial data from Supabase when entering edit mode
  React.useEffect(() => {
    const loadInitialData = async () => {
      if (!isEditMode || !planId || !weekNumber) return
      
      try {
        console.log('Loading initial data from Supabase...')
        const token = await getToken({ template: 'supabase' })
        const supabase = createSupabaseClient(token || undefined)

        const { data: daysData, error } = await supabase
          .from('plan_day_exercises')
          .select(`
            day_order,
            day_name,
            exercise_id,
            sets,
            reps,
            rest_seconds,
            exercises(id, name)
          `)
          .eq('plan_id', planId)
          .eq('week_number', weekNumber)
          .order('day_order', { ascending: true })

        if (error) throw error

        // Process the data into our state format
        const names: { [key: number]: string } = {}
        const exercises: { [key: number]: DayExercise[] } = {}

        daysData?.forEach(day => {
          if (day.day_order !== null) {
            // Store day name
            if (day.day_name) {
              names[day.day_order] = day.day_name
            }

            // Store exercise if present
            if (day.exercise_id && day.exercises) {
              if (!exercises[day.day_order]) {
                exercises[day.day_order] = []
              }
              exercises[day.day_order].push({
                id: day.exercise_id,
                name: day.exercises.name,
                sets: day.sets || 0,
                reps: day.reps || 0,
                rest_seconds: day.rest_seconds || 0
              })
            }
          }
        })

        console.log('Setting initial state from Supabase:', { names, exercises })
        setInitialDayNames(names)
        setInitialDayExercises(exercises)
      } catch (error) {
        console.error('Error loading initial data:', error)
      }
    }

    loadInitialData()
  }, [isEditMode, planId, weekNumber])

  const fetchWeekData = React.useCallback(async () => {
    console.log('fetchWeekData called', { planId, weekNumber })
    
    try {
      setLoading(true)
      
      // Always try to load from AsyncStorage first
      console.log('Checking AsyncStorage for exercises')
      const storageKey = `plan_${planId}_week${weekNumber}Exercises`
      const savedExercisesStr = await AsyncStorage.getItem(storageKey)
      console.log('Loaded exercises from AsyncStorage:', {
        key: storageKey,
        data: savedExercisesStr ? JSON.parse(savedExercisesStr) : {}
      })
      const savedExercises = savedExercisesStr ? JSON.parse(savedExercisesStr) : {}
      
      // If we have saved exercises and this is the right plan, use those
      if (savedExercisesStr && planId) {
        console.log('Using exercises from AsyncStorage')
        setDayExercises(savedExercises)
        // Set initial exercises when first entering edit mode or creating new week
        if ((isEditMode || planId) && Object.keys(initialDayExercises).length === 0) {
          console.log('Setting initial exercises on first load')
          // For new weeks, initial state is empty
          setInitialDayExercises(isEditMode ? savedExercises : {})
        }
        setLoading(false)
        return
      }
      
      // If no saved exercises and no planId, show empty state
      if (!planId || !weekNumber) {
        console.log('No saved exercises and no planId, showing empty state')
        setDayExercises({})
        setLoading(false)
        return
      }

      console.log('Fetching data from Supabase')
      const token = await getToken({ template: 'supabase' })
      const supabase = createSupabaseClient(token || undefined)

      const { data, error } = await supabase
        .from('plan_day_exercises')
        .select(`
          day_order,
          day_name,
          exercise_id,
          sets,
          reps,
          rest_seconds,
          exercises(id, name)
        `)
        .eq('plan_id', planId)
        .eq('week_number', weekNumber)
        .order('day_order', { ascending: true })

      if (error) throw error

      // Process exercises and day names from database
      const exercisesByDay: { [key: number]: DayExercise[] } = {}
      const namesByDay: { [key: number]: string } = {}

      if (data) {
        // First pass: collect all day names
        data.forEach(item => {
          if (item.day_name) {
            namesByDay[item.day_order] = item.day_name
          }
        })

        // Second pass: collect exercises
        data.forEach(item => {
          if (item.exercise_id && item.exercises?.name) {
            const dayOrder = item.day_order
            if (!exercisesByDay[dayOrder]) {
              exercisesByDay[dayOrder] = []
            }
            exercisesByDay[dayOrder].push({
              id: item.exercise_id,
              name: item.exercises.name,
              sets: item.sets || 0,
              reps: item.reps || 0,
              rest_seconds: item.rest_seconds || 0
            })
          }
        })
      }

      // Update exercises state
      setDayExercises(exercisesByDay)
      
      // If in edit mode, store initial state for change detection
      if (isEditMode) {
        setInitialDayExercises(savedExercises)
      }
    } catch (error) {
      console.error('Error fetching week data:', error)
      Alert.alert('Error', 'Failed to load week data')
    } finally {
      setLoading(false)
    }
  }, [planId, weekNumber, getToken])

  // Load data on mount
  React.useEffect(() => {
    console.log('Initial data load effect running')
    fetchWeekData()
  }, [])

  const handleSaveWeek = async () => {
    if (!planId) {
      Alert.alert('Error', 'No plan ID provided')
      return
    }

    try {
      setSaving(true)
      const token = await getToken({ template: 'supabase' })
      const supabase = createSupabaseClient(token || undefined)

      // First delete any existing exercises for this week
      await supabase
        .from('plan_day_exercises')
        .delete()
        .eq('plan_id', planId)
        .eq('week_number', weekNumber)

      // Create rows for all days that have names
      const daysToSave = Object.keys(dayNames).map(dayNumber => ({
        plan_id: planId,
        week_number: weekNumber,
        day_order: parseInt(dayNumber),
        day_name: dayNames[parseInt(dayNumber)] || '',
        // No exercise data for days without exercises
        exercise_id: null,
        sets: null,
        reps: null,
        rest_seconds: null
      }))

      // Add exercise data for days that have exercises
      Object.entries(dayExercises).forEach(([dayNumber, exercises]) => {
        exercises.forEach(exercise => {
          daysToSave.push({
            plan_id: planId,
            week_number: weekNumber,
            day_order: parseInt(dayNumber),
            day_name: dayNames[parseInt(dayNumber)] || '',
            exercise_id: exercise.id,
            sets: exercise.sets,
            reps: exercise.reps,
            rest_seconds: exercise.rest_seconds
          })
        })
      })

      // Insert all days and exercises
      const { error: saveError } = await supabase
        .from('plan_day_exercises')
        .insert(daysToSave)

      if (saveError) throw saveError

      // Save current state to AsyncStorage
      const dayNamesKey = `plan_${planId}_week${weekNumber}DayNames`
      const exercisesKey = `plan_${planId}_week${weekNumber}Exercises`
      
      await AsyncStorage.setItem(
        dayNamesKey,
        JSON.stringify(dayNames)
      )
      await AsyncStorage.setItem(
        exercisesKey,
        JSON.stringify(dayExercises)
      )

      // If in edit mode, update initial state to match current state
      if (isEditMode) {
        setInitialDayNames(dayNames)
        setInitialDayExercises(dayExercises)
      }

      // Navigate to plan overview in edit mode
      router.replace(`/plans/view/${planId}?mode=edit`)
    } catch (error) {
      console.error('Error saving week:', error)
      Alert.alert('Error', 'Failed to save week configuration')
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{
          title: `Week ${weekNumber}`,
          headerLeft: () => (
            <TouchableOpacity 
              style={styles.backButton}
              onPress={async () => {
                if (planId) {
                  // Deep compare objects to detect changes (both edit mode and new week)
                  // Compare lengths first
                  const dayNamesLengthDiff = Object.keys(dayNames).length !== Object.keys(initialDayNames).length
                  const exercisesLengthDiff = Object.keys(dayExercises).length !== Object.keys(initialDayExercises).length
                  
                  // Then compare contents
                  const dayNamesContentDiff = Object.keys({ ...dayNames, ...initialDayNames }).some(key => 
                    dayNames[key] !== initialDayNames[key]
                  )
                  const exercisesContentDiff = Object.keys({ ...dayExercises, ...initialDayExercises }).some(key => 
                    JSON.stringify(dayExercises[key] || []) !== JSON.stringify(initialDayExercises[key] || [])
                  )
                  
                  const hasChanges = dayNamesLengthDiff || dayNamesContentDiff || exercisesLengthDiff || exercisesContentDiff
                  
                  console.log('Change detection:', {
                    dayNames,
                    initialDayNames,
                    dayExercises,
                    initialDayExercises,
                    differences: {
                      dayNamesLengthDiff,
                      dayNamesContentDiff,
                      exercisesLengthDiff,
                      exercisesContentDiff
                    },
                    hasChanges
                  })

                  if (hasChanges) {
                    // Only show prompt if there are changes
                    Alert.alert(
                      'Discard Changes',
                      'Are you sure you want to discard your changes?',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Discard',
                          style: 'destructive',
                          onPress: async () => {
                            // Restore original state to AsyncStorage
                            const dayNamesKey = `plan_${planId}_week${weekNumber}DayNames`
                            const exercisesKey = `plan_${planId}_week${weekNumber}Exercises`
                            
                            await AsyncStorage.setItem(
                              dayNamesKey,
                              JSON.stringify(initialDayNames)
                            )
                            await AsyncStorage.setItem(
                              exercisesKey,
                              JSON.stringify(initialDayExercises)
                            )
                            
                            // Navigate back to plan view in edit mode
                            router.replace(`/plans/view/${planId}?mode=edit`)
                          }
                        }
                      ]
                    )
                  } else {
                    // No changes, just go back
                    router.replace(`/plans/view/${planId}?mode=edit`)
                  }
                } else {
                  // Only show delete prompt if we're creating a new week (no planId)
                  Alert.alert(
                    'Delete Week',
                    'Are you sure you want to delete this week? This cannot be undone.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: async () => {
                          try {
                            // Clear local storage
                            await AsyncStorage.removeItem(`week${weekNumber}DayNames`)
                            await AsyncStorage.removeItem(`week${weekNumber}Exercise`)

                            // Go back to plans list
                            router.replace('/plans')
                          } catch (error) {
                            console.error('Error deleting week:', error)
                            Alert.alert('Error', 'Failed to delete week')
                          }
                        }
                      }
                    ]
                  )
                }
              }}
            >
              <FontAwesome5 name="chevron-left" size={16} color="#007AFF" />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
          )
        }}
      />

      <View style={styles.mainContainer}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.message}>Loading...</Text>
          </View>
        ) : (
          <>
            <ScrollView style={styles.content}>
              {[1,2,3,4,5,6,7].map((dayNumber) => (
                <View key={dayNumber} style={styles.daySection}>
                  <View style={styles.dayHeader}>
                    <TextInput
                      style={styles.dayNameInput}
                      placeholder={`Day ${dayNumber} Name`}
                      value={dayNames[dayNumber] || ''}
                      onChangeText={(text) => handleDayNameChange(dayNumber, text)}
                      autoCapitalize="words"
                    />
                    <TouchableOpacity
                      onPress={() => {
                        const dayName = dayNames[dayNumber] || `Day ${dayNumber}`
                        router.push(`/plans/new/add-exercise?planId=${planId}&weekNumber=${weekNumber}&day=${dayNumber}&dayName=${encodeURIComponent(dayName)}${isEditMode ? '&mode=edit' : ''}`)
                      }}
                    >
                      <FontAwesome5 name="plus" size={20} color="#0891b2" />
                    </TouchableOpacity>
                  </View>
                  {dayExercises[dayNumber]?.map((exercise, exerciseIndex) => (
                    <View key={exerciseIndex} style={styles.exerciseItem}>
                      <Text style={styles.exerciseName}>{exercise.name}</Text>
                      <Text style={styles.exerciseDetails}>
                        {exercise.sets} sets × {exercise.reps} reps ({exercise.rest_seconds}s rest)
                      </Text>
                    </View>
                  ))}
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSaveWeek}
              disabled={saving || Object.keys(dayNames).length === 0}
            >
              <Text style={styles.saveButtonText}>
                {saving ? 'Saving...' : isEditMode ? `Update Week ${weekNumber}` : `Save Week ${weekNumber}`}
              </Text>
            </TouchableOpacity>
          </>
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
  mainContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    fontSize: 16,
    color: '#6b7280',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  backText: {
    color: '#007AFF',
    fontSize: 16,
    marginLeft: 4,
  },
  daySection: {
    marginBottom: 20,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dayNameInput: {
    flex: 1,
    marginRight: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    fontSize: 16,
  },
  exerciseItem: {
    backgroundColor: '#f3f4f6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  exerciseDetails: {
    fontSize: 14,
    color: '#4b5563',
  },
  saveButton: {
    backgroundColor: '#0891b2',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
})
