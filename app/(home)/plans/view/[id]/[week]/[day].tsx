import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import React from 'react'
import { useRouter, useLocalSearchParams, Stack } from 'expo-router'
import { useAuth } from '@clerk/clerk-expo'
import { createSupabaseClient } from '../../../../../../src/lib/supabase'
import { useFocusEffect } from '@react-navigation/native'

type Exercise = {
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
  const router = useRouter()
  const params = useLocalSearchParams()
  const planId = typeof params.id === 'string' ? params.id : undefined
  const weekNumber = typeof params.week === 'string' ? parseInt(params.week) : undefined
  const dayName = typeof params.day === 'string' ? decodeURIComponent(params.day) : undefined
  const [exercises, setExercises] = React.useState<Exercise[]>([])
  const [ready, setReady] = React.useState(false)
  const { getToken } = useAuth()

  // If no valid ID, week, or day is provided, go back
  React.useEffect(() => {
    if (!planId || !weekNumber || !dayName) {
      router.back()
    }
  }, [planId, weekNumber, dayName, router])

  const fetchDayExercises = React.useCallback(async () => {
    // Capture values in closure to prevent dependency changes
    const currentPlanId = planId;
    const currentWeekNumber = weekNumber;
    const currentDayName = dayName;

    console.log('[DayView] Starting fetchDayExercises...', { currentPlanId, currentWeekNumber, currentDayName });
    if (!currentPlanId || !currentWeekNumber || !currentDayName) return;

    try {
      const token = await getToken({ template: 'supabase' })
      const supabase = createSupabaseClient(token || undefined)

      const { data, error } = await supabase
        .from('plan_day_exercises')
        .select(`
          id,
          exercise_id,
          sets,
          reps,
          rest_seconds,
          exercises(name)
        `)
        .eq('plan_id', currentPlanId)
        .eq('week_number', currentWeekNumber)
        .eq('day_name', currentDayName)
        .order('created_at', { ascending: true })

      if (error) throw error

      const filteredExercises = data.filter(exercise => exercise.exercises?.name);
      console.log('[DayView] Found exercises:', filteredExercises);
      setExercises(filteredExercises)
    } catch (error) {
      console.error('[DayView] Error fetching day exercises:', error)
    }
  }, [])

  // Fetch data on mount and focus
  useFocusEffect(
    React.useCallback(() => {
      let isMounted = true;
      let isLoading = false;

      const loadData = async () => {
        if (!isMounted || isLoading) {
          console.log('[DayView] Skip load - mounted:', isMounted, 'loading:', isLoading);
          return;
        }
        
        try {
          isLoading = true;
          console.log('[DayView] Setting ready to false');
          setReady(false);
          await fetchDayExercises();
          if (isMounted) {
            console.log('[DayView] Setting ready to true');
            setReady(true);
          }
        } finally {
          isLoading = false;
        }
      }

      loadData()

      return () => {
        console.log('[DayView] Cleanup - unmounting');
        isMounted = false;
      }
    }, [fetchDayExercises])
  )

  return (
    <>
      <Stack.Screen 
        options={{
          title: dayName || 'Loading...',
          headerShown: true
        }}
      />
      <View style={styles.container}>
      <ScrollView style={styles.scrollView}>

        {!ready ? (
          <Text style={styles.message}>Loading...</Text>
        ) : exercises.length === 0 ? (
          <View style={styles.messageContainer}>
            <Text style={styles.message}>No exercises added yet</Text>
          </View>
        ) : (
          <View style={styles.exercisesContainer}>
            {exercises.map((exercise) => (
              <View key={exercise.id} style={styles.exerciseCard}>
                <Text style={styles.exerciseName}>{exercise.exercises.name}</Text>
                <View style={styles.exerciseDetails}>
                  <Text style={styles.detail}>{exercise.sets} sets</Text>
                  <Text style={styles.detail}>{exercise.reps} reps</Text>
                  <Text style={styles.detail}>{exercise.rest_seconds}s rest</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>

      <TouchableOpacity 
        style={styles.addButton}
        onPress={() => router.push(`/plans/new/add-exercise?planId=${planId}&weekNumber=${weekNumber}&day=${encodeURIComponent(dayName || '')}`)}
      >
        <Text style={styles.addButtonText}>+</Text>
      </TouchableOpacity>
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },

  exercisesContainer: {
    paddingHorizontal: 16,
  },
  exerciseCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 2,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  exerciseDetails: {
    flexDirection: 'row',
    gap: 16,
  },
  detail: {
    fontSize: 14,
    color: '#6b7280',
  },
  messageContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  message: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  addButton: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0891b2',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  addButtonText: {
    fontSize: 32,
    color: '#fff',
    marginTop: -2,
  },
})
