import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BankCard } from '@/components/cards/BankCard';
import { cardPropsFromAccount } from '@/components/cards/cardProps';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { formatPaise } from '@/domain/money/format';
import { useAccounts } from '@/hooks/useAccounts';

export default function CardsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(width - Spacing.four * 2, MaxContentWidth, 380);
  const { accounts } = useAccounts();
  const cards = accounts.filter((a) => a.cardKind);

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Math.max(insets.top, Spacing.three),
            paddingBottom: insets.bottom + BottomTabInset + Spacing.six + 48,
          },
        ]}>
        <View style={[styles.header, { width: cardWidth }]}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Text style={styles.back}>‹ Back</Text>
          </Pressable>
          <Text style={styles.title}>MY CARDS</Text>
          <Pressable onPress={() => router.push('/cards/new')} hitSlop={10} style={styles.addBtn}>
            <Text style={styles.addText}>＋ Add</Text>
          </Pressable>
        </View>

        {cards.length === 0 ? (
          <Pressable onPress={() => router.push('/cards/new')} style={[styles.empty, { width: cardWidth, height: cardWidth / 1.586 }]}>
            <Text style={styles.emptyIcon}>💳</Text>
            <Text style={styles.emptyTitle}>Add your first card</Text>
            <Text style={styles.emptySub}>SBI · Indian Bank · HDFC · ICICI · Axis · any bank</Text>
          </Pressable>
        ) : (
          cards.map((card) => {
            const isCredit = card.cardKind === 'credit';
            const balance = isCredit ? -card.currentBalancePaise : card.currentBalancePaise;
            return (
              <View key={card.id} style={styles.cardBlock}>
                <BankCard {...cardPropsFromAccount(card)} width={cardWidth} onPress={() => router.push({ pathname: '/cards/[id]', params: { id: card.id } })} />
                <View style={[styles.meta, { width: cardWidth }]}>
                  <Text style={styles.metaLabel}>{isCredit ? 'Outstanding' : 'Balance'}</Text>
                  <Text style={[styles.metaValue, isCredit && balance > 0 && styles.metaDebt]}>{formatPaise(balance)}</Text>
                </View>
              </View>
            );
          })
        )}

        <Text style={[styles.note, { width: cardWidth }]}>
          🔒 Card numbers, expiry and CVV are encrypted in this phone’s hardware keystore and shown only after fingerprint, face or PIN.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#07090E' },
  content: { alignItems: 'center', gap: Spacing.four, paddingHorizontal: Spacing.four },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { color: '#00F0FF', fontSize: 15, fontWeight: '700' },
  title: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', letterSpacing: 2 },
  addBtn: { backgroundColor: 'rgba(0,240,255,0.12)', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6 },
  addText: { color: '#00F0FF', fontWeight: '800' },
  empty: {
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(0,240,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  emptyIcon: { fontSize: 34 },
  emptyTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  emptySub: { color: '#8A96AD', fontSize: 12 },
  cardBlock: { alignItems: 'center', gap: 8 },
  meta: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 },
  metaLabel: { color: '#8A96AD', fontSize: 13 },
  metaValue: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  metaDebt: { color: '#FF6B61' },
  note: { color: '#65738E', fontSize: 12, lineHeight: 18, textAlign: 'center' },
});
