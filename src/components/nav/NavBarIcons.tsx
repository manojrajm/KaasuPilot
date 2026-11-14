import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

interface IconProps {
  color: string;
  size?: number;
  focused?: boolean;
}

export function HomeIcon({ color, size = 20, focused = false }: IconProps) {
  if (Platform.OS === 'web') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={focused ? color : 'none'}
        stroke={color}
        strokeWidth={focused ? '1.5' : '2'}
        strokeLinecap="round"
        strokeLinejoin="round">
        <path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1v-9.5z" />
      </svg>
    );
  }

  return (
    <SymbolView
      name={{
        ios: focused ? 'house.fill' : 'house',
        android: 'home',
        web: 'home',
      }}
      tintColor={color}
      size={size}
      fallback={
        <Text style={{ fontSize: size - 4, color }}>
          {focused ? '🏠' : '⌂'}
        </Text>
      }
    />
  );
}

export function TxnsIcon({ color, size = 20, focused = false }: IconProps) {
  if (Platform.OS === 'web') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={focused ? color : 'none'}
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <line x1="2" y1="10" x2="22" y2="10" stroke={focused ? '#07090E' : color} />
      </svg>
    );
  }

  return (
    <SymbolView
      name={{
        ios: focused ? 'creditcard.fill' : 'creditcard',
        android: 'credit_card',
        web: 'credit_card',
      }}
      tintColor={color}
      size={size}
      fallback={<Text style={{ fontSize: size - 4, color }}>💳</Text>}
    />
  );
}

export function SummaryIcon({ color, size = 20, focused = false }: IconProps) {
  if (Platform.OS === 'web') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={focused ? color : 'none'}
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    );
  }

  return (
    <SymbolView
      name={{
        ios: focused ? 'chart.bar.fill' : 'chart.bar',
        android: 'bar_chart',
        web: 'bar_chart',
      }}
      tintColor={color}
      size={size}
      fallback={<Text style={{ fontSize: size - 4, color }}>📊</Text>}
    />
  );
}

export function MoreIcon({ color, size = 20, focused = false }: IconProps) {
  if (Platform.OS === 'web') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={focused ? color : 'none'}
        stroke={color}
        strokeWidth={focused ? '1.5' : '2'}
        strokeLinecap="round"
        strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    );
  }

  return (
    <SymbolView
      name={{
        ios: focused ? 'person.fill' : 'person',
        android: 'person',
        web: 'person',
      }}
      tintColor={color}
      size={size}
      fallback={<Text style={{ fontSize: size - 4, color }}>👤</Text>}
    />
  );
}
