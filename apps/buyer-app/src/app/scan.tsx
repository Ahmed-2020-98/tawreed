import type { ProductCardDto } from '@tawreed/contracts';
import { api, Button, colors, T, useToast } from '@tawreed/mobile';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { X } from 'lucide-react-native';
import { useRef } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslations } from 'use-intl';

/** Barcode scanner → looks the product up by barcode via search and opens it. */
export default function Scan() {
  const t = useTranslations('mobile');
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const [perm, request] = useCameraPermissions();
  const busy = useRef(false);
  if (!perm?.granted) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16, backgroundColor: '#fff' }}>
        <T weight="bold" center>
          {t('cameraDenied')}
        </T>
        <Button title={t('allow')} onPress={() => void request()} />
        <Button title="✕" variant="ghost" onPress={() => router.back()} />
      </View>
    );
  }
  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <CameraView
        style={{ flex: 1 }}
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128'] }}
        onBarcodeScanned={async ({ data }) => {
          if (busy.current) return;
          busy.current = true;
          const page = await api.page<ProductCardDto>('/public/products', { query: { q: data, pageSize: 1 } }).catch(() => null);
          const hit = page?.data[0];
          if (hit) router.replace(`/product/${hit.slug}`);
          else {
            toast(t('scanNotFound'), 'error');
            setTimeout(() => (busy.current = false), 1500);
          }
        }}
      />
      <View style={{ position: 'absolute', top: insets.top + 12, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <T weight="bold" color="#fff">
          {t('scanTitle')}
        </T>
        <Pressable accessibilityLabel="close" onPress={() => router.back()} style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
          <X size={22} color="#fff" />
        </Pressable>
      </View>
      <View pointerEvents="none" style={{ position: 'absolute', top: '35%', left: '12%', right: '12%', height: 180, borderRadius: 20, borderWidth: 3, borderColor: colors.green[400] }} />
    </View>
  );
}
