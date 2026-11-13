import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { FloatingNavBar } from '@/components/nav/FloatingNavBar';

export default function AppTabs() {
  return (
    <View style={styles.container}>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          animationDuration: 260,
          contentStyle: { backgroundColor: '#07090E' },
        }}>
        <Stack.Screen name="index" options={{ animation: 'fade' }} />
        <Stack.Screen
          name="transactions"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="loans"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="profile"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="explore"
          options={{ animation: 'slide_from_right' }}
        />
      </Stack>
      <FloatingNavBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#07090E',
    position: 'relative',
  },
});
