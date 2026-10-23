import type { ExpoConfig } from 'expo/config';

// Keys are read from the environment (see .env.example) so they never live in git.
const googleMapsKeyIos = process.env.GOOGLE_MAPS_IOS_API_KEY ?? process.env.GOOGLE_MAPS_API_KEY;
const googleMapsKeyAndroid = process.env.GOOGLE_MAPS_ANDROID_API_KEY ?? process.env.GOOGLE_MAPS_API_KEY;

const config: ExpoConfig = {
  name: '맛집지도',
  slug: 'matzip-map',
  scheme: 'matzipmap',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  ios: {
    bundleIdentifier: 'com.matzipmap.app',
    supportsTablet: false,
  },
  android: {
    package: 'com.matzipmap.app',
    adaptiveIcon: {
      backgroundColor: '#EEEAFE',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    permissions: ['ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION'],
    predictiveBackGestureEnabled: false,
  },
  plugins: [
    [
      'expo-location',
      {
        locationWhenInUsePermission: '내 주변 맛집을 지도에 보여드리기 위해 현재 위치를 사용해요.',
      },
    ],
    [
      'react-native-maps',
      {
        iosGoogleMapsApiKey: googleMapsKeyIos,
        androidGoogleMapsApiKey: googleMapsKeyAndroid,
      },
    ],
  ],
  extra: {
    reviewApiUrl: process.env.REVIEW_API_URL ?? '',
  },
};

export default config;
