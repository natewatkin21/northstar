import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import { Button } from '../components/Button';

export function HomeScreen() {
  const { signOut } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Northstar!</Text>
      <Text style={styles.subtitle}>You are signed in</Text>
      <Button
        onPress={() => signOut()}
        title="Sign Out"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
  },
});
