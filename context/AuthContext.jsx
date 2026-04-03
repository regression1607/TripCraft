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
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const token = await firebaseUser.getIdToken(true);
        // Load stored user to get username/avatar from backend
        const stored = await AsyncStorage.getItem('user');
        const storedData = stored ? JSON.parse(stored) : {};

        const userData = {
          id: firebaseUser.uid,
          name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
          email: firebaseUser.email,
          avatar: storedData.avatar || firebaseUser.photoURL || '',
          username: storedData.username || '',
          mongoId: storedData.mongoId || '',
          token,
        };
        console.log('[AUTH] Firebase user detected:', userData.email);
        setUser(userData);
        await AsyncStorage.setItem('user', JSON.stringify(userData));
        await AsyncStorage.setItem('token', token);
      } else {
        try {
          const stored = await AsyncStorage.getItem('user');
          if (stored) {
            console.log('[AUTH] Token expired, clearing session');
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
    if (!user && !inAuthGroup) {
      router.replace('/login');
    } else if (user && inAuthGroup) {
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
    router.replace('/');
  };

  // Update user data from backend (username, avatar, mongoId)
  const updateUser = async (updates) => {
    const newUser = { ...user, ...updates };
    setUser(newUser);
    await AsyncStorage.setItem('user', JSON.stringify(newUser));
  };

  const logout = async () => {
    console.log('[AUTH] Logout');
    try { await auth.signOut(); } catch (e) {}
    setUser(null);
    await AsyncStorage.removeItem('user');
    await AsyncStorage.removeItem('token');
    router.replace('/login');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
