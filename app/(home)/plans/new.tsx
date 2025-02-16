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

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function NewPlanScreen() {
  const { getToken } = useAuth()
  const router = useRouter()
  const params = useLocalSearchParams()
  const [name, setName] = React.useState('')
  const [saving, setSaving] = React.useState(false)
  const [dayExercises, setDayExercises] = React.useState<{ [key: number]: DayExercise[] }>({})

  // Function to clear form data
  const clearFormData = React.useCallback(() => {
    setName('')
    setDayExercises({})
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

      // Add exercises to each day
      const exercisePromises = Object.entries(dayExercises).map(([day, exercises]) =>
        exercises.map(exercise =>
          supabase
            .from('plan_day_exercises')
            .insert({
              plan_id: plan.id,
              exercise_id: exercise.exercise.id,
              day_of_week: parseInt(day),
              sets: exercise.sets,
              reps: exercise.reps,
              rest_seconds: exercise.rest_seconds,
            })
        )
      ).flat()

      const results = await Promise.all(exercisePromises)
      const errors = results.filter(result => result.error)

      if (errors.length > 0) {
        throw new Error('Failed to add some exercises to the plan')
      }

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

        <ScrollView style={styles.weekView}>
          {DAYS.map((day, index) => (
            <View key={day} style={styles.dayContainer}>
              <View style={styles.dayHeader}>
                <Text style={styles.dayTitle}>{day}</Text>
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
