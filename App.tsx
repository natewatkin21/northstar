import { StatusBar } from 'expo-status-bar';
import { ClerkProvider } from './src/auth/clerk-provider';
import { ClerkLoaded, SignedIn, SignedOut } from '@clerk/clerk-expo';
import { HomeScreen } from './src/screens/HomeScreen';
import { SignInScreen } from './src/screens/SignInScreen';

export default function App() {
  return (
    <ClerkProvider>
      <ClerkLoaded>
        <SignedIn>
          <HomeScreen />
        </SignedIn>
        <SignedOut>
          <SignInScreen />
        </SignedOut>
        <StatusBar style="auto" />
      </ClerkLoaded>
    </ClerkProvider>
  );
}
