import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useUser, useAuth } from '@clerk/clerk-expo';
import { createSupabaseClient } from '../../../src/lib/supabase';
import { router, Stack } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';

export default function NewExercise() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Exercise name is required');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      
      const token = await getToken({ template: 'supabase' });
      const supabase = createSupabaseClient(token || undefined);
      
      const { error: saveError } = await supabase
        .from('exercises')
        .insert([
          {
            name: name.trim(),
            description: description.trim() || null,
          },
        ]);
      
      if (saveError) {
        if (saveError.code === '23505') { // Unique violation
          setError('An exercise with this name already exists');
        } else {
          throw saveError;
        }
        return;
      }
      
      router.replace('/exercises');
    } catch (err) {
      console.error('Error saving exercise:', err);
      setError('Failed to save exercise. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{
          title: 'Add New Exercise',
          headerLeft: () => (
            <TouchableOpacity 
              onPress={() => router.push('/exercises')}
              style={styles.backButton}
            >
              <FontAwesome5 name="chevron-left" size={16} color="#007AFF" />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
          )
        }}
      />
      
      <View style={styles.form}>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Name *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g., Bench Press"
            autoFocus
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Description (optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Add notes about form, equipment needed, etc."
            multiline
            numberOfLines={4}
          />
        </View>

        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}

        <TouchableOpacity
          style={[styles.submitButton, saving && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Save Exercise</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  form: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  errorText: {
    color: '#ff3b30',
    marginBottom: 20,
  },
  submitButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
