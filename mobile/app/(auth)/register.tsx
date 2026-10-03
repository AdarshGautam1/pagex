import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { colors, fonts, radius, spacing } from '../../constants/theme';

export default function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signUp } = useAuth();
  const scrollRef = useRef<ScrollView>(null);

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardVisible(true);
        setKeyboardHeight(e.endCoordinates.height);
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
        setKeyboardHeight(0);
      }
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleRegister = async () => {
    if (!displayName || !username || !email || !password) {
      setErrorMessage('Please fill in all fields.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    try {
      setLoading(true);
      setErrorMessage('');
      await signUp(email, password, displayName, username);
      router.replace('/(student)/(tabs)');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const extraKeyboardPadding = Platform.OS === 'android' && keyboardVisible
    ? Math.max(keyboardHeight, 280) + spacing.xl
    : spacing.xl;
  const bottomPadding = insets.bottom + extraKeyboardPadding;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + spacing.lg,
            paddingBottom: bottomPadding,
            justifyContent: keyboardVisible ? 'flex-start' : 'center',
          },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.logo}>PAGEX</Text>
          <Text style={styles.subtitle}>Begin Your Reading Quest</Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Create Reader Account</Text>
          <Text style={styles.formSubtitle}>
            Join the digital library, track habits, and compete on the weekly leaderboard.
          </Text>

          {errorMessage ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          <Input
            label="FULL NAME"
            placeholder="Full Name"
            value={displayName}
            onFocus={() => {
              setTimeout(() => {
                scrollRef.current?.scrollTo({ y: 0, animated: true });
              }, 100);
            }}
            onChangeText={(text) => {
              setDisplayName(text);
              setErrorMessage('');
            }}
          />

          <Input
            label="USERNAME"
            placeholder="Username"
            autoCapitalize="none"
            value={username}
            onFocus={() => {
              setTimeout(() => {
                scrollRef.current?.scrollTo({ y: 60, animated: true });
              }, 100);
            }}
            onChangeText={(text) => {
              setUsername(text);
              setErrorMessage('');
            }}
          />

          <Input
            label="COLLEGE EMAIL"
            placeholder="name@university.edu"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onFocus={() => {
              setTimeout(() => {
                scrollRef.current?.scrollTo({ y: 150, animated: true });
              }, 100);
            }}
            onChangeText={(text) => {
              setEmail(text);
              setErrorMessage('');
            }}
          />

          <Input
            label="PASSWORD"
            placeholder="At least 6 characters"
            secureTextEntry
            value={password}
            onFocus={() => {
              setTimeout(() => {
                scrollRef.current?.scrollToEnd({ animated: true });
              }, 100);
            }}
            onChangeText={(text) => {
              setPassword(text);
              setErrorMessage('');
            }}
          />

          <Button
            title="Create Account"
            onPress={handleRegister}
            loading={loading}
            style={{ marginTop: spacing.sm }}
          />

          <View style={styles.switchRow}>
            <Text style={styles.switchText}>Already registered? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
              <Text style={styles.switchLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logo: {
    fontFamily: fonts.heading,
    fontSize: 40,
    color: colors.ink,
    letterSpacing: 3,
  },
  subtitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.accent,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: spacing.xs,
  },
  formCard: {
    backgroundColor: colors.surface,
    padding: spacing.xl,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  formTitle: {
    fontFamily: fonts.heading,
    fontSize: 22,
    color: colors.ink,
  },
  formSubtitle: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkSecondary,
    marginTop: 4,
    marginBottom: spacing.lg,
    lineHeight: 18,
  },
  errorBox: {
    backgroundColor: '#FDE8E8',
    borderColor: colors.error,
    borderWidth: 1,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  errorText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.error,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  switchText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkSecondary,
  },
  switchLink: {
    fontFamily: fonts.subheading,
    fontSize: 14,
    color: colors.accent,
  },
});
