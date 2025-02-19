import React, { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useUser, useAuth } from '@clerk/clerk-expo';
import { createSupabaseClient } from '../../../src/lib/supabase';
import { Link, Stack, useRouter } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';

type Exercise = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
};

export default function ExerciseList() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const router = useRouter();
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
        .order('created_at', { ascending: true });
      
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
        <Stack.Screen 
          options={{
            title: 'Exercise Library',
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
                onPress={() => router.push('/exercises/new')}
                style={styles.headerButton}
              >
                <Text style={styles.headerButtonText}>Add New</Text>
              </TouchableOpacity>
            )
          }}
        />
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{
          title: 'Exercise Library',
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
              onPress={() => router.push('/exercises/new')}
              style={styles.headerButton}
            >
              <Text style={styles.headerButtonText}>Add New</Text>
            </TouchableOpacity>
          )
        }}
      />

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
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
