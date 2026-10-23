import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Marker } from 'react-native-maps';
import { categoryByKey, colors, shadow } from '../theme';
import type { Restaurant } from '../types';

interface PlaceProps {
  restaurant: Restaurant;
  selected: boolean;
  onPress: (r: Restaurant) => void;
}

export const PlaceMarker = memo(function PlaceMarker({ restaurant, selected, onPress }: PlaceProps) {
  const c = categoryByKey[restaurant.category];
  return (
    <Marker
      coordinate={{ latitude: restaurant.lat!, longitude: restaurant.lng! }}
      onPress={(e) => {
        e.stopPropagation();
        onPress(restaurant);
      }}
      anchor={{ x: 0.5, y: 1 }}
      // Re-render the bitmap only when selection changes; static otherwise for performance.
      tracksViewChanges={selected}
      zIndex={selected ? 10 : 1}
      accessibilityLabel={restaurant.name}
    >
      <View style={styles.pinWrap}>
        <View
          style={[
            styles.pin,
            { backgroundColor: c.tint, borderColor: selected ? c.ink : colors.surface },
            selected && styles.pinSelected,
          ]}
        >
          <Text style={selected ? styles.emojiLarge : styles.emoji}>{c.emoji}</Text>
        </View>
        <View style={[styles.tail, { borderTopColor: selected ? c.ink : colors.surface }]} />
      </View>
    </Marker>
  );
});

interface ClusterProps {
  latitude: number;
  longitude: number;
  count: number;
  onPress: () => void;
}

export const ClusterMarker = memo(function ClusterMarker({
  latitude,
  longitude,
  count,
  onPress,
}: ClusterProps) {
  const size = count < 10 ? 38 : count < 50 ? 46 : 54;
  return (
    <Marker
      coordinate={{ latitude, longitude }}
      onPress={onPress}
      tracksViewChanges={false}
      anchor={{ x: 0.5, y: 0.5 }}
    >
      <View style={[styles.cluster, { width: size, height: size, borderRadius: size / 2 }]}>
        <Text style={styles.clusterText}>{count}</Text>
      </View>
    </Marker>
  );
});

const styles = StyleSheet.create({
  pinWrap: { alignItems: 'center' },
  pin: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinSelected: { width: 44, height: 44, borderRadius: 22, borderWidth: 3 },
  emoji: { fontSize: 15 },
  emojiLarge: { fontSize: 20 },
  tail: {
    width: 0,
    height: 0,
    marginTop: -1,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  cluster: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
    borderWidth: 3,
    borderColor: colors.surface,
    ...shadow.soft,
  },
  clusterText: { color: colors.primaryInk, fontSize: 14, fontWeight: '800', letterSpacing: -0.2 },
});
