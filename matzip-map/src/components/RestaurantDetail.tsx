import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatDistance } from '../lib/geo';
import { googleDirectionsUrl } from '../lib/reviews';
import { categoryByKey, colors, radius, sourceLabels, type } from '../theme';
import type { Restaurant } from '../types';
import { ReviewsSection } from './ReviewsSection';

type IconName = ComponentProps<typeof Ionicons>['name'];

interface Props {
  restaurant: Restaurant;
  distance: number | null;
  onClose: () => void;
}

export function RestaurantDetailHeader({ restaurant: r, distance, onClose }: Props) {
  const c = categoryByKey[r.category];
  return (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <View style={[styles.pill, { backgroundColor: c.tint }]}>
          <Text style={[styles.pillText, { color: c.ink }]}>
            {c.emoji} {r.cuisine ?? c.label}
          </Text>
        </View>
        <Pressable onPress={onClose} hitSlop={12} style={styles.close} accessibilityLabel="닫기">
          <Ionicons name="close" size={18} color={colors.inkSoft} />
        </Pressable>
      </View>
      <Text style={styles.name}>{r.name}</Text>
      <Text style={styles.sub} numberOfLines={1}>
        {[
          distance != null ? formatDistance(distance) : null,
          r.address?.split(' ').slice(0, 2).join(' '),
          r.since ? `${r.since}년 개업` : null,
        ]
          .filter(Boolean)
          .join('  ·  ')}
      </Text>
    </View>
  );
}

export function RestaurantDetailBody({ restaurant: r }: { restaurant: Restaurant }) {
  const call = () => r.phone && Linking.openURL(`tel:${r.phone.replace(/[^\d+]/g, '')}`);
  const directions = () => Linking.openURL(googleDirectionsUrl(r));

  return (
    <View style={styles.body}>
      <View style={styles.actions}>
        <Action icon="navigate" label="길찾기" onPress={directions} primary />
        <Action icon="call" label="전화" onPress={call} disabled={!r.phone} />
      </View>

      {r.description && <Text style={styles.description}>{r.description}</Text>}

      <View style={styles.infoCard}>
        <InfoRow icon="location-outline" text={r.address} />
        <InfoRow icon="call-outline" text={r.phone} />
        <InfoRow icon="time-outline" text={[r.hours, r.closed].filter(Boolean).join('\n') || null} />
        <InfoRow icon="restaurant-outline" text={r.menu} />
      </View>

      <ReviewsSection restaurant={r} />

      <View style={styles.sources}>
        <Text style={styles.sourcesTitle}>수록 가이드</Text>
        {r.sources.map((s, i) => (
          <View key={i} style={styles.sourceRow}>
            <Ionicons name="ribbon-outline" size={14} color={colors.primaryInk} />
            <Text style={styles.sourceText}>
              {sourceLabels[s.source]}
              {s.badge ? `  ·  ${s.badge}` : ''}
              {s.recommender ? `\n${s.recommender}` : ''}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function Action(props: {
  icon: IconName;
  label: string;
  onPress: () => void;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={props.onPress}
      disabled={props.disabled}
      style={({ pressed }) => [
        styles.action,
        props.primary && styles.actionPrimary,
        (pressed || props.disabled) && { opacity: 0.55 },
      ]}
      accessibilityRole="button"
    >
      <Ionicons name={props.icon} size={17} color={props.primary ? '#FFFFFF' : colors.ink} />
      <Text style={[styles.actionText, props.primary && { color: '#FFFFFF' }]}>{props.label}</Text>
    </Pressable>
  );
}

function InfoRow({ icon, text }: { icon: IconName; text: string | null }) {
  if (!text) return null;
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={17} color={colors.muted} style={{ marginTop: 2 }} />
      <Text style={styles.infoText} selectable>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 14, gap: 6 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill, maxWidth: '80%' },
  pillText: { fontSize: 12, fontWeight: '700', letterSpacing: -0.1 },
  close: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  name: { ...type.title, marginTop: 4 },
  sub: { ...type.caption },
  body: { paddingHorizontal: 20, paddingBottom: 48, gap: 22 },
  actions: { flexDirection: 'row', gap: 10 },
  action: {
    flex: 1,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
  },
  actionPrimary: { backgroundColor: colors.primary },
  actionText: { fontSize: 15, fontWeight: '700', color: colors.ink, letterSpacing: -0.2 },
  description: { ...type.body, color: colors.inkSoft },
  infoCard: {
    gap: 14,
    padding: 16,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  infoRow: { flexDirection: 'row', gap: 10 },
  infoText: { ...type.body, fontSize: 14, lineHeight: 21, flex: 1 },
  sources: { gap: 8 },
  sourcesTitle: { ...type.micro, textTransform: 'uppercase' },
  sourceRow: { flexDirection: 'row', gap: 8 },
  sourceText: { ...type.caption, color: colors.inkSoft, lineHeight: 19, flex: 1 },
});
