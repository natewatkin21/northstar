/**
 * Plan Overview Screen
 * 
 * Displays and manages a workout plan's weeks and exercises. Supports both view and edit modes.
 * 
 * Key Features:
 * 1. Plan Management
 *    - View/edit weeks and their exercises
 *    - Set/unset as current plan
 *    - Toggle edit mode via top-right button
 * 
 * 2. Week Management
 *    - Weeks ordered by week_number
 *    - Add new weeks in edit mode
 *    - Navigate to week details
 *    - Support for days without exercises
 * 
 * 3. Navigation Modes
 *    - View Mode: /plans/view/week/[number]
 *    - Edit Mode: /plans/new/week/[number]?mode=edit
 *    - Add Week: /plans/new/week/[number]
 * 
 * 4. State Management
 *    - Edit mode preserved in URL (?mode=edit)
 *    - Auto-refresh on screen focus
 *    - Loading states in header
 *    - Consistent back navigation
 * 
 * 5. Data Structure
 *    - Weeks contain multiple days
 *    - Days can exist without exercises
 *    - Exercise configurations per day
 *    - Week numbers are 1-based
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

type Week = {
  week_number: number
  days: {
    day_name: string
    day_order: number
    exercise_count: number
  }[]
}

export default function ViewPlanScreen() {
  const { getToken } = useAuth()
  const { user } = useUser()
  const router = useRouter()
  const params = useLocalSearchParams()
  const id = typeof params.id === 'string' ? params.id : undefined
  const isEditMode = params.mode === 'edit'
  const [plan, setPlan] = React.useState<WorkoutPlan | null>(null)
  const [weeks, setWeeks] = React.useState<Week[]>([])
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

      // Fetch all days and exercises
      console.log('Fetching days and exercises...')
      const { data: daysData, error: daysError } = await supabase
        .from('plan_day_exercises')
        .select('*')
        .eq('plan_id', id)
        .order('week_number', { ascending: true })
        .order('day_order', { ascending: true })
      
      console.log('Days data:', daysData)

      if (daysError) throw daysError

      // Group by week number and count exercises
      console.log('Grouping by week number...')
      const weekMap = new Map<number, Week>()
      
      if (daysData) {
        // First pass: Create entries for each week and day
        daysData.forEach(day => {
          console.log('Processing day:', day)
          const weekNumber = day.week_number || 1
          if (!weekMap.has(weekNumber)) {
            weekMap.set(weekNumber, {
              week_number: weekNumber,
              days: []
            })
          }
          
          const week = weekMap.get(weekNumber)!
          const existingDay = week.days.find(d => d.day_name === day.day_name && d.day_order === day.day_order)
          
          if (!existingDay && day.day_name) {
            week.days.push({
              day_name: day.day_name,
              day_order: day.day_order,
              exercise_count: 0
            })
          }
        })

        // Second pass: Count exercises for each day
        daysData.forEach(day => {
          if (day.exercise_id) {
            const week = weekMap.get(day.week_number || 1)!
            const existingDay = week.days.find(d => d.day_name === day.day_name && d.day_order === day.day_order)
            if (existingDay) {
              existingDay.exercise_count++
            }
          }
        })
      }
      
      const weeksArray = Array.from(weekMap.values())
      console.log('Final weeks array:', weeksArray)

      setWeeks(Array.from(weekMap.values()))

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
          headerRight: () => !isEditMode ? (
            <TouchableOpacity 
              onPress={() => router.replace(`/plans/view/${id}?mode=edit`)}
              style={styles.headerButton}
            >
              <FontAwesome5 name="edit" size={20} color="#007AFF" />
            </TouchableOpacity>
          ) : null
        }}
      />
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {loading ? (
          <Text style={styles.loadingText}>Loading plan...</Text>
        ) : weeks.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No weeks added yet</Text>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => router.push(`/plans/new/week/1?planId=${id}&planName=${plan?.name}`)}
            >
              <Text style={styles.addButtonText}>Add Week 1</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {weeks.map((week) => (
              <View key={week.week_number} style={styles.weekContainer}>
                <TouchableOpacity
                  style={styles.weekHeader}
                  onPress={() => {
                    if (isEditMode) {
                      // In edit mode, go to edit week screen
                      router.push(`/plans/new/week/${week.week_number}?planId=${id}&planName=${plan?.name}&mode=edit`)
                    } else {
                      // In view mode, go to view week screen
                      router.push(`/plans/view/week/${week.week_number}?planId=${id}`)
                    }
                  }}
                >
                  <Text style={styles.weekTitle}>Week {week.week_number}</Text>
                  <FontAwesome5 name="chevron-right" size={16} color="#9ca3af" />
                </TouchableOpacity>
              </View>
            ))}
            {isEditMode && (
              <TouchableOpacity 
                style={styles.addButton}
                onPress={() => router.push(`/plans/new/week/${weeks.length + 1}?planId=${id}&planName=${plan?.name}`)}
              >
                <Text style={styles.addButtonText}>Add Week {weeks.length + 1}</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>
      <View style={styles.bottomContainer}>
        {!loading && plan && (
          <TouchableOpacity
            style={[styles.actionButton, !isEditMode && plan.is_current && styles.currentActionButton]}
            onPress={isEditMode ? 
              () => {
                // Exit edit mode and go to view mode
                router.replace(`/plans/view/${id}`)
              } : 
              plan.is_current ? () => router.push('/') : handleChangePlan
            }
          >
            <Text style={[styles.actionButtonText, !isEditMode && plan.is_current && styles.currentButtonText]}>
              {isEditMode ? 'Save Plan' : plan.is_current ? 'Go' : 'Change to this plan'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
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
    padding: 16,
  },
  weekContainer: {
    marginBottom: 24,
  },
  weekHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    marginBottom: 12,
  },
  weekTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  dayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 8,
    marginLeft: 16,
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
    color: '#666',
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 24,
    fontSize: 16,
    color: '#666',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    textAlign: 'center',
    marginBottom: 16,
    fontSize: 16,
    color: '#666',
  },
  addButton: {
    backgroundColor: '#0891b2',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
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
