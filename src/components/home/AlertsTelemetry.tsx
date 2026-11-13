import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { AlertItem } from '@/hooks/useHomeDashboard';

interface AlertsTelemetryProps {
  alerts: AlertItem[];
  onDismiss: (id: string) => void;
  onPressAlert?: (alert: AlertItem) => void;
}

export function AlertsTelemetry({ alerts, onDismiss, onPressAlert }: AlertsTelemetryProps) {
  if (alerts.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Text style={styles.headerIcon}>⚡</Text>
          <Text style={styles.headerTitle}>ACTIONABLE INTELLIGENCE ({alerts.length})</Text>
        </View>
      </View>

      <View style={styles.alertList}>
        {alerts.map((item) => {
          const isWarning = item.severity === 'warning';
          const badgeColor = isWarning ? '#FFB300' : '#FF3B30';

          return (
            <Pressable
              key={item.id}
              onPress={() => onPressAlert?.(item)}
              style={[
                styles.alertItem,
                { borderLeftColor: badgeColor },
              ]}>
              <View style={styles.alertContent}>
                <View style={styles.titleRow}>
                  <Text style={[styles.alertTitle, { color: '#FFFFFF' }]}>
                    {item.title}
                  </Text>
                </View>
                {item.subtitle ? (
                  <Text style={styles.alertSubtitle}>{item.subtitle}</Text>
                ) : null}
              </View>

              <Pressable
                onPress={() => onDismiss(item.id)}
                hitSlop={8}
                style={styles.dismissButton}>
                <Text style={styles.dismissText}>✕</Text>
              </Pressable>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerIcon: {
    fontSize: 12,
  },
  headerTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFB300',
    letterSpacing: 1.2,
  },
  alertList: {
    gap: 8,
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F131C',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderLeftWidth: 3.5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  alertContent: {
    flex: 1,
    gap: 3,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertTitle: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  alertSubtitle: {
    fontSize: 11,
    color: '#8E9BB0',
  },
  dismissButton: {
    padding: 6,
    marginLeft: 8,
  },
  dismissText: {
    fontSize: 12,
    color: '#65738E',
    fontWeight: '700',
  },
});
