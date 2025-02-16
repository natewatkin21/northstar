import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native'
import React from 'react'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { createSupabaseClient } from '../../../../src/lib/supabase'
import { useAuth } from '@clerk/clerk-expo'
import { FontAwesome5 } from '@expo/vector-icons'

type Exercise = {
  id: string
  name: string
}

export default function AddExerciseScreen() {
  const { getToken } = useAuth()
  const router = useRouter()
  const params = useLocalSearchParams()
  const day = typeof params.day === 'string' || typeof params.day === 'number' ? Number(params.day) : undefined
  const [searchQuery, setSearchQuery] = React.useState('')
  const [exercises, setExercises] = React.useState<Exercise[]>([])
  const [selectedExercise, setSelectedExercise] = React.useState<Exercise | null>(null)
  const [sets, setSets] = React.useState('')
  const [reps, setReps] = React.useState('')
  const [restSeconds, setRestSeconds] = React.useState('')

  // If no valid day is provided, go back
  React.useEffect(() => {
    if (day === undefined || isNaN(day)) {
      router.back()
    }
  }, [day, router])

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

    // Return to previous screen with exercise data
    router.push({
      pathname: '/plans/new',
      params: {
        exerciseId: selectedExercise.id,
        exerciseName: selectedExercise.name,
        day: day,
        sets: setsNum,
        reps: repsNum,
        restSeconds: restNum
      }
    })
  }

  return (
    <View style={styles.container}>
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
