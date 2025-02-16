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
  const params = useLocalSearchParams()
  const planId = typeof params.id === 'string' ? params.id : undefined
  const day = typeof params.day === 'string' ? parseInt(params.day) : undefined

  // If no valid ID or day is provided, go back
  React.useEffect(() => {
    if (!planId || day === undefined || isNaN(day)) {
      router.back()
    }
  }, [planId, day, router])
  const router = useRouter()
  const [exercises, setExercises] = React.useState<Exercise[]>([])
  const [loading, setLoading] = React.useState(true)
  const [selectedExercise, setSelectedExercise] = React.useState<Exercise | null>(null)
  const [sets, setSets] = React.useState('3')
  const [reps, setReps] = React.useState('10')
  const [restSeconds, setRestSeconds] = React.useState('60')
  const [saving, setSaving] = React.useState(false)

  // Fetch available exercises
  React.useEffect(() => {
    const fetchExercises = async () => {
      try {
        const token = await getToken({ template: 'supabase' })
      const supabase = createSupabaseClient(token || undefined)
      
      const { data, error } = await supabase
          .from('exercises')
          .select('id, name')
          .order('name')

        if (error) throw error
        setExercises(data)
      } catch (error) {
        console.error('Error fetching exercises:', error)
        Alert.alert('Error', 'Failed to load exercises')
      } finally {
        setLoading(false)
      }
    }

    fetchExercises()
  }, [])

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
          day_of_week: day,
          sets: setsNum,
          reps: repsNum,
          rest_seconds: restNum,
        })

      if (error) {
        console.error('Database error:', error)
        throw new Error(`Failed to save exercise: ${error.message}`)
      }

      Alert.alert('Success', 'Exercise added to plan', [
        { text: 'OK', onPress: () => router.back() }
      ])
    } catch (error) {
      console.error('Error saving exercise:', error)
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to save exercise to plan')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Exercise</Text>
        <View style={styles.exerciseList}>
          {exercises.map((exercise) => (
            <TouchableOpacity
              key={exercise.id}
              style={[
                styles.exerciseItem,
                selectedExercise?.id === exercise.id && styles.selectedExercise,
              ]}
              onPress={() => setSelectedExercise(exercise)}
            >
              <Text
                style={[
                  styles.exerciseName,
                  selectedExercise?.id === exercise.id && styles.selectedExerciseText,
                ]}
              >
                {exercise.name}
              </Text>
              {selectedExercise?.id === exercise.id && (
                <FontAwesome5 name="check" size={16} color="#fff" />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Configure Exercise</Text>
        
        <Text style={styles.label}>Sets</Text>
        <TextInput
          style={styles.input}
          value={sets}
          onChangeText={setSets}
          keyboardType="number-pad"
          placeholder="Number of sets"
        />

        <Text style={styles.label}>Reps</Text>
        <TextInput
          style={styles.input}
          value={reps}
          onChangeText={setReps}
          keyboardType="number-pad"
          placeholder="Number of reps"
        />

        <Text style={styles.label}>Rest Time (seconds)</Text>
        <TextInput
          style={styles.input}
          value={restSeconds}
          onChangeText={setRestSeconds}
          keyboardType="number-pad"
          placeholder="Rest time in seconds"
        />
      </View>

      <TouchableOpacity
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={saving || !selectedExercise}
      >
        <Text style={styles.saveButtonText}>
          {saving ? 'Saving...' : 'Add to Plan'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#333',
  },
  exerciseList: {
    marginBottom: 8,
  },
  exerciseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedExercise: {
    backgroundColor: '#007AFF',
  },
  exerciseName: {
    fontSize: 16,
    color: '#333',
  },
  selectedExerciseText: {
    color: '#fff',
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    margin: 16,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
})
