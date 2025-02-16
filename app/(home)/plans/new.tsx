import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native'
import React from 'react'
import { useRouter } from 'expo-router'
import { createSupabaseClient } from '../../../src/lib/supabase'
import { useAuth } from '@clerk/clerk-expo'
import { FontAwesome5 } from '@expo/vector-icons'
import BottomSheet from '@gorhom/bottom-sheet'
import { GestureHandlerRootView } from 'react-native-gesture-handler'

type Exercise = {
  id: string
  name: string
}

type DayExercise = {
  exercise: Exercise
  sets: number
  reps: number
  rest_seconds: number
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function NewPlanScreen() {
  const { getToken } = useAuth()
  const router = useRouter()
  const [name, setName] = React.useState('')
  const [saving, setSaving] = React.useState(false)
  const [exercises, setExercises] = React.useState<Exercise[]>([])
  const [searchQuery, setSearchQuery] = React.useState('')
  const [selectedDay, setSelectedDay] = React.useState<number | null>(null)
  const [dayExercises, setDayExercises] = React.useState<{ [key: number]: DayExercise[] }>({})
  const bottomSheetRef = React.useRef<BottomSheet>(null)
  const [selectedExercise, setSelectedExercise] = React.useState<Exercise | null>(null)
  const [sets, setSets] = React.useState('')
  const [reps, setReps] = React.useState('')
  const [restSeconds, setRestSeconds] = React.useState('')

  // Search exercises when query changes
  React.useEffect(() => {
    const searchExercises = async () => {
      if (!searchQuery.trim()) {
        setExercises([])
        return
      }

      try {
        const token = await getToken({ template: 'supabase' })
        const supabase = createSupabaseClient(token || undefined)
        
        const { data, error } = await supabase
          .from('exercises')
          .select('id, name')
          .ilike('name', `%${searchQuery}%`)
          .order('name')
          .limit(10)

        if (error) throw error
        setExercises(data || [])
      } catch (error) {
        console.error('Error searching exercises:', error)
      }
    }

    const debounceTimeout = setTimeout(searchExercises, 300)
    return () => clearTimeout(debounceTimeout)
  }, [searchQuery, getToken])

  const handleAddExercise = () => {
    if (!selectedExercise || selectedDay === null) return

    const setsNum = parseInt(sets)
    const repsNum = parseInt(reps)
    const restNum = parseInt(restSeconds)

    if (isNaN(setsNum) || setsNum < 1) {
      Alert.alert('Error', 'Please enter a valid number of sets')
      return
    }

    if (isNaN(repsNum) || repsNum < 1) {
      Alert.alert('Error', 'Please enter a valid number of reps')
      return
    }

    if (isNaN(restNum) || restNum < 0) {
      Alert.alert('Error', 'Please enter a valid rest time')
      return
    }

    setDayExercises(prev => ({
      ...prev,
      [selectedDay]: [
        ...(prev[selectedDay] || []),
        {
          exercise: selectedExercise,
          sets: setsNum,
          reps: repsNum,
          rest_seconds: restNum,
        },
      ],
    }))

    // Reset form
    setSelectedExercise(null)
    setSets('')
    setReps('')
    setRestSeconds('')
    setSearchQuery('')
    bottomSheetRef.current?.close()
  }

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

      // Navigate to the plan detail screen
      router.replace(`/plans/${plan.id}`)
    } catch (error) {
      console.error('Error creating plan:', error)
      Alert.alert('Error', 'Failed to create workout plan')
    } finally {
      setSaving(false)
    }
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
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
                    setSelectedDay(index)
                    bottomSheetRef.current?.expand()
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

        <BottomSheet
          ref={bottomSheetRef}
          index={-1}
          snapPoints={['75%']}
          enablePanDownToClose
          style={styles.bottomSheet}
        >
          <View style={styles.bottomSheetContent}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search exercises..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />

            <ScrollView style={styles.searchResults}>
              {exercises.map(exercise => (
                <TouchableOpacity
                  key={exercise.id}
                  style={[styles.searchResult, selectedExercise?.id === exercise.id && styles.selectedSearchResult]}
                  onPress={() => setSelectedExercise(exercise)}
                >
                  <Text style={[styles.searchResultText, selectedExercise?.id === exercise.id && styles.selectedSearchResultText]}>
                    {exercise.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {selectedExercise && (
              <View style={styles.exerciseForm}>
                <TextInput
                  style={styles.input}
                  placeholder="Sets"
                  value={sets}
                  onChangeText={setSets}
                  keyboardType="number-pad"
                />
                <TextInput
                  style={styles.input}
                  placeholder="Reps"
                  value={reps}
                  onChangeText={setReps}
                  keyboardType="number-pad"
                />
                <TextInput
                  style={styles.input}
                  placeholder="Rest (seconds)"
                  value={restSeconds}
                  onChangeText={setRestSeconds}
                  keyboardType="number-pad"
                />
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={handleAddExercise}
                >
                  <Text style={styles.addButtonText}>Add to Plan</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </BottomSheet>
      </View>
    </GestureHandlerRootView>
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
  }
})
