# 맛집지도 (matzip-map)

전국 맛집 가이드북 3권에 실린 **821곳**을 Google 지도 위에 보여주는 iOS · Android 앱입니다.
GPS로 내 위치를 따라가며 가까운 맛집을 보여주고, 음식 종류로 거르고, 이름·음식·지역·초성으로 검색할 수 있습니다.
각 식당 상세 화면에서는 Google 평점·리뷰와 네이버 블로그 리뷰를 함께 보여줍니다.

- **React Native + Expo (SDK 58)**, TypeScript
- 지도: `react-native-maps`, iOS와 Android 모두 **Google Maps SDK** (`PROVIDER_GOOGLE`), 파스텔 커스텀 지도 스타일
- 위치: `expo-location`. 포그라운드 권한을 받고, 25m 이상 움직일 때마다 위치를 갱신합니다.
- 리뷰: `server/`의 프록시가 Google Places API (New)와 네이버 검색 API를 호출합니다. API 키는 앱에 넣지 않습니다.

## 주요 기능

| 기능 | 설명 |
| --- | --- |
| 내 주변 맛집 | 첫 위치를 잡으면 반경 약 5km로 지도를 옮기고, 바텀시트에 가까운 순으로 60곳을 보여줍니다. 위치 권한이 없으면 지도 중심을 기준으로 합니다. |
| 음식 종류 필터 | 한식 · 고기·구이 · 국밥·탕 · 해산물·회 · 면요리 · 중식 · 일식 · 양식·세계 · 카페·디저트 · 분식·간식. 필터는 지도, 주변 목록, 검색 결과에 모두 적용됩니다. |
| 검색 | 가게 이름, 음식(메뉴·태그), 주소, 소개글을 검색합니다. 여러 단어는 모두 일치해야 합니다(예: `해운대 밀면`). 초성 검색도 됩니다(예: `ㄷㅈㄱㅂ`). 점수가 같으면 가까운 순으로 정렬합니다. |
| 지도 | 카테고리별 파스텔 핀을 씁니다. 넓게 보면 3곳 이상 모인 곳을 클러스터로 묶고, 클러스터를 누르면 확대됩니다. 골목 단위로 확대하면 모든 핀이 보입니다. |
| 상세 | 소개, 주소, 전화, 영업시간·휴무, 메뉴·가격, 개업연도, 수록 가이드·추천인을 보여줍니다. 길찾기(Google 지도)와 전화 걸기를 할 수 있습니다. |
| 평점·리뷰 | Google 별점·리뷰 수와 최근 리뷰 5개, 네이버 블로그 리뷰 수와 관련 후기 5개를 보여줍니다. 카드를 누르면 Google 지도나 네이버 지도로 이동합니다. |

> **네이버 평점에 대해**: 네이버는 공식 API로 별점(방문자 평점)을 제공하지 않습니다.
> 그래서 공식 검색 API로 얻을 수 있는 블로그 리뷰 수와 후기를 보여주고, 별점은 네이버 지도로 이동해 확인하도록 했습니다.
> 네이버 지도 화면을 스크래핑하면 이용약관 위반이라 구현하지 않았습니다.

## 데이터

| 가이드북 | 수록 | 원본 파일 |
| --- | --- | --- |
| 부산 노포맛집 100선 (부산관광공사 · 블루리본) | 71곳 | `data/raw/busan-nopo.json` |
| 2025 중소기업CEO 단골맛집 지역맛집 500선 | 510곳 (지역 504 + 중앙회 추천 6) | `data/raw/ceo-500_*.json` |
| 2025 우체국 추천 맛집가이드 (부산·울산·경남) | 245곳 | `data/raw/post-office_*.json` |

- `data/raw/*.json`은 PDF 페이지를 하나씩 옮겨 적은 원본입니다. 이름, 주소, 전화번호는 PDF 텍스트 레이어와 한 글자씩 대조했습니다. 인쇄된 오타도 그대로 두었습니다.
- `npm run build-data`는 원본을 합쳐 `src/data/restaurants.json`을 만듭니다.
  - 두 권 이상에 실린 5곳(하연옥, 가마솥생복집, 동래할매파전, 감포참가자미, 시골추어탕)은 하나로 합치고, 출처를 모두 남깁니다.
  - 주소와 전화가 모두 없는 3곳(부산어묵노포 목록의 백광상회, 마라톤집, 수복센타)은 뺍니다.
  - 지역(시·도)은 주소에서 뽑습니다.
- 음식 카테고리는 각 항목의 메뉴 태그를 보고 사람이 판단해 붙였습니다(예: 샤브샤브 → 국밥·탕).
- **좌표는 아직 비어 있습니다.** 가이드북에 위경도가 없어서 아래 `npm run geocode`로 한 번 채워야 지도에 핀이 나타납니다.
- 그대로 옮긴 주소 중 지오코딩이 실패할 수 있는 곳이 있습니다. 실패한 곳은 스크립트가 끝날 때 목록으로 알려줍니다.
  - 구자윤 과자점: 도로명이 빠져 있습니다.
  - 쏘이472: 구가 빠져 있습니다.
  - 북면자연농원: 번지가 중복 인쇄되어 있습니다.

## 시작하기

### 1. 필요한 키

| 키 | 용도 | 어디서 |
| --- | --- | --- |
| `GOOGLE_MAPS_API_KEY` | 앱 지도 (Maps SDK for iOS / Android) | Google Cloud Console. 번들 ID와 패키지명+SHA-1로 제한하세요. |
| `GOOGLE_MAPS_API_KEY` (스크립트용) | 좌표 생성 (Geocoding API + Places API (New)) | 같은 프로젝트. 서버·스크립트 전용 키를 따로 만드는 것을 권장합니다. |
| `GOOGLE_PLACES_API_KEY` | 리뷰 서버의 Google 평점·리뷰 | Places API (New) |
| `NAVER_CLIENT_ID` / `NAVER_CLIENT_SECRET` | 리뷰 서버의 네이버 블로그 리뷰 | [developers.naver.com](https://developers.naver.com)의 애플리케이션 등록에서 검색 API를 선택하세요. |
| `KAKAO_REST_API_KEY` (선택) | `--kakao` 옵션으로 좌표 생성. 국내 주소 정확도가 높습니다. | developers.kakao.com |

### 2. 설치와 좌표 생성

```bash
cd matzip-map
npm install
cp .env.example .env.local          # 키를 채워 넣으세요

GOOGLE_MAPS_API_KEY=... npm run geocode            # 또는: KAKAO_REST_API_KEY=... npm run geocode -- --kakao
```

`geocode`는 좌표가 없는 곳만 처리하고 25곳마다 저장하므로, 중간에 멈춰도 이어서 실행할 수 있습니다.
`npm run build-data`를 다시 실행해도 이미 생성한 좌표는 그대로 남습니다.

### 3. 리뷰 서버

의존성이 없는 Node 18+ 서버입니다. 같은 코드가 Cloudflare Workers에서도 돌아갑니다.

```bash
# 로컬
GOOGLE_PLACES_API_KEY=... NAVER_CLIENT_ID=... NAVER_CLIENT_SECRET=... npm run review-server   # http://localhost:8787

# Cloudflare Workers 배포
npx wrangler deploy server/worker.mjs --name matzip-reviews --compatibility-date 2025-01-01
npx wrangler secret put GOOGLE_PLACES_API_KEY    # NAVER_CLIENT_ID, NAVER_CLIENT_SECRET도 같은 방법으로
```

- 배포한 주소를 `.env.local`의 `REVIEW_API_URL`에 넣습니다.
- 서버가 없어도 앱은 동작합니다. 평점 카드를 누르면 Google 지도와 네이버 지도로 바로 이동합니다.
- Google 약관 때문에 리뷰는 서버 메모리에 6시간, 앱에는 실행 중에만 캐시합니다.

### 4. 앱 실행

Google 지도는 네이티브 모듈이라 Expo Go에서는 동작하지 않습니다. 개발 빌드를 사용하세요.

```bash
npx expo run:ios        # Xcode 필요
npx expo run:android    # Android Studio 필요
# 또는 클라우드 빌드
npx eas-cli@latest build --profile development --platform all
```

## 개발

```bash
npm run typecheck     # tsc
npm test              # 검색, 거리, 클러스터, 데이터 무결성 (Jest)
npm run test:server   # 리뷰 프록시 (node:test, 외부 API는 mock)
```

```
matzip-map/
├─ App.tsx                     # SafeArea + MapScreen
├─ app.config.ts               # 앱 이름/권한/Google Maps 키 주입 (env)
├─ src/
│  ├─ screens/MapScreen.tsx    # 지도, 검색, 필터, 바텀시트 조합
│  ├─ components/              # SearchBar, CategoryChips, Markers, BottomSheet, RestaurantRow, RestaurantDetail, ReviewsSection
│  ├─ hooks/useUserLocation.ts # 권한 요청 + 위치 추적
│  ├─ lib/                     # search(초성 포함), geo(거리/영역), cluster, reviews(API 클라이언트·딥링크)
│  ├─ data/restaurants.json    # 빌드된 데이터 (821곳)
│  └─ theme.ts                 # 파스텔 팔레트, 카테고리 색/이모지, 지도 스타일
├─ data/raw/                   # 가이드북 PDF에서 옮긴 원본 JSON
├─ scripts/                    # build-data.mjs, geocode.mjs
└─ server/                     # 리뷰 프록시 (handler / node / worker)
```

## 디자인

- 따뜻한 오프화이트 배경(`#FBFAF8`) 위에 라벤더(`#A99BF0`)를 주 색으로 씁니다.
- 카테고리마다 파스텔 색(피치, 로즈, 버터, 스카이, 민트…)과 같은 계열의 진한 글자색을 짝지었습니다.
- 지도는 채도를 낮춘 커스텀 스타일이라 핀이 잘 보입니다. 지도의 POI 아이콘은 숨겼습니다.
- 둥근 모서리(16~28), 옅은 보라빛 그림자, 얇은 구분선을 쓰고, 장식은 최소화했습니다.
