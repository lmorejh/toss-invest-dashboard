import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { fetchReviews, googleMapsSearchUrl, naverMapSearchUrl, reviewsConfigured } from '../lib/reviews';
import { colors, radius, type } from '../theme';
import type { Restaurant, Review, ReviewBundle } from '../types';

type Tab = 'google' | 'naver';

export function ReviewsSection({ restaurant }: { restaurant: Restaurant }) {
  const [data, setData] = useState<ReviewBundle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(reviewsConfigured);
  const [tab, setTab] = useState<Tab>('google');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!reviewsConfigured) return;
    let alive = true;
    setLoading(true);
    setError(null);
    setData(null);
    fetchReviews(restaurant)
      .then((d) => alive && setData(d))
      .catch((e: Error) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [restaurant, attempt]);

  const google = data?.google;
  const naver = data?.naver;
  const reviews: Review[] = (tab === 'google' ? google?.reviews : naver?.reviews) ?? [];

  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionTitle}>평점 · 리뷰</Text>

      <View style={styles.scoreRow}>
        <ScoreCard
          label="Google"
          accent={colors.google}
          value={google?.rating != null ? google.rating.toFixed(1) : '–'}
          sub={google?.count != null ? `리뷰 ${google.count.toLocaleString('ko-KR')}개` : '평점 정보 없음'}
          star
          loading={loading}
          onPress={() => Linking.openURL(google?.url ?? googleMapsSearchUrl(restaurant))}
        />
        <ScoreCard
          label="네이버"
          accent={colors.naver}
          value={naver?.blogTotal != null ? naver.blogTotal.toLocaleString('ko-KR') : '–'}
          sub="블로그 리뷰"
          loading={loading}
          onPress={() => Linking.openURL(naver?.placeUrl ?? naverMapSearchUrl(restaurant))}
        />
      </View>

      {!reviewsConfigured && (
        <Text style={styles.note}>
          리뷰 서버가 연결되지 않아 평점을 불러올 수 없어요. 위 카드를 누르면 Google 지도·네이버 지도에서 바로
          볼 수 있어요.
        </Text>
      )}
      {error && (
        <Pressable onPress={() => setAttempt((n) => n + 1)} style={styles.errorBox}>
          <Text style={styles.note}>{error}</Text>
          <Text style={styles.retry}>다시 시도</Text>
        </Pressable>
      )}

      {data && (
        <>
          <View style={styles.tabs}>
            {(['google', 'naver'] as Tab[]).map((t) => (
              <Pressable
                key={t}
                onPress={() => setTab(t)}
                style={[styles.tab, tab === t && styles.tabActive]}
                accessibilityRole="tab"
                accessibilityState={{ selected: tab === t }}
              >
                <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                  {t === 'google' ? 'Google 리뷰' : '네이버 블로그'}
                </Text>
              </Pressable>
            ))}
          </View>
          {reviews.length === 0 ? (
            <Text style={styles.note}>아직 불러올 리뷰가 없어요.</Text>
          ) : (
            reviews.map((rv, i) => <ReviewCard key={`${tab}-${i}`} review={rv} />)
          )}
          {tab === 'naver' && (
            <Text style={styles.fineprint}>
              네이버는 공식 API로 별점을 제공하지 않아 블로그 리뷰 수와 후기를 보여드려요. 별점은 네이버
              지도에서 확인할 수 있어요.
            </Text>
          )}
        </>
      )}
    </View>
  );
}

function ScoreCard(props: {
  label: string;
  accent: string;
  value: string;
  sub: string;
  star?: boolean;
  loading: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={props.onPress}
      style={({ pressed }) => [styles.score, pressed && { opacity: 0.7 }]}
      accessibilityRole="link"
    >
      <View style={styles.scoreHead}>
        <View style={[styles.dot, { backgroundColor: props.accent }]} />
        <Text style={styles.scoreLabel}>{props.label}</Text>
        <Ionicons name="open-outline" size={13} color={colors.muted} style={{ marginLeft: 'auto' }} />
      </View>
      {props.loading ? (
        <ActivityIndicator color={props.accent} style={{ alignSelf: 'flex-start', marginVertical: 6 }} />
      ) : (
        <View style={styles.scoreValueRow}>
          {props.star && <Ionicons name="star" size={18} color={colors.star} />}
          <Text style={styles.scoreValue}>{props.value}</Text>
        </View>
      )}
      <Text style={styles.scoreSub}>{props.sub}</Text>
    </Pressable>
  );
}

function ReviewCard({ review }: { review: Review }) {
  return (
    <Pressable
      disabled={!review.url}
      onPress={() => review.url && Linking.openURL(review.url)}
      style={styles.review}
    >
      <View style={styles.reviewHead}>
        <Text style={styles.reviewAuthor} numberOfLines={1}>
          {review.author}
        </Text>
        {review.rating != null && (
          <View style={styles.stars}>
            {Array.from({ length: 5 }, (_, i) => (
              <Ionicons
                key={i}
                name={i < Math.round(review.rating!) ? 'star' : 'star-outline'}
                size={11}
                color={colors.star}
              />
            ))}
          </View>
        )}
        {review.date && <Text style={styles.reviewDate}>{review.date}</Text>}
      </View>
      <Text style={styles.reviewText} numberOfLines={5}>
        {review.text}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  sectionTitle: { ...type.heading },
  scoreRow: { flexDirection: 'row', gap: 10 },
  score: {
    flex: 1,
    padding: 14,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    gap: 4,
  },
  scoreHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  scoreLabel: { fontSize: 13, fontWeight: '700', color: colors.inkSoft },
  scoreValueRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  scoreValue: { fontSize: 24, fontWeight: '800', letterSpacing: -0.6, color: colors.ink },
  scoreSub: { ...type.micro },
  note: { ...type.caption, lineHeight: 19 },
  errorBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  retry: { fontSize: 13, fontWeight: '700', color: colors.primaryInk },
  tabs: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
  },
  tab: { flex: 1, height: 34, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  tabActive: { backgroundColor: colors.surface },
  tabText: { fontSize: 13, fontWeight: '600', color: colors.muted },
  tabTextActive: { color: colors.ink },
  review: {
    padding: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.hairline,
    gap: 6,
  },
  reviewHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reviewAuthor: { fontSize: 13, fontWeight: '700', color: colors.ink, flexShrink: 1 },
  stars: { flexDirection: 'row', gap: 1 },
  reviewDate: { ...type.micro, marginLeft: 'auto' },
  reviewText: { ...type.body, fontSize: 14, lineHeight: 21, color: colors.inkSoft },
  fineprint: { ...type.micro, fontWeight: '500', lineHeight: 16 },
});
