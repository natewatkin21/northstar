import React, { useEffect, useState, useCallback } from 'react'
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native'
import { createSupabaseClient } from '../lib/supabase'
import { useUser, useAuth } from '@clerk/clerk-expo'

export function Weight() {
  const { user } = useUser()
  const { getToken } = useAuth()
  const [weight, setWeight] = useState('0')
  const [inputWeight, setInputWeight] = useState('0')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const getSupabaseClient = useCallback(async () => {
    const token = await getToken({ template: 'supabase' })
    return createSupabaseClient(token || undefined)
  }, [getToken])

  useEffect(() => {
    if (user) {
      fetchWeight()
    }
  }, [user])

  async function fetchWeight() {
    if (!user?.id) return

    try {
      const supabase = await getSupabaseClient()
      const { data, error } = await supabase
        .from('user_weights')
        .select('weight')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single()

      if (error && error.code === 'PGRST116') {
        // No weight record exists yet, create one
        const { error: insertError } = await supabase
          .from('user_weights')
          .insert([{ weight: 0 }])
        
        if (insertError) throw insertError
        const newWeight = '0'
        setWeight(newWeight)
        setInputWeight(newWeight)
      } else if (error) {
        throw error
      } else {
        const currentWeight = data.weight.toString()
        setWeight(currentWeight)
        setInputWeight(currentWeight)
      }
      
      setLoading(false)
    } catch (error) {
      console.error('Error fetching weight:', error)
      setLoading(false)
    }
  }

  async function saveWeight() {
    if (!user?.id) return
    
    try {
      setSaving(true)
      // Remove any non-numeric characters
      const cleanWeight = inputWeight.replace(/[^0-9]/g, '')
      // Convert to integer
      const intWeight = parseInt(cleanWeight || '0', 10)

      const supabase = await getSupabaseClient()
      const { error } = await supabase
        .from('user_weights')
        .insert({
          weight: intWeight,
          updated_at: new Date().toISOString()
        })

      if (error) throw error
      
      // Update displayed weight after successful save
      setWeight(intWeight.toString())
    } catch (error) {
      console.error('Error saving weight:', error)
    } finally {
      setSaving(false)
    }
  }

  function handleWeightInput(text: string) {
    // Remove any non-numeric characters
    const cleanWeight = text.replace(/[^0-9]/g, '')
    setInputWeight(cleanWeight)
  }

  if (loading) {
    return <Text>Loading...</Text>
  }

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.label}>Current Weight: {weight}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>New Weight:</Text>
        <TextInput
          style={styles.input}
          value={inputWeight}
          onChangeText={handleWeightInput}
          keyboardType="number-pad"
          placeholder="Enter weight"
        />
        <TouchableOpacity 
          style={[styles.button, saving && styles.buttonDisabled]}
          onPress={saveWeight}
          disabled={saving || inputWeight === weight}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  label: {
    fontSize: 18,
    marginRight: 10,
  },
  input: {
    fontSize: 18,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    minWidth: 80,
    marginRight: 10,
  },
  button: {
    backgroundColor: '#2196F3',
    padding: 10,
    borderRadius: 5,
    minWidth: 70,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
})
