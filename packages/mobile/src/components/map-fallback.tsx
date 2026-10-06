import Constants from 'expo-constants';
import { MapPin, Navigation } from 'lucide-react-native';
import { Linking, Platform, View } from 'react-native';
import { useTranslations } from 'use-intl';
import { colors, radii } from '../theme';
import { Button } from './button';
import { T } from './text';

/**
 * react-native-maps renders Google Maps on Android, which crashes without an API key. Builds made without
 * GOOGLE_MAPS_ANDROID_KEY (see app.config.js) show `MapFallback` instead of a MapView.
 */
export const nativeMapsAvailable = Platform.OS !== 'android' || Boolean(Constants.expoConfig?.android?.config?.googleMaps?.apiKey);

export interface MapPoint {
  lat: number;
  lng: number;
  label?: string;
}

export const openInMaps = (p: MapPoint) => void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`);

export function MapFallback({ points = [], height = 180 }: { points?: MapPoint[]; height?: number }) {
  const t = useTranslations('mobile');
  return (
    <View style={{ minHeight: height, borderRadius: radii.xl, backgroundColor: colors.sand[100], alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16 }}>
      <MapPin size={30} color={colors.green[700]} />
      <T center size={13} color={colors.textMuted}>
        {t('mapUnavailable')}
      </T>
      {points.map((p) => (
        <Button key={`${p.lat},${p.lng}`} size="sm" variant="outline" icon={<Navigation size={16} color={colors.navy[900]} />} title={p.label ? `${t('openInMaps')} · ${p.label}` : t('openInMaps')} onPress={() => openInMaps(p)} />
      ))}
    </View>
  );
}
