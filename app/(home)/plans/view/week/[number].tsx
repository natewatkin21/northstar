import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native'
import React from 'react'
import { useRouter, useLocalSearchParams, Stack } from 'expo-router'
import { useAuth } from '@clerk/clerk-expo'
import { createSupabaseClient } from '../../../../../src/lib/supabase'
import { useFocusEffect } from '@react-navigation/native'

type Day = {
  day_name: string
  day_order: number
  exercise_count: number
}

export default function WeekViewScreen() {
  const router = useRouter()
  const params = useLocalSearchParams()
  const weekNumber = typeof params.number === 'string' ? parseInt(params.number) : 1
  const planId = typeof params.planId === 'string' ? params.planId : undefined
  const [days, setDays] = React.useState<Day[]>([])
  const [ready, setReady] = React.useState(false)
  const [planName, setPlanName] = React.useState('')
  const { getToken } = useAuth()

  const fetchPlanDetails = React.useCallback(async () => {
    const currentPlanId = planId;
    if (!currentPlanId) return;

    try {
      const token = await getToken({ template: 'supabase' })
      const supabase = createSupabaseClient(token || undefined)

      const { data, error } = await supabase
        .from('workout_plans')
        .select('name')
        .eq('id', currentPlanId)
        .single()

      if (error) throw error
      if (data) {
        console.log('[WeekViewScreen] Found plan:', data);
        setPlanName(data.name)
      }
    } catch (error) {
      console.error('[WeekViewScreen] Error fetching plan:', error)
    }
  }, [])

  const fetchWeekDays = React.useCallback(async () => {
    // Capture values in closure to prevent dependency changes
    const currentPlanId = planId;
    const currentWeekNumber = weekNumber;
    console.log('[WeekViewScreen] Starting fetchWeekDays...', { currentPlanId, currentWeekNumber });
    if (!currentPlanId) return;
    
    try {
      const token = await getToken({ template: 'supabase' })
      const supabase = createSupabaseClient(token || undefined)

      const { data: daysData, error: daysError } = await supabase
        .from('plan_day_exercises')
        .select(`
          day_name,
          day_order,
          exercise_id,
          exercises(name)
        `)
        .eq('plan_id', currentPlanId)
        .eq('week_number', currentWeekNumber)
        .order('day_order', { ascending: true })

      if (daysError) throw daysError

      // Process days to count exercises
      const dayMap = new Map<string, Day>()
      
      daysData.forEach(day => {
        if (!dayMap.has(day.day_name)) {
          dayMap.set(day.day_name, {
            day_name: day.day_name,
            day_order: day.day_order,
            exercise_count: day.exercise_id ? 1 : 0
          })
        } else if (day.exercise_id) {
          const existingDay = dayMap.get(day.day_name)!
          existingDay.exercise_count++
        }
      })

      const processedDays = Array.from(dayMap.values());
      console.log('[WeekViewScreen] Processed days:', processedDays);
      setDays(processedDays)
    } catch (error) {
      console.error('Error fetching week days:', error)
    }
  }, []) // Remove dependencies since we're capturing values in closure

  // Fetch data on focus
  useFocusEffect(
    React.useCallback(() => {
      let isMounted = true;
      let isLoading = false;

      const loadData = async () => {
        if (!isMounted || isLoading) {
          console.log('[WeekViewScreen] Skip load - mounted:', isMounted, 'loading:', isLoading);
          return;
        }
        
        try {
          isLoading = true;
          console.log('[WeekViewScreen] Setting ready to false');
          setReady(false);
          await Promise.all([
            fetchPlanDetails(),
            fetchWeekDays()
          ]);
          if (isMounted) {
            console.log('[WeekViewScreen] Setting ready to true');
            setReady(true);
          }
        } finally {
          isLoading = false;
        }
      }

      loadData()

      return () => {
        console.log('[WeekViewScreen] Cleanup - unmounting');
        isMounted = false;
      }
    }, [fetchWeekDays])
  )

  const handleDayPress = (dayName: string) => {
    router.push(`/plans/view/${planId}/${weekNumber}/${encodeURIComponent(dayName)}`)
  }
  
  return (
    <>
      <Stack.Screen 
        options={{
          title: !ready ? 'Loading...' : `Week ${weekNumber}`,
          headerShown: true,
          headerBackTitle: planName || 'Back'
        }}
      />

      <View style={styles.container}>
        {!ready ? (
          <View style={styles.messageContainer}>
            <Text style={styles.message}>Loading...</Text>
          </View>
        ) : (
          <ScrollView style={styles.scrollView}>
            {days.length === 0 ? (
              <View style={styles.messageContainer}>
                <Text style={styles.message}>No days found for Week {weekNumber}</Text>
                <TouchableOpacity 
                  style={styles.addButton}
                  onPress={() => router.push(`/plans/new/week/${weekNumber}?planId=${planId}`)}
                >
                  <Text style={styles.addButtonText}>Configure Week {weekNumber}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.daysContainer}>
                {days.map((day) => (
                  <TouchableOpacity
                    key={day.day_name}
                    style={styles.dayCard}
                    onPress={() => handleDayPress(day.day_name)}
                  >
                    <View style={styles.dayHeader}>
                      <Text style={styles.dayName}>{day.day_name}</Text>
                      <Text style={styles.exerciseCount}>
                        {day.exercise_count} exercise{day.exercise_count !== 1 ? 's' : ''}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>
        )}
      </View>
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

  daysContainer: {
    paddingHorizontal: 16,
  },
  dayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
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
  dayHeader: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dayName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  exerciseCount: {
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
    marginBottom: 16,
  },
  addButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 6,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
})
