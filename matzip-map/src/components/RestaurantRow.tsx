import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatDistance } from '../lib/geo';
import { categoryByKey, colors, radius, type } from '../theme';
import type { Restaurant } from '../types';

interface Props {
  restaurant: Restaurant;
  distance: number | null;
  onPress: (r: Restaurant) => void;
}

export const RestaurantRow = memo(function RestaurantRow({ restaurant: r, distance, onPress }: Props) {
  const c = categoryByKey[r.category];
  const district = r.address?.split(' ').slice(0, 2).join(' ');
  const badge = r.sources.find((s) => s.badge)?.badge;
  return (
    <Pressable
      onPress={() => onPress(r)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      accessibilityRole="button"
    >
      <View style={[styles.icon, { backgroundColor: c.tint }]}>
        <Text style={styles.emoji}>{c.emoji}</Text>
      </View>
      <View style={styles.main}>
        <View style={styles.titleLine}>
          <Text style={styles.name} numberOfLines={1}>
            {r.name}
          </Text>
          {badge && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          )}
        </View>
        <Text style={styles.meta} numberOfLines={1}>
          <Text style={{ color: c.ink, fontWeight: '600' }}>{r.cuisine ?? c.label}</Text>
          {district ? `  ·  ${district}` : ''}
        </Text>
        {r.description && (
          <Text style={styles.desc} numberOfLines={1}>
            {r.description}
          </Text>
        )}
      </View>
      {distance != null && <Text style={styles.distance}>{formatDistance(distance)}</Text>}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  pressed: { backgroundColor: colors.surfaceMuted },
  icon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 22 },
  main: { flex: 1, gap: 3 },
  titleLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { ...type.heading, fontSize: 16, flexShrink: 1 },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: colors.primarySoft,
  },
  badgeText: { fontSize: 10, fontWeight: '800', color: colors.primaryInk, letterSpacing: 0.3 },
  meta: { ...type.caption, color: colors.inkSoft },
  desc: { ...type.caption },
  distance: { fontSize: 13, fontWeight: '700', color: colors.inkSoft, letterSpacing: -0.2 },
});
