import { ClerkProvider as BaseClerkProvider } from "@clerk/clerk-expo";
import { tokenCache } from "./token-cache";

export function ClerkProvider({ children }: { children: React.ReactNode }) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  
  if (!publishableKey) {
    throw new Error(
      "Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY - Please add it to your .env file"
    );
  }

  return (
    <BaseClerkProvider 
      publishableKey={publishableKey}
      tokenCache={tokenCache}
    >
      {children}
    </BaseClerkProvider>
  );
}
