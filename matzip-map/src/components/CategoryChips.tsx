import * as Haptics from 'expo-haptics';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { categories, colors, radius, shadow } from '../theme';
import type { CategoryKey } from '../types';

interface Props {
  selected: CategoryKey | null;
  onSelect: (key: CategoryKey | null) => void;
}

export function CategoryChips({ selected, onSelect }: Props) {
  const pick = (key: CategoryKey | null) => {
    Haptics.selectionAsync().catch(() => {});
    onSelect(key === selected ? null : key);
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      keyboardShouldPersistTaps="handled"
    >
      <Pressable
        onPress={() => pick(null)}
        style={[styles.chip, selected == null && styles.chipAllActive]}
        accessibilityRole="button"
        accessibilityState={{ selected: selected == null }}
      >
        <Text style={[styles.label, selected == null && styles.labelAllActive]}>전체</Text>
      </Pressable>
      {categories.map((c) => {
        const active = c.key === selected;
        return (
          <Pressable
            key={c.key}
            onPress={() => pick(c.key)}
            style={[styles.chip, active && { backgroundColor: c.tint, borderColor: c.tint }]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text style={styles.emoji}>{c.emoji}</Text>
            <Text style={[styles.label, active && { color: c.ink }]}>{c.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8, paddingHorizontal: 16, paddingVertical: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
    ...shadow.soft,
    shadowOpacity: 0.05,
  },
  chipAllActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  emoji: { fontSize: 14 },
  label: { fontSize: 14, fontWeight: '600', letterSpacing: -0.2, color: colors.inkSoft },
  labelAllActive: { color: colors.surface },
});
