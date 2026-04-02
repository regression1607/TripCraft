import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { auth } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import { colors } from '../styles/theme';

const TRAVEL_EMOJIS = ['🗼', '🏖', '🏔', '🌴', '🛕', '🗽', '🏯', '🌍', '✈️', '🚆'];

export default function LoginScreen() {
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing fields', 'Please enter email and password');
      return;
    }
    if (isSignUp && !name.trim()) {
      Alert.alert('Missing fields', 'Please enter your name');
      return;
    }

    setLoading(true);
    try {
      let userCredential;
      if (isSignUp) {
        userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await updateProfile(userCredential.user, { displayName: name.trim() });
      } else {
        userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      }

      const user = userCredential.user;
      const token = await user.getIdToken();

      await login({
        id: user.uid,
        name: user.displayName || name.trim() || email.split('@')[0],
        email: user.email,
        avatar: user.photoURL || '',
        token,
      });
    } catch (error) {
      console.error('Auth error:', error.code, error.message);
      let msg = 'Something went wrong. Please try again.';
      switch (error.code) {
        case 'auth/email-already-in-use':
          msg = 'This email is already registered. Try signing in.';
          break;
        case 'auth/invalid-email':
          msg = 'Please enter a valid email address.';
          break;
        case 'auth/weak-password':
          msg = 'Password should be at least 6 characters.';
          break;
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          msg = 'Invalid email or password.';
          break;
      }
      Alert.alert('Authentication Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Enter Email', 'Please enter your email address first, then tap Forgot Password.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email.trim());
      Alert.alert('Reset Email Sent', `We've sent a password reset link to ${email.trim()}. Check your inbox.`);
    } catch (error) {
      let msg = 'Could not send reset email. Please try again.';
      if (error.code === 'auth/user-not-found') msg = 'No account found with this email.';
      if (error.code === 'auth/invalid-email') msg = 'Please enter a valid email address.';
      Alert.alert('Error', msg);
    }
  };

  return (
    <LinearGradient colors={['#FF6B35', '#FF8F60', '#FFF0E8']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Top section with branding */}
            <View style={styles.heroSection}>
              <View style={styles.emojiRow}>
                {TRAVEL_EMOJIS.slice(0, 5).map((e, i) => (
                  <Text key={i} style={[styles.floatEmoji, { opacity: 0.6 + i * 0.08 }]}>{e}</Text>
                ))}
              </View>
              <View style={styles.logoCircle}>
                <Ionicons name="airplane" size={40} color="#FF6B35" />
              </View>
              <Text style={styles.appName}>TripCraft</Text>
              <Text style={styles.tagline}>
                Your AI-Powered Solo Travel Planner
              </Text>
              <View style={styles.featurePills}>
                {['AI Itineraries', 'Budget Tracker', 'Smart Maps'].map((f) => (
                  <View key={f} style={styles.featurePill}>
                    <Text style={styles.featurePillText}>{f}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Form card */}
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>
                {isSignUp ? 'Create Account' : 'Welcome Back'}
              </Text>
              <Text style={styles.formSubtitle}>
                {isSignUp ? 'Start planning your adventures' : 'Sign in to continue your journey'}
              </Text>

              {isSignUp && (
                <View style={styles.inputWrapper}>
                  <Ionicons name="person-outline" size={20} color={colors.textMuted} />
                  <TextInput
                    style={styles.input}
                    placeholder="Full Name"
                    placeholderTextColor={colors.textMuted}
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                  />
                </View>
              )}

              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color={colors.textMuted} />
                <TextInput
                  style={styles.input}
                  placeholder="Email Address"
                  placeholderTextColor={colors.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color={colors.textMuted} />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor={colors.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>
              </View>

              {!isSignUp && (
                <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotPassword}>
                  <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.authButton, loading && styles.authButtonDisabled]}
                onPress={handleAuth}
                activeOpacity={0.8}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <View style={styles.authButtonInner}>
                    <Text style={styles.authButtonText}>
                      {isSignUp ? 'Get Started' : 'Sign In'}
                    </Text>
                    <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.switchMode}
                onPress={() => setIsSignUp(!isSignUp)}
              >
                <Text style={styles.switchText}>
                  {isSignUp
                    ? 'Already have an account? '
                    : "Don't have an account? "}
                </Text>
                <Text style={styles.switchTextBold}>
                  {isSignUp ? 'Sign In' : 'Sign Up'}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.terms}>
              By continuing, you agree to our Terms of Service & Privacy Policy
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  emojiRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  floatEmoji: {
    fontSize: 28,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  appName: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 8,
    textAlign: 'center',
  },
  featurePills: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  featurePill: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  featurePillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  formSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 24,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F8F9FA',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 54,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.textPrimary,
    height: '100%',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    paddingVertical: 4,
    marginBottom: 4,
  },
  forgotPasswordText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF6B35',
  },
  authButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 14,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  authButtonDisabled: {
    opacity: 0.6,
  },
  authButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  authButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  switchMode: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
    paddingVertical: 4,
  },
  switchText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  switchTextBold: {
    fontSize: 14,
    color: '#FF6B35',
    fontWeight: '700',
  },
  terms: {
    fontSize: 11,
    color: 'rgba(0,0,0,0.35)',
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 16,
    lineHeight: 16,
  },
});
