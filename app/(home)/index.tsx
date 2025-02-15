import { SignedIn, SignedOut, useUser } from '@clerk/clerk-expo'
import { useAuth } from '@clerk/clerk-expo'
import { Link } from 'expo-router'
import { Text, View, Button, StyleSheet } from 'react-native'

export default function Page() {
  const { user } = useUser()
  const { signOut } = useAuth()

  return (
    <View style={styles.container}>
      <SignedIn>
        <View style={styles.content}>
          <Text style={styles.welcome}>
            Welcome to NorthStar Fitness
          </Text>
          <Text style={styles.subtitle}>
            Track your workouts and achieve your goals
          </Text>
          <View style={styles.buttonContainer}>
            <Button title="Sign Out" onPress={() => signOut()} />
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
  buttonContainer: {
    marginTop: 20,
  },
  link: {
    marginBottom: 20,
  },
})
