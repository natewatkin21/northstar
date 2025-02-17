import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView } from 'react-native'
import React from 'react'
import { useLocalSearchParams, useRouter } from 'expo-router'
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
  const planId = typeof params.id === 'string' ? params.id : undefined
  const dayName = typeof params.day === 'string' ? params.day : undefined
  const dayOrder = typeof params.order === 'string' ? parseInt(params.order) : undefined

  // If no valid ID or day is provided, go back
  React.useEffect(() => {
    if (!planId || !dayName || dayOrder === undefined || isNaN(dayOrder)) {
      router.back()
    }
  }, [planId, dayName, dayOrder, router])
  const [exercises, setExercises] = React.useState<Exercise[]>([])
  const [loading, setLoading] = React.useState(true)
  const [selectedExercise, setSelectedExercise] = React.useState<Exercise | null>(null)
  const [sets, setSets] = React.useState('3')
  const [reps, setReps] = React.useState('10')
  const [restSeconds, setRestSeconds] = React.useState('60')
  const [saving, setSaving] = React.useState(false)

  const [searchQuery, setSearchQuery] = React.useState('')

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
      } finally {
        setLoading(false)
      }
    }

    const debounceTimeout = setTimeout(searchExercises, 300)
    return () => clearTimeout(debounceTimeout)
  }, [searchQuery, getToken])

  const handleSave = async () => {
    if (!selectedExercise) {
      Alert.alert('Error', 'Please select an exercise')
      return
    }

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
      setSaving(true)
      const token = await getToken({ template: 'supabase' })
      const supabase = createSupabaseClient(token || undefined)
      
      const { error } = await supabase
        .from('plan_day_exercises')
        .insert({
          plan_id: planId,
          exercise_id: selectedExercise.id,
          day_name: dayName,
          day_order: dayOrder,

          sets: setsNum,
          reps: repsNum,
          rest_seconds: restNum,
        })

      if (error) {
        console.error('Database error:', error)
        throw new Error(`Failed to save exercise: ${error.message}`)
      }

      Alert.alert('Success', 'Exercise added to plan', [
        { text: 'OK', onPress: () => router.replace(`/plans/${planId}`) }
      ])
    } catch (error) {
      console.error('Error saving exercise:', error)
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to save exercise to plan')
    } finally {
      setSaving(false)
    }
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
            style={[styles.addButton, saving && styles.addButtonDisabled]}
            onPress={handleSave}
            disabled={saving || !selectedExercise}
          >
            <Text style={styles.addButtonText}>
              {saving ? 'Saving...' : 'Add to Plan'}
            </Text>
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
  addButtonDisabled: {
    opacity: 0.5
  }
})
