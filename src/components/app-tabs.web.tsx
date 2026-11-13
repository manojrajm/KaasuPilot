import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Slot } from 'expo-router';
import { FloatingNavBar } from '@/components/nav/FloatingNavBar';

export default function AppTabs() {
  return (
    <View style={styles.container}>
      <Slot />
      <FloatingNavBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#07090E',
    position: 'relative',
    height: '100%',
  },
});
