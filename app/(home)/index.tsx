import { SignedIn, SignedOut, useUser } from '@clerk/clerk-expo'
import { useAuth } from '@clerk/clerk-expo'
import { Link } from 'expo-router'
import { Text, View, Button, StyleSheet } from 'react-native'
import { Weight } from '../../src/components/Weight'

export default function Page() {
  const { user } = useUser()
  const { signOut } = useAuth()

  return (
    <View style={styles.container}>
      <SignedIn>
        <View style={styles.content}>
          <Text style={styles.welcome}>
            Hello {user?.emailAddresses[0].emailAddress}
          </Text>
          <Weight />
          <Button title="Sign Out" onPress={() => signOut()} />
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
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  welcome: {
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
  },
  link: {
    marginBottom: 20,
  },
})
