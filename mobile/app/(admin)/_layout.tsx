import React from 'react';
import { Stack } from 'expo-router';
import { colors } from '../../constants/theme';

export default function AdminLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="books" />
      <Stack.Screen name="book-form" options={{ presentation: 'modal' }} />
      <Stack.Screen name="categories" />
      <Stack.Screen name="audit" />
    </Stack>
  );
}
