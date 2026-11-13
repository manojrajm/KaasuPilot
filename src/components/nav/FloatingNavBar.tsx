import React, { useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePathname, useRouter } from 'expo-router';

import { HomeIcon, TxnsIcon, SummaryIcon, MoreIcon } from './NavBarIcons';

export function FloatingNavBar() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const [showAddMenu, setShowAddMenu] = useState(false);

  const isHome = pathname === '/' || pathname === '' || pathname === '/index';
  const isExplore = pathname === '/explore';

  const GOLDEN_COLOR = '#FFB800';
  const INACTIVE_COLOR = '#8E9BB0';

  const navigateTo = (path: string) => {
    if (path === '/' && isHome) return;
    router.push(path as any);
  };

  return (
    <>
      {/* Quick Action Modal when Center + FAB is pressed */}
      <Modal
        visible={showAddMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddMenu(false)}>
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setShowAddMenu(false)}>
          <View style={styles.sheetContainer}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>QUICK ACTION</Text>

            <View style={styles.menuOptionsGrid}>
              <Pressable
                style={styles.menuOption}
                onPress={() => {
                  setShowAddMenu(false);
                  router.push('/explore');
                }}>
                <View style={[styles.menuOptionIcon, { backgroundColor: 'rgba(255, 184, 0, 0.15)' }]}>
                  <Text style={styles.menuEmoji}>💸</Text>
                </View>
                <Text style={styles.menuOptionLabel}>Add Expense</Text>
              </Pressable>

              <Pressable
                style={styles.menuOption}
                onPress={() => {
                  setShowAddMenu(false);
                  router.push('/explore');
                }}>
                <View style={[styles.menuOptionIcon, { backgroundColor: 'rgba(0, 230, 118, 0.15)' }]}>
                  <Text style={styles.menuEmoji}>💰</Text>
                </View>
                <Text style={styles.menuOptionLabel}>Add Income</Text>
              </Pressable>

              <Pressable
                style={styles.menuOption}
                onPress={() => {
                  setShowAddMenu(false);
                  router.push('/explore');
                }}>
                <View style={[styles.menuOptionIcon, { backgroundColor: 'rgba(0, 240, 255, 0.15)' }]}>
                  <Text style={styles.menuEmoji}>🎙️</Text>
                </View>
                <Text style={styles.menuOptionLabel}>Voice Entry</Text>
              </Pressable>

              <Pressable
                style={styles.menuOption}
                onPress={() => {
                  setShowAddMenu(false);
                  router.push('/explore');
                }}>
                <View style={[styles.menuOptionIcon, { backgroundColor: 'rgba(168, 85, 247, 0.15)' }]}>
                  <Text style={styles.menuEmoji}>📷</Text>
                </View>
                <Text style={styles.menuOptionLabel}>Scan Receipt</Text>
              </Pressable>
            </View>

            <Pressable
              style={styles.cancelButton}
              onPress={() => setShowAddMenu(false)}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Floating Glassmorphic Bottom Navigation Bar */}
      <View
        pointerEvents="box-none"
        style={[
          styles.containerWrapper,
          { bottom: Math.max(insets.bottom, 12) },
        ]}>
        <View style={styles.navCard}>
          {/* Center Protruding Golden FAB */}
          <View style={styles.centerFabContainer} pointerEvents="box-none">
            <View style={styles.fabHaloRing}>
              <Pressable
                onPress={() => setShowAddMenu(true)}
                style={({ pressed }) => [
                  styles.fabCircle,
                  pressed && styles.fabPressed,
                ]}>
                <Text style={styles.plusIconText}>+</Text>
              </Pressable>
            </View>
          </View>

          {/* 5 Content Tabs (Home, Txns, Add, Summary, More) */}
          <View style={styles.tabsRow}>
            {/* Tab 1: Home */}
            <Pressable
              onPress={() => navigateTo('/')}
              style={({ pressed }) => [
                styles.tabItem,
                pressed && styles.tabItemPressed,
              ]}>
              <HomeIcon
                color={isHome ? GOLDEN_COLOR : INACTIVE_COLOR}
                size={22}
                focused={isHome}
              />
              <Text
                style={[
                  styles.tabLabel,
                  { color: isHome ? GOLDEN_COLOR : INACTIVE_COLOR },
                  isHome && styles.tabLabelActive,
                ]}>
                Home
              </Text>
            </Pressable>

            {/* Tab 2: Txns */}
            <Pressable
              onPress={() => navigateTo('/explore')}
              style={({ pressed }) => [
                styles.tabItem,
                pressed && styles.tabItemPressed,
              ]}>
              <TxnsIcon
                color={isExplore ? GOLDEN_COLOR : INACTIVE_COLOR}
                size={22}
                focused={isExplore}
              />
              <Text
                style={[
                  styles.tabLabel,
                  { color: isExplore ? GOLDEN_COLOR : INACTIVE_COLOR },
                  isExplore && styles.tabLabelActive,
                ]}>
                Txns
              </Text>
            </Pressable>

            {/* Tab 3: Center Add (Label under protruding FAB) */}
            <Pressable
              onPress={() => setShowAddMenu(true)}
              style={styles.centerTabItem}>
              <View style={styles.fabSpacer} />
              <Text style={[styles.tabLabel, styles.addLabel]}>Add</Text>
            </Pressable>

            {/* Tab 4: Summary */}
            <Pressable
              onPress={() => navigateTo('/explore')}
              style={({ pressed }) => [
                styles.tabItem,
                pressed && styles.tabItemPressed,
              ]}>
              <SummaryIcon color={INACTIVE_COLOR} size={22} focused={false} />
              <Text style={[styles.tabLabel, { color: INACTIVE_COLOR }]}>
                Summary
              </Text>
            </Pressable>

            {/* Tab 5: More */}
            <Pressable
              onPress={() => navigateTo('/explore')}
              style={({ pressed }) => [
                styles.tabItem,
                pressed && styles.tabItemPressed,
              ]}>
              <MoreIcon color={INACTIVE_COLOR} size={22} focused={false} />
              <Text style={[styles.tabLabel, { color: INACTIVE_COLOR }]}>
                More
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  containerWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
  },
  navCard: {
    width: '92%',
    maxWidth: 440,
    borderRadius: 28,
    // Dark Glassmorphism Effect
    backgroundColor: 'rgba(14, 18, 30, 0.90)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderTopColor: 'rgba(255, 184, 0, 0.35)', // subtle golden top rim
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.7,
    shadowRadius: 22,
    elevation: 14,
    position: 'relative',
    overflow: 'visible',
  },
  tabsRow: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
  },
  centerTabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 6,
  },
  tabItemPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  tabLabelActive: {
    fontWeight: '700',
    textShadowColor: 'rgba(255, 184, 0, 0.4)',
    textShadowRadius: 6,
    textShadowOffset: { width: 0, height: 0 },
  },
  addLabel: {
    color: '#FFB800',
    fontWeight: '700',
    marginTop: 2,
  },
  fabSpacer: {
    height: 20,
  },
  centerFabContainer: {
    position: 'absolute',
    top: -24,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1100,
  },
  fabHaloRing: {
    width: 62,
    height: 62,
    borderRadius: 31,
    // Dark glass ring matching the navbar
    backgroundColor: '#0A0E18',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 184, 0, 0.35)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  fabCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    // Radiant Golden Accent
    backgroundColor: '#FFB800',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFB800',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.65,
    shadowRadius: 14,
    elevation: 10,
  },
  fabPressed: {
    transform: [{ scale: 0.92 }],
    opacity: 0.9,
  },
  plusIconText: {
    fontSize: 28,
    color: '#07090E',
    fontWeight: '800',
    lineHeight: 30,
    textAlign: 'center',
    marginTop: -2,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  sheetContainer: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: '#0E1320',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 24,
    gap: 18,
    alignItems: 'center',
  },
  sheetHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginBottom: 4,
  },
  sheetTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFB800',
    letterSpacing: 1.2,
  },
  menuOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12,
  },
  menuOption: {
    width: '47%',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 18,
    padding: 16,
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  menuOptionIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuEmoji: {
    fontSize: 22,
  },
  menuOptionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cancelButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    marginTop: 6,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8E9BB0',
  },
});
