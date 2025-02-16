import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native'
import React from 'react'
import { useRouter } from 'expo-router'
import { FontAwesome5 } from '@expo/vector-icons'
import { createSupabaseClient } from '../../../src/lib/supabase'
import { useUser, useAuth } from '@clerk/clerk-expo'
import { useFocusEffect } from '@react-navigation/native'

type WorkoutPlan = {
  id: string
  name: string
  created_at: string
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
        .order('created_at', { ascending: false })

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
      onPress={() => router.push(`/plans/${item.id}`)}
    >
      <View style={styles.planInfo}>
        <Text style={styles.planName}>{item.name}</Text>
        <Text style={styles.planDate}>
          Created {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
      <FontAwesome5 name="chevron-right" size={20} color="#999" />
    </TouchableOpacity>
  )

  return (
    <View style={styles.container}>
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
  headerButton: {
    marginRight: 16,
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
