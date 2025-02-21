/**
 * Add Exercise Screen
 * 
 * This screen allows users to add exercises to specific days within a week.
 * It supports both creating new weeks and editing existing ones.
 * 
 * Features:
 * 1. Exercise Selection
 *    - Search exercises by name
 *    - Real-time search results
 *    - Exercise configuration (sets, reps, rest)
 * 
 * 2. State Management
 *    - Temporary state in AsyncStorage
 *    - Preserves edit mode across navigation
 *    - Maintains week and day context
 * 
 * 3. Navigation
 *    - Returns to week configuration
 *    - Preserves edit mode in URL
 *    - Maintains week number context
 * 
 * 4. Data Flow
 *    - Reads exercises from Supabase
 *    - Stores configurations in AsyncStorage
 *    - Updates parent week state on save
 * 
 * URL Parameters:
 * - planId: ID of the current plan
 * - weekNumber: Current week number
 * - day: Day number (1-7)
 * - dayName: Name of the day
 * - mode: edit (optional)
 */

import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native'
import React from 'react'
import { useRouter, useLocalSearchParams, Stack } from 'expo-router'
import { createSupabaseClient } from '../../../../src/lib/supabase'
import { useAuth } from '@clerk/clerk-expo'
import { FontAwesome5 } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'

type Exercise = {
  id: string
  name: string
}

export default function AddExerciseScreen() {
  const { getToken } = useAuth()
  const router = useRouter()
  const params = useLocalSearchParams()
  const planId = typeof params.planId === 'string' ? params.planId : undefined
  const weekNumber = typeof params.weekNumber === 'string' ? parseInt(params.weekNumber) : undefined
  const day = typeof params.day === 'string' || typeof params.day === 'number' ? Number(params.day) : undefined
  const dayName = typeof params.dayName === 'string' ? decodeURIComponent(params.dayName) : `Day ${day}`
  const isEditMode = params.mode === 'edit'
  const [searchQuery, setSearchQuery] = React.useState('')
  const [exercises, setExercises] = React.useState<Exercise[]>([])
  const [selectedExercise, setSelectedExercise] = React.useState<Exercise | null>(null)
  const [sets, setSets] = React.useState('')
  const [reps, setReps] = React.useState('')
  const [restSeconds, setRestSeconds] = React.useState('')

  // If no valid params are provided, go back
  React.useEffect(() => {
    if (!planId || !weekNumber || day === undefined || isNaN(day)) {
      router.back()
    }
  }, [planId, weekNumber, day, router])

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

  const handleAddExercise = async () => {
    if (!selectedExercise || day === undefined) return

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

    try {
      const token = await getToken({ template: 'supabase' })
      const supabase = createSupabaseClient(token || undefined)

      // Load existing exercises
      const storageKey = `plan_${planId}_week${weekNumber}Exercises`
      const savedExercisesStr = await AsyncStorage.getItem(storageKey)
      const savedExercises = savedExercisesStr ? JSON.parse(savedExercisesStr) : {}
      
      // Add new exercise
      const updatedExercises = {
        ...savedExercises,
        [day]: [
          ...(savedExercises[day] || []),
          {
            id: selectedExercise.id,
            name: selectedExercise.name,
            sets: setsNum,
            reps: repsNum,
            rest_seconds: restNum
          }
        ]
      }

      console.log('Saving exercise to week:', {
        key: storageKey,
        data: updatedExercises
      })

      // Save updated exercises
      await AsyncStorage.setItem(
        storageKey,
        JSON.stringify(updatedExercises)
      )

      // Navigate back to week view, preserving the current mode
      router.replace(`/plans/new/week/${weekNumber}?planId=${planId}${isEditMode ? '&mode=edit' : ''}`)
    } catch (error) {
      console.error('Error saving exercise data:', error)
      Alert.alert('Error', 'Failed to save exercise data')
    }
  }

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{
          title: 'Add Exercise'
        }}
      />
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
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
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
})
