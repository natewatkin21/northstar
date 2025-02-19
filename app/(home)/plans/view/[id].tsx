/**
 * Plan Overview Screen
 * 
 * Displays and manages a workout plan's days and exercises.
 * 
 * Key Features:
 * 1. Plan Management
 *    - View exercises organized by day
 *    - Set/unset as current plan
 *    - Edit plan via top-right button
 * 
 * 2. Day Navigation
 *    - Days ordered by day_order
 *    - Click day card to view exercises
 *    - Routes to /plans/view/[id]/[day]
 * 
 * 3. Data Handling
 *    - Auto-refresh on screen focus
 *    - Loading state in header
 *    - Consistent back navigation
 */

import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import React from 'react'
import { useLocalSearchParams, useRouter, Stack } from 'expo-router'
import { useFocusEffect } from '@react-navigation/native'
import { FontAwesome5 } from '@expo/vector-icons'
import { createSupabaseClient } from '../../../../src/lib/supabase'
import { useAuth, useUser } from '@clerk/clerk-expo'

type WorkoutPlan = {
  id: string
  name: string
  created_at: string
  is_current: boolean
}

type Day = {
  day_name: string
  day_order: number
  exercise_count: number
  is_current?: boolean
}

export default function ViewPlanScreen() {
  const { getToken } = useAuth()
  const { user } = useUser()
  const router = useRouter()
  const params = useLocalSearchParams()
  const id = typeof params.id === 'string' ? params.id : undefined
  const [plan, setPlan] = React.useState<WorkoutPlan | null>(null)
  const [days, setDays] = React.useState<Day[]>([])
  const [loading, setLoading] = React.useState(true)

  // If no valid ID is provided, go back to plans list
  React.useEffect(() => {
    if (!id) {
      router.replace('/plans')
    }
  }, [id, router])

  // Update header when plan loads
  React.useEffect(() => {
    if (plan?.name) {
      router.setParams({ title: plan.name })
    }
  }, [plan?.name, router])

  const fetchPlanDetails = async () => {
    console.log('Fetching plan details for id:', id)
    if (!id) {
      console.log('No id provided, returning')
      return
    }
    try {
      setLoading(true)
      const token = await getToken({ template: 'supabase' })
      const supabase = createSupabaseClient(token || undefined)
      
      console.log('Fetching plan data...')
      const { data: planData, error: planError } = await supabase
        .from('workout_plans')
        .select('*')
        .eq('id', id)
        .single()

      if (planError) {
        console.log('Plan error:', planError)
        throw planError
      }
      setPlan(planData)

      // Fetch all days including rest days (with undefined exercises)
      const { data: daysData, error: daysError } = await supabase
        .from('plan_day_exercises')
        .select('day_name, day_order, exercise_id, is_current')
        .eq('plan_id', id)
        .order('day_order', { ascending: true })

      if (daysError) throw daysError

      // Group by day_name and count only non-undefined exercises
      const dayMap = daysData.reduce((acc, curr) => {
        if (!curr.day_name) return acc
        
        // Initialize the day if it doesn't exist
        if (!acc[curr.day_name]) {
          acc[curr.day_name] = {
            day_name: curr.day_name,
            day_order: curr.day_order,
            exercise_count: 0,  // Start at 0, increment only for real exercises
            is_current: curr.is_current || false
          }
        }
        
        // Only increment count for non-undefined exercises
        if (curr.exercise_id !== null) {
          acc[curr.day_name].exercise_count++
        }
        
        return acc
      }, {} as Record<string, Day>)

      // Only set current day if this is the current plan
      if (planData.is_current) {
        const hasCurrentDay = Object.values(dayMap).some(day => day.is_current)
        if (!hasCurrentDay) {
          const sortedDays = Object.values(dayMap).sort((a, b) => a.day_order - b.day_order)
          if (sortedDays.length > 0) {
            // Update the database to mark first day as current
            const firstDay = sortedDays[0]
            await supabase
              .from('plan_day_exercises')
              .update({ is_current: true })
              .eq('plan_id', id)
              .eq('day_name', firstDay.day_name)

            dayMap[firstDay.day_name].is_current = true
          }
        }
      } else {
        // If not current plan, ensure no days are marked as current
        Object.values(dayMap).forEach(day => {
          day.is_current = false
        })
      }

      setDays(Object.values(dayMap))

    } catch (error) {
      console.error('Error fetching plan details:', error)
      Alert.alert('Error', 'Failed to load workout plan')
      // Don't navigate away automatically, let user see the error
    } finally {
      setLoading(false)
    }
  }

  // Track if this is the initial mount
  const isInitialMount = React.useRef(true)

  // Initial fetch on mount
  React.useEffect(() => {
    fetchPlanDetails()
    // After initial mount, set the ref to false
    isInitialMount.current = false
  }, [id])

  // Refresh data on focus, but only after initial mount
  useFocusEffect(
    React.useCallback(() => {
      // Skip the refresh on initial mount
      if (!isInitialMount.current) {
        fetchPlanDetails()
      }
    }, [id])
  )

  const handleChangePlan = async () => {
    if (!id || !user?.id) return
    try {
      console.log('Changing plan to:', id)
      const token = await getToken({ template: 'supabase' })
      const supabase = createSupabaseClient(token || undefined)

      // First, set all plans to not current
      console.log('Clearing current flag from all plans...')
      await supabase
        .from('workout_plans')
        .update({ is_current: false })
        .eq('user_id', user.id)

      // Then set this plan as current
      console.log('Setting current plan...')
      await supabase
        .from('workout_plans')
        .update({ is_current: true })
        .eq('id', id)

      // Get the first day
      const { data: daysData, error: daysError } = await supabase
        .from('plan_day_exercises')
        .select('day_name, day_order')
        .eq('plan_id', id)
        .order('day_order', { ascending: true })
        .limit(1)

      if (daysError) {
        console.error('Error fetching first day:', daysError)
        return
      }

      if (daysData && daysData.length > 0) {
        // Clear current flag from ALL days in this plan
        const { error: clearError } = await supabase
          .from('plan_day_exercises')
          .update({ is_current: false })
          .eq('plan_id', id)

        if (clearError) {
          console.error('Error clearing days:', clearError)
          return
        }

        // Get the specific day we want to set as current
        const { data: targetDay } = await supabase
          .from('plan_day_exercises')
          .select('id, day_name')
          .eq('plan_id', id)
          .eq('day_name', daysData[0].day_name)
          .order('created_at', { ascending: true })
          .limit(1)

        if (!targetDay || targetDay.length === 0) {
          console.error('Could not find target day')
          return
        }

        // Set the first day as current
        const { error: setCurrentError } = await supabase
          .from('plan_day_exercises')
          .update({ is_current: true })
          .eq('id', targetDay[0].id)

        if (setCurrentError) {
          console.error('Error setting current day:', setCurrentError)
          return
        }

        // Verify the current day was set
        console.log('Verifying current day...')
        const { data: verifyData } = await supabase
          .from('plan_day_exercises')
          .select('plan_id, day_name')
          .eq('is_current', true)

        console.log('Current days after setting:', verifyData)
      }

      // Refetch plan details to update UI
      fetchPlanDetails()
    } catch (error) {
      console.error('Error changing plan:', error)
      Alert.alert('Error', 'Failed to change current plan')
    }
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: plan?.name || 'Loading...',
          headerLeft: () => (
            <TouchableOpacity 
              onPress={() => router.push('/plans')}
              style={styles.backButton}
            >
              <FontAwesome5 name="chevron-left" size={16} color="#007AFF" />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity 
              onPress={() => router.push(`/plans/${id}?name=${encodeURIComponent(plan?.name || '')}`)}
              style={styles.headerButton}
            >
              <FontAwesome5 name="edit" size={20} color="#007AFF" />
            </TouchableOpacity>
          )
        }}
      />
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {loading ? (
          <Text style={styles.loadingText}>Loading days...</Text>
        ) : days.length === 0 ? (
          <Text style={styles.emptyText}>No days added yet</Text>
        ) : (
          days.map((day) => (
            <TouchableOpacity
              key={day.day_name}
              style={[styles.dayCard, day.is_current && styles.currentDayCard]}
              onPress={() => router.push(`/plans/view/${id}/${encodeURIComponent(day.day_name)}`)}
            >
              <View style={styles.dayCardContent}>
                <View style={styles.dayNameContainer}>
                  <Text style={[styles.dayName, day.is_current && styles.currentDayText]}>{day.day_name}</Text>
                  {day.is_current && (
                    <View style={styles.currentTag}>
                      <Text style={styles.currentTagText}>Current Day</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.exerciseCount, day.is_current && styles.currentDayText]}>
                  {day.exercise_count} exercise{day.exercise_count !== 1 ? 's' : ''}
                </Text>
              </View>
              <FontAwesome5 name="chevron-right" size={16} color={day.is_current ? '#fff' : '#999'} />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
      <View style={styles.bottomContainer}>
        {!loading && plan && (
          <TouchableOpacity
            style={[styles.actionButton, plan.is_current && styles.currentActionButton]}
            onPress={plan.is_current ? () => router.push('/') : handleChangePlan}
          >
            <Text style={styles.actionButtonText}>
              {plan.is_current ? 'Go' : 'Change to this plan'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
    </>
  )
}

const styles = StyleSheet.create({
  headerButton: {
    marginRight: 8,
    padding: 8,
  },
  bottomContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  actionButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  currentActionButton: {
    backgroundColor: '#34C759',  // iOS green color for success
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  dayNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  currentDayCard: {
    backgroundColor: '#007AFF',
  },
  currentDayText: {
    color: '#fff',
  },
  currentTag: {
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  currentTagText: {
    color: '#007AFF',
    fontSize: 12,
    fontWeight: '600',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  backText: {
    color: '#007AFF',
    fontSize: 17,
    marginLeft: 5,
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#666',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#666',
  },
  dayCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexDirection: 'row',
    alignItems: 'center',
  },
  dayCardContent: {
    flex: 1,
  },
  dayName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  exerciseCount: {
    fontSize: 14,
    color: '#666',
  },
})
