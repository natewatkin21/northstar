/**
 * Plans List Screen
 * 
 * The main entry point for workout plan management. Shows a list of all workout plans
 * and provides navigation to create, view, or edit plans.
 * 
 * Features:
 * 1. List all workout plans
 * 2. Create new plan button
 * 3. View/edit existing plans
 * 
 * Data Management:
 * - Plans are sorted by creation date (oldest first)
 * - List refreshes when screen gains focus
 * - Each plan shows:
 *   - Plan name
 *   - Creation date
 *   - Navigation to view/edit
 * 
 * Authentication:
 * - Requires user to be logged in
 * - Uses Clerk for auth tokens
 * - Supabase RLS ensures users only see their own plans
 */

import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native'
import React from 'react'
import { useRouter, Stack } from 'expo-router'
import { FontAwesome5 } from '@expo/vector-icons'
import { createSupabaseClient } from '../../../src/lib/supabase'
import { useUser, useAuth } from '@clerk/clerk-expo'
import { useFocusEffect } from '@react-navigation/native'

type WorkoutPlan = {
  id: string
  name: string
  created_at: string
  is_current: boolean
}

export default function PlansScreen() {
  const { user } = useUser()
  const { getToken } = useAuth()
  const router = useRouter()
  const [plans, setPlans] = React.useState<WorkoutPlan[]>([])
  const [loading, setLoading] = React.useState(true)

  const fetchPlans = React.useCallback(async () => {
    if (!user) return
    try {
      setLoading(true)
      const token = await getToken({ template: 'supabase' })
      const supabase = createSupabaseClient(token || undefined)
      
      const { data, error } = await supabase
        .from('workout_plans')
        .select('*')
        .order('created_at', { ascending: true })

      if (error) throw error
      setPlans(data || [])
    } catch (error) {
      console.error('Error fetching plans:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(
    React.useCallback(() => {
      fetchPlans()
    }, [fetchPlans])
  )

  const renderPlan = ({ item }: { item: WorkoutPlan }) => (
    <TouchableOpacity
      style={styles.planCard}
      onPress={() => router.push(`/plans/view/${item.id}`)}
    >
      <View style={styles.planInfo}>
        <View style={styles.nameContainer}>
          <Text style={styles.planName}>{item.name}</Text>
          {item.is_current && (
            <View style={styles.currentTag}>
              <Text style={styles.currentTagText}>Current Plan</Text>
            </View>
          )}
        </View>
        <Text style={styles.planDate}>
          Created {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
      <FontAwesome5 name="chevron-right" size={20} color="#999" />
    </TouchableOpacity>
  )

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{
          title: 'My Plans',
          headerLeft: () => (
            <TouchableOpacity 
              onPress={() => router.push('/menu')}
              style={styles.backButton}
            >
              <FontAwesome5 name="chevron-left" size={16} color="#007AFF" />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity 
              onPress={() => router.push('/plans/new')}
              style={styles.headerButton}
            >
              <Text style={styles.headerButtonText}>Create New</Text>
            </TouchableOpacity>
          )
        }}
      />

      <FlatList
        data={plans}
        renderItem={renderPlan}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {loading ? 'Loading plans...' : 'No workout plans yet'}
            </Text>
          </View>
        }
      />

    </View>
  )
}

const styles = StyleSheet.create({
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  currentTag: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  currentTagText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
    marginRight: 40,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    marginLeft: 8,
  },
  backText: {
    color: '#007AFF',
    marginLeft: 4,
    fontSize: 17,
  },
  headerButtonText: {
    color: '#0891b2',
    fontSize: 16,
    fontWeight: '600',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  listContent: {
    padding: 16,
  },
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  planDate: {
    fontSize: 14,
    color: '#666',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },

})
