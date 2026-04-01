import { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useSegments } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../services/firebase';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    // Listen for Firebase auth state changes - auto-refreshes token
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const token = await firebaseUser.getIdToken(true); // force refresh
        const userData = {
          id: firebaseUser.uid,
          name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
          email: firebaseUser.email,
          avatar: firebaseUser.photoURL || '',
          token,
        };
        console.log('[AUTH] Firebase user detected:', userData.email);
        setUser(userData);
        await AsyncStorage.setItem('user', JSON.stringify(userData));
        await AsyncStorage.setItem('token', token);
      } else {
        // No firebase user - check stored user as fallback
        try {
          const stored = await AsyncStorage.getItem('user');
          if (stored) {
            const parsed = JSON.parse(stored);
            console.log('[AUTH] Loaded stored user (no Firebase session):', parsed.email);
            // Token is likely expired, force re-login
            console.log('[AUTH] Token likely expired, clearing session');
            await AsyncStorage.removeItem('user');
            await AsyncStorage.removeItem('token');
          }
        } catch (e) {
          console.error('[AUTH] Failed to load user:', e);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === 'login';
    console.log('[AUTH] Route guard:', { user: user?.email, segment: segments[0], inAuthGroup });

    if (!user && !inAuthGroup) {
      console.log('[AUTH] No user, redirecting to /login');
      router.replace('/login');
    } else if (user && inAuthGroup) {
      console.log('[AUTH] User logged in, redirecting to /');
      router.replace('/');
    }
  }, [user, segments, loading]);

  const login = async (userData) => {
    console.log('[AUTH] Login:', userData.email);
    setUser(userData);
    await AsyncStorage.setItem('user', JSON.stringify(userData));
    if (userData.token) {
      await AsyncStorage.setItem('token', userData.token);
    }
    console.log('[AUTH] Navigating to home...');
    router.replace('/');
  };

  const logout = async () => {
    console.log('[AUTH] Logout');
    try {
      await auth.signOut();
    } catch (e) {
      // silent
    }
    setUser(null);
    await AsyncStorage.removeItem('user');
    await AsyncStorage.removeItem('token');
    router.replace('/login');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
