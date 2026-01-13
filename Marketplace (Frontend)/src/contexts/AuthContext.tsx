import { useEffect, useState, createContext } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';

interface AuthContextType {
  user: ReturnType<typeof useUser>['user'];
  isAuthenticated: boolean;
  isLoading: boolean;
  signOut: () => void;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser();
  const { signOut } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const syncUser = async () => {
      if (isLoaded) {
        setIsLoading(false);

        // Sync user to backend if logged in
        if (user) {
          const walletAddress = user.unsafeMetadata?.walletAddress as string;
          if (walletAddress) {
            // Prepare username similar to Upload.tsx logic
            const username = user.username || '';

            let displayName = '';
            if (user.firstName) {
              displayName = user.firstName;
              if (user.lastName) displayName += ` ${user.lastName}`;
            }

            // Send to backend via new apiService method
            try {
              const { default: apiService } = await import('@/services/apiService');
              await apiService.registerUser({
                walletAddress,
                username, // e.g. dealer-09
                email: user.primaryEmailAddress?.emailAddress,
                displayName // e.g. Archis
              });
            } catch (err) {
              console.error('Failed to sync user to backend:', err);
            }
          }
        }
      }
    };

    syncUser();
  }, [isLoaded, user]);

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
