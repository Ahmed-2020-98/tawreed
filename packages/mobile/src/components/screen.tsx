import { router } from 'expo-router';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { RefreshControl, ScrollView, type ScrollViewProps, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRTL } from '../i18n';
import { colors } from '../theme';
import { IconButton } from './button';
import { T } from './text';

export function Header({ title, subtitle, back = true, right, onBack }: { title?: string; subtitle?: string; back?: boolean; right?: React.ReactNode; onBack?: () => void }) {
  const insets = useSafeAreaInsets();
  const rtl = useRTL();
  return (
    <View style={{ paddingTop: insets.top + 6, paddingBottom: 10, paddingHorizontal: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: colors.gray[100], flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      {back ? (
        <IconButton label="back" tone="plain" onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')))}>
          {/* Back points to the reading start: right in RTL, left in LTR */}
          {rtl ? <ChevronRight size={24} color={colors.text} /> : <ChevronLeft size={24} color={colors.text} />}
        </IconButton>
      ) : (
        <View style={{ width: 4 }} />
      )}
      <View style={{ flex: 1, alignItems: 'center' }}>
        {title && (
          <T weight="extrabold" size={17} numberOfLines={1}>
            {title}
          </T>
        )}
        {subtitle && (
          <T size={12} color={colors.textMuted} num numberOfLines={1}>
            {subtitle}
          </T>
        )}
      </View>
      <View style={{ minWidth: 42, alignItems: 'flex-end' }}>{right}</View>
    </View>
  );
}

export interface ScreenProps extends ScrollViewProps {
  title?: string;
  subtitle?: string;
  back?: boolean;
  right?: React.ReactNode;
  header?: React.ReactNode | false;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  footer?: React.ReactNode;
  pad?: number;
  bg?: string;
  contentStyle?: ViewStyle;
}

/** Standard screen: header + (scrollable) body + optional sticky footer, safe-area aware. */
export function Screen({ title, subtitle, back = true, right, header, scroll = true, refreshing, onRefresh, footer, pad = 16, bg = colors.background, contentStyle, children, ...rest }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const head = header === false ? null : (header ?? (title || back ? <Header title={title} subtitle={subtitle} back={back} right={right} /> : null));
  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      {head}
      {scroll ? (
        <ScrollView
          contentContainerStyle={[{ padding: pad, paddingBottom: footer ? pad : pad + insets.bottom + 8, gap: 14 }, contentStyle]}
          refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.primary} /> : undefined}
          keyboardShouldPersistTaps="handled"
          {...rest}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, contentStyle]}>{children}</View>
      )}
      {footer && <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: insets.bottom + 12, backgroundColor: '#fff', borderTopWidth: 1, borderColor: colors.gray[100] }}>{footer}</View>}
    </View>
  );
}
