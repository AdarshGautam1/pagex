import React from 'react';
import { Stack } from 'expo-router';
import { colors } from '../../constants/theme';

export default function StudentLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="book/[id]" options={{ presentation: 'card' }} />
      <Stack.Screen name="reader/[id]" options={{ presentation: 'fullScreenModal' }} />
      <Stack.Screen name="bookmarks" options={{ presentation: 'card' }} />
      <Stack.Screen name="achievements" options={{ presentation: 'card' }} />
    </Stack>
  );
}
