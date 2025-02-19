/**
 * Home Screen
 * 
 * The main entry point for the app. Shows the current workout plan.
 * Key features:
 * 1. Current Plan Display
 *    - Shows current plan name and exercises
 *    - Organized by day with exercise counts
 *    - Quick navigation to plan details
 * 
 * 2. Data Loading
 *    - Shows "Loading..." during data fetch
 *    - Refreshes data on screen focus
 *    - Handles empty states gracefully
 * 
 * 3. Navigation
 *    - Link to view all plans
 *    - Link to create new plan
 *    - Direct access to current plan details
 */

import { SignedIn, SignedOut, useUser, useAuth } from '@clerk/clerk-expo'
import { Link, Stack, useRouter } from 'expo-router'
import { Text, View, StyleSheet, TouchableOpacity } from 'react-native'
import { FontAwesome5 } from '@expo/vector-icons'
import { createSupabaseClient } from '../../src/lib/supabase'
import { useFocusEffect } from '@react-navigation/native'
import React from 'react'

type CurrentPlan = {
  id: string
  name: string
  current_day?: string
}

export default function Page() {
  const { user } = useUser()
  const { getToken } = useAuth()
  const router = useRouter()
  const [currentPlan, setCurrentPlan] = React.useState<CurrentPlan | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)

  const fetchCurrentPlan = async () => {
    if (!user) return

    try {
      const token = await getToken({ template: 'supabase' })
      const supabase = createSupabaseClient(token || undefined)
      
      const { data: planData, error: planError } = await supabase
        .from('workout_plans')
        .select('id, name')
        .eq('is_current', true)
        .maybeSingle()

      if (planError) {
        console.error('Error fetching plan:', planError)
        setCurrentPlan(null)
        return
      }

      if (planData) {
        const { data: dayData } = await supabase
          .from('plan_day_exercises')
          .select('day_name')
          .eq('plan_id', planData.id)
          .eq('is_current', true)
          .maybeSingle()

        setCurrentPlan({
          id: planData.id,
          name: planData.name,
          current_day: dayData?.day_name
        })
      } else {
        setCurrentPlan(null)
      }
    } catch (error) {
      console.error('Error fetching current plan:', error)
      setCurrentPlan(null)
    } finally {
      setIsLoading(false)
    }
  }

  useFocusEffect(
    React.useCallback(() => {
      fetchCurrentPlan()
    }, [user, getToken])
  )



  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{
          title: 'Home',
          headerRight: () => (
            <TouchableOpacity 
              onPress={() => router.push('/menu')}
              style={styles.menuButton}
            >
              <FontAwesome5 name="bars" size={20} color="#007AFF" />
            </TouchableOpacity>
          )
        }}
      />
      <SignedIn>
        <View style={styles.content}>
          <View style={styles.mainContent}>
            <Text style={styles.welcome}>
              Welcome to NorthStar Fitness
            </Text>
            <Text style={styles.subtitle}>
              Track your workouts and achieve your goals
            </Text>
          </View>
          <View style={styles.currentPlanContainer}>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading...</Text>
              </View>
            ) : currentPlan ? (
              <>
                <View style={styles.planInfo}>
                  <View style={styles.infoSection}>
                    <Text style={styles.sectionTitle}>Current Plan</Text>
                    <Text style={styles.sectionContent}>{currentPlan.name}</Text>
                  </View>
                  <View style={styles.infoSection}>
                    <Text style={styles.sectionTitle}>Current Day</Text>
                    <Text style={styles.sectionContent}>{currentPlan.current_day || 'Not set'}</Text>
                  </View>
                </View>
                <TouchableOpacity 
                  style={styles.goButton}
                  onPress={() => router.push(`/plans/view/${currentPlan.id}`)}
                >
                  <Text style={styles.goButtonText}>Go</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.noPlanText}>No workout plans created</Text>
                <TouchableOpacity 
                  style={[styles.goButton, styles.createButton]}
                  onPress={() => router.push('/plans/new')}
                >
                  <Text style={styles.goButtonText}>Create New Plan</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </SignedIn>
      <SignedOut>
        <View style={styles.content}>
          <Link href="/(auth)/sign-in" style={styles.link}>
            <Text>Sign in</Text>
          </Link>
          <Link href="/(auth)/sign-up">
            <Text>Sign up</Text>
          </Link>
        </View>
      </SignedOut>
    </View>
  )
}

const styles = StyleSheet.create({
  planInfo: {
    marginBottom: 16,
  },
  infoSection: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  sectionContent: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  mainContent: {
    flex: 0.75,
    justifyContent: 'center',
    alignItems: 'center',
  },
  currentPlanContainer: {
    flex: 0.25,
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    justifyContent: 'center',
  },
  currentPlanTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  currentPlanName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  goButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  goButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  noPlanText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  createButton: {
    backgroundColor: '#34C759',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  welcome: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },

  link: {
    marginBottom: 20,
  },
  menuButton: {
    padding: 8,
    marginRight: 8,
  },
})
