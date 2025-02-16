import React, { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useUser, useAuth } from '@clerk/clerk-expo';
import { createSupabaseClient } from '../../../src/lib/supabase';
import { Link } from 'expo-router';

type Exercise = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
};

export default function ExerciseList() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (user) {
        fetchExercises();
      }
    }, [user])
  );

  const fetchExercises = async () => {
    try {
      const token = await getToken({ template: 'supabase' });
      const supabase = createSupabaseClient(token || undefined);
      
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setExercises(data || []);
    } catch (error) {
      console.error('Error fetching exercises:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>


      <FlatList
        data={exercises}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.exerciseItem}>
            <Text style={styles.exerciseName}>{item.name}</Text>
            {item.description && (
              <Text style={styles.exerciseDescription}>{item.description}</Text>
            )}
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No exercises added yet</Text>
        }
      />
    </View>
  );
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
    padding: 16,
  },

  exerciseItem: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  exerciseDescription: {
    fontSize: 14,
    color: '#666',
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
    marginTop: 20,
  },
});
