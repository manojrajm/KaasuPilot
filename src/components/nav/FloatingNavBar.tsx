import React, { useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePathname, useRouter } from 'expo-router';

import { HomeIcon, TxnsIcon, SummaryIcon, MoreIcon } from './NavBarIcons';
import { AddTransactionModal } from '@/components/transaction/AddTransactionModal';
import { transactionRepo } from '@/data/repositories/transactionRepo';

export function FloatingNavBar() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const [showAddModal, setShowAddModal] = useState(false);

  const isHome = pathname === '/' || pathname === '' || pathname === '/index';
  const isTxns = pathname === '/transactions';
  const isLoans = pathname === '/loans';
  const isExplore = pathname === '/explore';

  const GOLDEN_COLOR = '#FFD700'; // 24K Liquid Gold
  const INACTIVE_COLOR = '#8E9BB0';

  const navigateTo = (path: string) => {
    if (path === '/' && isHome) return;
    if (path === '/transactions' && isTxns) return;
    if (path === '/loans' && isLoans) return;
    router.push(path as any);
  };

  const handleSaveTransaction = async (data: any) => {
    await transactionRepo.create({
      ...data,
      txnDate: new Date().toISOString(),
      source: 'manual',
      status: 'confirmed',
    });
  };

  return (
    <>
      {/* Quick Add Modal launched from Golden FAB */}
      <AddTransactionModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleSaveTransaction}
      />

      {/* iOS 26 Liquid Glassmorphism Floating Bottom Navigation Dock */}
      <View
        pointerEvents="box-none"
        style={[
          styles.containerWrapper,
          { bottom: Math.max(insets.bottom, 12) },
        ]}>
        <View style={styles.navCard}>
          {/* iOS 26 Prismatic Top Specular Reflection Line */}
          <View style={styles.specularShineBar} />

          {/* Center Protruding Golden Jewel FAB */}
          <View style={styles.centerFabContainer} pointerEvents="box-none">
            <View style={styles.fabHaloRing}>
              <Pressable
                onPress={() => setShowAddModal(true)}
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
                isHome && styles.activeTabPod,
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
                  isHome ? styles.tabLabelActive : { color: INACTIVE_COLOR },
                ]}>
                Home
              </Text>
            </Pressable>

            {/* Tab 2: Txns */}
            <Pressable
              onPress={() => navigateTo('/transactions')}
              style={({ pressed }) => [
                styles.tabItem,
                isTxns && styles.activeTabPod,
                pressed && styles.tabItemPressed,
              ]}>
              <TxnsIcon
                color={isTxns ? GOLDEN_COLOR : INACTIVE_COLOR}
                size={22}
                focused={isTxns}
              />
              <Text
                style={[
                  styles.tabLabel,
                  isTxns ? styles.tabLabelActive : { color: INACTIVE_COLOR },
                ]}>
                Txns
              </Text>
            </Pressable>

            {/* Tab 3: Center Add (Label under protruding FAB) */}
            <Pressable
              onPress={() => setShowAddModal(true)}
              style={styles.centerTabItem}>
              <View style={styles.fabSpacer} />
              <Text style={[styles.tabLabel, styles.addLabel]}>Add</Text>
            </Pressable>

            {/* Tab 4: Loans & EMI Cockpit */}
            <Pressable
              onPress={() => navigateTo('/loans')}
              style={({ pressed }) => [
                styles.tabItem,
                isLoans && styles.activeTabPod,
                pressed && styles.tabItemPressed,
              ]}>
              <SummaryIcon
                color={isLoans ? GOLDEN_COLOR : INACTIVE_COLOR}
                size={22}
                focused={isLoans}
              />
              <Text
                style={[
                  styles.tabLabel,
                  isLoans ? styles.tabLabelActive : { color: INACTIVE_COLOR },
                ]}>
                Loans
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
    borderRadius: 30,
    // iOS 26 Liquid Glassmorphism Core
    backgroundColor: 'rgba(12, 16, 26, 0.72)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 184, 0, 0.35)',
    borderTopColor: 'rgba(255, 215, 0, 0.85)', // 24K Liquid Gold Top Specular Rim
    borderBottomColor: 'rgba(255, 184, 0, 0.2)',
    shadowColor: '#FFB800',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.38,
    shadowRadius: 26,
    elevation: 16,
    position: 'relative',
    overflow: 'visible',
  },
  specularShineBar: {
    position: 'absolute',
    top: 1,
    left: '10%',
    width: '80%',
    height: 1.5,
    backgroundColor: 'rgba(255, 215, 0, 0.65)',
    borderRadius: 1,
  },
  tabsRow: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 6,
    borderRadius: 16,
  },
  activeTabPod: {
    backgroundColor: 'rgba(255, 184, 0, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.45)',
  },
  centerTabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 6,
  },
  tabItemPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.95 }],
  },
  tabLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  tabLabelActive: {
    color: '#FFD700',
    fontWeight: '800',
    letterSpacing: 0.4,
    textShadowColor: 'rgba(255, 215, 0, 0.5)',
    textShadowRadius: 8,
    textShadowOffset: { width: 0, height: 1 },
  },
  addLabel: {
    color: '#FFB800',
    fontWeight: '800',
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
    width: 64,
    height: 64,
    borderRadius: 32,
    // Outer Frosted Liquid Gold Ring
    backgroundColor: 'rgba(10, 14, 24, 0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 0, 0.65)',
    shadowColor: '#FFB800',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.55,
    shadowRadius: 18,
    elevation: 14,
  },
  fabCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    // Radiant 24K Gold Button with Specular Edge
    backgroundColor: '#FFB800',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.55)',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.7,
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
    fontWeight: '900',
    lineHeight: 30,
    textAlign: 'center',
    marginTop: -2,
  },
});
