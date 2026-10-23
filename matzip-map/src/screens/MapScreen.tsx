import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Keyboard, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheet, type BottomSheetHandle } from '../components/BottomSheet';
import { CategoryChips } from '../components/CategoryChips';
import { ClusterMarker, PlaceMarker } from '../components/Markers';
import { RestaurantDetailBody, RestaurantDetailHeader } from '../components/RestaurantDetail';
import { RestaurantRow } from '../components/RestaurantRow';
import { SearchBar } from '../components/SearchBar';
import { geocodedCount, restaurants } from '../data';
import { useUserLocation } from '../hooks/useUserLocation';
import { clusterForRegion } from '../lib/cluster';
import { KOREA_REGION, distanceMeters, isInRegion, regionForPoints } from '../lib/geo';
import { buildSearchIndex, search } from '../lib/search';
import { categoryByKey, colors, mapStyle, radius, shadow, type } from '../theme';
import type { CategoryKey, LatLng, MapRegion, Restaurant } from '../types';

const PEEK = 196; // sheet header + first row
const NEARBY_LIMIT = 60;
const NEIGHBORHOOD_DELTA = 0.045; // ≈ 5km tall viewport
const UNKNOWN_DISTANCE = 1e9; // sorts places without coordinates last (finite, so a - b is never NaN)

export function MapScreen() {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const sheetRef = useRef<BottomSheetHandle>(null);

  const { status: locStatus, location, retry: retryLocation } = useUserLocation();
  const [region, setRegion] = useState<MapRegion>(KOREA_REGION);
  const [category, setCategory] = useState<CategoryKey | null>(null);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<Restaurant | null>(null);
  const centeredOnUser = useRef(false);

  const index = useMemo(() => buildSearchIndex(restaurants), []);

  const inCategory = useMemo(
    () => (category ? restaurants.filter((r) => r.category === category) : restaurants),
    [category],
  );
  const mappable = useMemo(() => inCategory.filter((r) => r.lat != null && r.lng != null), [inCategory]);

  // First GPS fix: fly to the user's neighborhood.
  useEffect(() => {
    if (!location || centeredOnUser.current) return;
    centeredOnUser.current = true;
    mapRef.current?.animateToRegion(
      { ...location, latitudeDelta: NEIGHBORHOOD_DELTA, longitudeDelta: NEIGHBORHOOD_DELTA },
      700,
    );
  }, [location]);

  const mapItems = useMemo(() => {
    const visible = mappable.filter((r) => isInRegion({ latitude: r.lat!, longitude: r.lng! }, region));
    return clusterForRegion(visible, region);
  }, [mappable, region]);

  // "Nearby" is measured from the GPS fix, or from the map center when location is off.
  const origin: LatLng = location ?? { latitude: region.latitude, longitude: region.longitude };
  const distanceTo = useCallback(
    (r: Restaurant) =>
      r.lat != null && r.lng != null ? distanceMeters(origin, { latitude: r.lat, longitude: r.lng }) : null,
    [origin.latitude, origin.longitude], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const nearby = useMemo(() => {
    return mappable
      .map((r) => ({ r, d: distanceTo(r)! }))
      .sort((a, b) => a.d - b.d)
      .slice(0, NEARBY_LIMIT);
  }, [mappable, distanceTo]);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    // Equal-scoring hits are listed nearest first.
    const hits = search(
      index,
      query,
      200,
      (a, b) => (distanceTo(a) ?? UNKNOWN_DISTANCE) - (distanceTo(b) ?? UNKNOWN_DISTANCE),
    );
    return category ? hits.filter((r) => r.category === category) : hits;
  }, [index, query, category, distanceTo]);

  const focusOn = useCallback((r: Restaurant) => {
    setSelected(r);
    sheetRef.current?.snapTo(1);
    if (r.lat == null || r.lng == null) return;
    const delta = 0.012;
    // Nudge the pin above the half-open sheet.
    mapRef.current?.animateToRegion(
      { latitude: r.lat - delta * 0.28, longitude: r.lng, latitudeDelta: delta, longitudeDelta: delta },
      450,
    );
  }, []);

  const closeSearch = () => {
    Keyboard.dismiss();
    setSearching(false);
  };

  const pickResult = (r: Restaurant) => {
    closeSearch();
    focusOn(r);
  };

  const closeDetail = () => {
    setSelected(null);
    sheetRef.current?.snapTo(0);
  };

  const recenter = () => {
    if (!location) {
      retryLocation();
      return;
    }
    mapRef.current?.animateToRegion(
      { ...location, latitudeDelta: NEIGHBORHOOD_DELTA, longitudeDelta: NEIGHBORHOOD_DELTA },
      500,
    );
  };

  const nearbyTitle = location ? '내 주변 맛집' : '지도 중심 주변 맛집';
  const catLabel = category ? categoryByKey[category].label : null;

  return (
    <View style={styles.root}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_GOOGLE}
        customMapStyle={mapStyle}
        initialRegion={KOREA_REGION}
        onRegionChangeComplete={setRegion}
        onPress={() => selected && closeDetail()}
        showsUserLocation={locStatus === 'granted'}
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
        showsPointsOfInterests={false}
        mapPadding={{ top: insets.top + 110, right: 0, bottom: PEEK, left: 0 }}
      >
        {mapItems.map((item) =>
          item.kind === 'place' ? (
            <PlaceMarker
              key={item.id}
              restaurant={item.restaurant}
              selected={selected?.id === item.id}
              onPress={focusOn}
            />
          ) : (
            <ClusterMarker
              key={item.id}
              latitude={item.latitude}
              longitude={item.longitude}
              count={item.count}
              onPress={() => {
                const target = regionForPoints(
                  item.members.map((m) => ({ latitude: m.lat!, longitude: m.lng! })),
                );
                if (target) mapRef.current?.animateToRegion(target, 450);
              }}
            />
          ),
        )}
      </MapView>

      {/* Top: search + category filters */}
      <View style={[styles.top, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
        <View style={styles.searchWrap}>
          <SearchBar
            value={query}
            onChangeText={setQuery}
            focused={searching}
            onFocus={() => setSearching(true)}
            onCancel={closeSearch}
          />
        </View>
        <CategoryChips selected={category} onSelect={setCategory} />
        {__DEV__ && geocodedCount === 0 && (
          <View style={styles.devBanner}>
            <Text style={styles.devBannerText}>
              좌표가 아직 없어요. `npm run geocode`로 {restaurants.length}곳의 위치를 생성하세요.
            </Text>
          </View>
        )}
      </View>

      {/* Locate-me */}
      {!searching && (
        <Pressable
          onPress={recenter}
          style={[styles.fab, { bottom: PEEK + insets.bottom + 18 }]}
          accessibilityLabel="내 위치로 이동"
        >
          <Ionicons
            name={location ? 'navigate' : 'navigate-outline'}
            size={20}
            color={location ? colors.primaryInk : colors.muted}
          />
        </Pressable>
      )}

      <BottomSheet
        ref={sheetRef}
        peekHeight={PEEK}
        header={
          selected ? (
            <RestaurantDetailHeader
              restaurant={selected}
              distance={distanceTo(selected)}
              onClose={closeDetail}
            />
          ) : (
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>
                {nearbyTitle}
                {catLabel && <Text style={styles.sheetTitleAccent}> {catLabel}</Text>}
              </Text>
              <Text style={styles.sheetSub}>
                {locStatus === 'denied'
                  ? '위치 권한을 허용하면 내 주변 맛집을 보여드려요'
                  : `가이드북 3권에 수록된 ${restaurants.length.toLocaleString('ko-KR')}곳 중 가까운 순`}
              </Text>
            </View>
          )
        }
      >
        {selected ? (
          <ScrollView key={selected.id} showsVerticalScrollIndicator={false}>
            <RestaurantDetailBody restaurant={selected} />
          </ScrollView>
        ) : (
          <FlatList
            data={nearby}
            keyExtractor={(x) => x.r.id}
            renderItem={({ item }) => (
              <RestaurantRow restaurant={item.r} distance={item.d} onPress={focusOn} />
            )}
            ItemSeparatorComponent={Separator}
            contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
            ListEmptyComponent={<Empty text="표시할 맛집이 없어요" />}
            initialNumToRender={12}
          />
        )}
      </BottomSheet>

      {/* Search results overlay */}
      {searching && (
        <View style={[styles.overlay, { paddingTop: insets.top + 8 + 50 + 56 }]}>
          <FlatList
            data={results}
            keyExtractor={(r) => r.id}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'on-drag' : 'none'}
            renderItem={({ item }) => (
              <RestaurantRow restaurant={item} distance={distanceTo(item)} onPress={pickResult} />
            )}
            ItemSeparatorComponent={Separator}
            ListHeaderComponent={
              query.trim() ? (
                <Text style={styles.resultCount}>검색 결과 {results.length}곳</Text>
              ) : (
                <SearchHints onPick={setQuery} />
              )
            }
            ListEmptyComponent={query.trim() ? <Empty text={`'${query}'에 맞는 맛집이 없어요`} /> : undefined}
            contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
          />
        </View>
      )}
    </View>
  );
}

const HINTS = ['돼지국밥', '밀면', '해운대', '제주 고기국수', '물회', '한정식', '빵', 'ㄷㅈㄱㅂ'];

function SearchHints({ onPick }: { onPick: (q: string) => void }) {
  return (
    <View style={styles.hints}>
      <Text style={styles.hintsTitle}>이렇게 찾아보세요</Text>
      <View style={styles.hintWrap}>
        {HINTS.map((h) => (
          <Pressable key={h} onPress={() => onPick(h)} style={styles.hint}>
            <Text style={styles.hintText}>{h}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.hintNote}>가게 이름, 음식, 지역, 초성으로 검색할 수 있어요.</Text>
    </View>
  );
}

const Separator = () => <View style={styles.separator} />;

const Empty = ({ text }: { text: string }) => (
  <View style={styles.empty}>
    <Text style={styles.emptyEmoji}>🍽️</Text>
    <Text style={type.caption}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  top: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20, gap: 6 },
  searchWrap: { paddingHorizontal: 16 },
  devBanner: {
    marginHorizontal: 16,
    padding: 10,
    borderRadius: radius.sm,
    backgroundColor: '#FFF5D6',
  },
  devBannerText: { fontSize: 12, color: '#8A6A12' },
  fab: {
    position: 'absolute',
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    ...shadow.soft,
  },
  sheetHeader: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 12, gap: 4 },
  sheetTitle: { ...type.heading, fontSize: 19 },
  sheetTitleAccent: { color: colors.primaryInk },
  sheetSub: { ...type.caption },
  overlay: { ...StyleSheet.absoluteFill, backgroundColor: colors.bg, zIndex: 10 },
  resultCount: { ...type.micro, paddingHorizontal: 20, paddingVertical: 10 },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: 82, backgroundColor: colors.hairline },
  hints: { paddingHorizontal: 20, paddingTop: 16, gap: 12 },
  hintsTitle: { ...type.heading, fontSize: 15 },
  hintWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  hint: {
    paddingHorizontal: 14,
    height: 34,
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  hintText: { fontSize: 14, fontWeight: '600', color: colors.primaryInk },
  hintNote: { ...type.caption },
  empty: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyEmoji: { fontSize: 32 },
});
