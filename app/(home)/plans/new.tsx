/**
 * New Plan Screen
 * 
 * Entry point for creating a new workout plan. This screen handles the initial
 * plan creation before transitioning to the week configuration flow.
 * 
 * Plan Creation Flow:
 * 1. Enter plan name
 * 2. Create plan in Supabase
 * 3. Navigate to first week configuration
 * 
 * Features:
 * 1. Form Management
 *    - Validates plan name
 *    - Preserves input state
 *    - Handles submission
 * 
 * 2. State Persistence
 *    - Saves form state in AsyncStorage
 *    - Clears state after successful creation
 *    - Restores state on re-mount
 * 
 * 3. Navigation
 *    - Success: Routes to week configuration
 *    - Failure: Stays on form with error
 *    - Back: Returns to plans list
 * 
 * 4. Error Handling
 *    - Validates required fields
 *    - Shows user-friendly errors
 *    - Handles network failures
 * 
 * After Creation:
 * - Creates empty plan in Supabase
 * - Redirects to /plans/new/week/1
 * - Preserves plan context for week setup
 */

import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native'
import React from 'react'
import { useRouter, useLocalSearchParams, Stack } from 'expo-router'
import { createSupabaseClient } from '../../../src/lib/supabase'
import { useAuth, useUser } from '@clerk/clerk-expo'
import { FontAwesome5 } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { WeekFormData } from '../../../src/types/workout'

interface PlanFormData {
  name: string
  weekData: { [weekNumber: number]: WeekFormData }
}

export default function NewPlanScreen() {
  const { getToken } = useAuth()
  const { user } = useUser()
  const router = useRouter()
  const params = useLocalSearchParams()
  const [name, setName] = React.useState('')
  const [saving, setSaving] = React.useState(false)


  // Load saved form data on mount
  React.useEffect(() => {
    const loadSavedData = async () => {
      try {
        const savedData = await AsyncStorage.getItem('newPlanFormData')
        if (savedData) {
          const { name: savedName } = JSON.parse(savedData)
          setName(savedName || '')
        }
      } catch (error) {
        console.error('Error loading saved form data:', error)
      }
    }
    loadSavedData()
  }, [])

  // Function to clear all form data
  const clearFormData = async () => {
    try {
      await AsyncStorage.removeItem('newPlanFormData')
      setName('')
    } catch (error) {
      console.error('Error clearing form data:', error)
    }
  }

  // Save form data whenever state changes
  React.useEffect(() => {
    const saveFormData = async () => {
      try {
        if (name) {
          await AsyncStorage.setItem('newPlanFormData', JSON.stringify({ name }))
        }
      } catch (error) {
        console.error('Error saving form data:', error)
      }
    }
    saveFormData()
  }, [name])





  const handleBack = async () => {
    await clearFormData()
    router.back()
  }

  const handleSavePlan = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a plan name')
      return
    }



    try {
      setSaving(true)
      const token = await getToken({ template: 'supabase' })
      const supabase = createSupabaseClient(token || undefined)
      
      // Check if this should be the current plan (if it's the first plan or if no current plan exists)
      const { data: currentPlans, error: currentError } = await supabase
        .from('workout_plans')
        .select('id')
        .eq('is_current', true)

      if (currentError) throw currentError
      const shouldBeCurrent = currentPlans.length === 0

      // Create the plan
      const { data: plan, error: planError } = await supabase
        .from('workout_plans')
        .insert([{ 
          name: name.trim(),
          is_current: shouldBeCurrent
        }])
        .select()
        .single()

      if (planError) throw planError




      // Clear form data since we're done with it
      await clearFormData()

      // Navigate to plan edit mode
      router.replace(`/plans/view/${plan.id}?mode=edit`)
    } catch (error) {
      console.error('Error creating plan:', error)
      Alert.alert('Error', 'Failed to create workout plan')
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{
          title: 'Create New Plan',
          headerLeft: () => (
            <TouchableOpacity 
              onPress={handleBack}
              style={styles.backButton}
            >
              <FontAwesome5 name="chevron-left" size={16} color="#007AFF" />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
          )
        }}
      />
      <View style={styles.formContainer}>
        <TextInput
          style={styles.nameInput}
          placeholder="Plan Name"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />

        <TouchableOpacity
          style={[styles.createButton, saving && styles.buttonDisabled]}
          onPress={handleSavePlan}
          disabled={saving}
        >
          <Text style={styles.createButtonText}>{saving ? 'Creating Plan...' : 'Create Plan'}</Text>
        </TouchableOpacity>
      </View>

      </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  formContainer: {
    flex: 1,
    padding: 16,
  },
  nameInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 16,
    fontSize: 18,
    marginBottom: 24,
  },
  createButton: {
    backgroundColor: '#0891b2',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  createButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  backText: {
    color: '#007AFF',
    fontSize: 16,
    marginLeft: 4,
  },
  dayNameInput: {
    flex: 1,
    marginHorizontal: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    fontSize: 14,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  nameInput: {
    borderBottomWidth: 1,
    borderColor: '#ccc',
    padding: 16,
    fontSize: 18,
    marginBottom: 16,
  },
  weekView: {
    flex: 1,
  },
  dayContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dayTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  exerciseItem: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '500',
  },
  exerciseDetails: {
    color: '#666',
    marginTop: 4,
  },
  bottomSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  bottomSheetContent: {
    padding: 16,
    flex: 1,
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
  saveButton: {
    backgroundColor: '#0891b2',
    padding: 16,
    margin: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSheetBackground: {
    backgroundColor: '#fff',
  },
  bottomSheetIndicator: {
    backgroundColor: '#ccc',
    width: 40,
    height: 4,
    borderRadius: 2,
  }
})
