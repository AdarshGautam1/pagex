import { View, ActivityIndicator, StyleSheet, StatusBar as RNStatusBar, Platform, LogBox } from 'react-native';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

LogBox.ignoreLogs([
  "Response.blob() is using React Native's Blob",
]);
import {
  useFonts,
  Outfit_700Bold,
  Outfit_600SemiBold,
} from '@expo-google-fonts/outfit';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../context/AuthContext';
import { colors } from '../constants/theme';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Outfit_700Bold,
    Outfit_600SemiBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        {Platform.OS === 'android' && (
          <RNStatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
        )}
        <StatusBar style="dark" />
        <Slot />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
