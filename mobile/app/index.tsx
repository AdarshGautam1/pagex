import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { colors, fonts } from '../constants/theme';

export default function Index() {
  const { session, profile, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (!session) {
      router.replace('/(auth)/login');
    } else {
      router.replace('/(student)/(tabs)');
    }
  }, [session, profile, isLoading, router]);

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>PAGEX</Text>
      <Text style={styles.subtext}>Secure Gamified E-Library</Text>
      <ActivityIndicator size="small" color={colors.accent} style={{ marginTop: 20 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    fontFamily: fonts.heading,
    fontSize: 36,
    color: colors.ink,
    letterSpacing: 2,
  },
  subtext: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkSecondary,
    marginTop: 6,
  },
});
