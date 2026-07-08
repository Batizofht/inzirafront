// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolWeight, SymbolViewProps } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle, Text } from 'react-native';
import { isWeb } from '@/lib/platform';

type IconMapping = Record<string, string>;
type IconSymbolName = keyof typeof MAPPING | string;

// Unicode mapping for Material Icons - used on web for reliable icon rendering
// Format: SF Symbol name -> Material Icons unicode codepoint (e.g., \uE88A)
const UNICODE_MAPPING: Record<string, string> = {
  'home': '\uE88A',
  'search': '\uE8B6',
  'add-circle': '\uE147',
  'chat': '\uE0B7',
  'favorite': '\uE87D',
  'person': '\uE7FD',
  'send': '\uE163',
  'code': '\uE86F',
  'chevron-right': '\uE5CC',
  'keyboard-arrow-down': '\uE313',
  'keyboard-arrow-up': '\uE316',
  'chevron-left': '\uE5CB',
  'directions-car': '\uE531',
  'two-wheeler': '\uE9F9',
  'motorcycle': '\uE91B',
  'directions-bus': '\uE530',
  'local-shipping': '\uE558',
  'electric-car': '\uEB1C',
  'eco': '\uEA35',
  'local-florist': '\uE545',
  'bolt': '\uE3E7',
  'apps': '\uE5C3',
  'notifications': '\uE7F4',
  'phone': '\uE0CD',
  'email': '\uE0BE',
  'location-on': '\uE0C8',
  'cancel': '\uE5C9',
  'check-circle': '\uE86C',
  'check': '\uE5CA',
  'verified': '\uE8E8',
  'shield': '\uE8E8',
  'refresh': '\uE5D5',
  'photo-camera': '\uE412',
  'photo': '\uE410',
  'collections': '\uE3B6',
  'book': '\uE865',
  'description': '\uE873',
  'manage_search': '\uE9E5',
  'cloud-upload': '\uE2C3',
  'edit': '\uE3C9',
  'delete': '\uE872',
  'star': '\uE838',
  'rate-review': '\uE560',
  'warning': '\uE002',
  'error': '\uE001',
  'lock': '\uE897',
  'visibility': '\uE8F4',
  'visibility-off': '\uE8F5',
  'track-changes': '\uE8E1',
  'auto-awesome': '\uE65F',
  'schedule': '\uE8B5',
  'place': '\uE0C8',
  'credit-card': '\uE870',
  'bar-chart': '\uE26B',
  'groups': '\uE7EF',
  'thumb-up': '\uE8DC',
  'arrow-upward': '\uE5D8',
  'campaign': '\uE63F',
  'upload': '\uE2C6',
  'settings': '\uE8B8',
  'speed': '\uE9E4',
  'local-offer': '\uE03E',
  'person-add': '\uE7FB',
  'filter-alt': '\uE94D',
  'mark-chat-unread': '\uE895',
  'handshake': '\uE9E1',
  'menu': '\uE5D2',
  'close': '\uE5CD',
  'arrow-forward': '\uE5C8',
  'fullscreen': '\uE5D0',
  'help-outline': '\uE8FD',
  'public': '\uE80B',
  'shield-checkerboard': '\uE8E8',
  'assignment': '\uE85D',
  'folder-open': '\uE2C8',
  'inventory': '\uE179',
  'badge': '\uEA67',
  'person-outline': '\uE7FD',
  'verified-user': '\uE8E8',
  'security': '\uE32A',
  'business': '\uE0AF',
  'pan-tool': '\uE925',
  'download': '\uF090',
  'light-mode': '\uE518',
  'dark-mode': '\uE51C',
};

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  'house.fill': 'home',
  'magnifyingglass': 'search',
  'plus.circle': 'add-circle',
  'plus.circle.fill': 'add-circle',
  'message.fill': 'chat',
  'heart.fill': 'favorite',
  'person.fill': 'person',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  'chevron.down': 'keyboard-arrow-down',
  'chevron.up': 'keyboard-arrow-up',
  'chevron.left': 'chevron-left',
  'car.fill': 'directions-car',
  'car.rear.fill': 'directions-car',
  'suv.fill': 'directions-car',
  'scooter': 'two-wheeler',
  'motorcycle.fill': 'motorcycle',
  'bus.fill': 'directions-bus',
  'truck.box.fill': 'local-shipping',
  'bolt.car.fill': 'electric-car',
  'leaf.fill': 'eco',
  'bolt.fill': 'bolt',
  'square.grid.2x2': 'apps',
  'bell.fill': 'notifications',
  'phone.fill': 'phone',
  'envelope.fill': 'email',
  'location.fill': 'location-on',
  'house.geo': 'location-on',
  'xmark.circle.fill': 'cancel',
  'checkmark.circle.fill': 'check-circle',
  'checkmark': 'check',
  'checkmark.seal.fill': 'verified',
  'checkmark.shield.fill': 'verified-user',
  'arrow.counterclockwise': 'refresh',
  'arrow.clockwise': 'refresh',
  'camera.fill': 'photo-camera',
  'photo': 'photo',
  'photo.stack': 'collections',
  'book.fill': 'book',
  'plus-circle': 'add-circle',
  'doc.text.fill': 'description',
  'doc.text.magnifyingglass': 'assignment',
  'doc.badge.plus': 'cloud-upload',
  'pencil': 'edit',
  'square.and.pencil': 'edit',
  'trash': 'delete',
  'trash.fill': 'delete',
  'trash.circle.fill': 'delete',
  'star.fill': 'star',
  'star.bubble.fill': 'rate-review',
  'exclamationmark.triangle.fill': 'warning',
  'exclamationmark.circle.fill': 'error',
  'lock.fill': 'lock',
  'eye.fill': 'visibility',
  'eye.slash.fill': 'visibility-off',
  'target': 'track-changes',
  'sparkles': 'auto-awesome',
  'clock.fill': 'schedule',
  'mappin.and.ellipse': 'place',
  'creditcard.fill': 'credit-card',
  'chart.bar.fill': 'bar-chart',
  'person.2.fill': 'groups',
  'hand.thumbsup.fill': 'thumb-up',
  'arrow.up.circle.fill': 'arrow-upward',
  'megaphone.fill': 'campaign',
  'person.crop.circle.badge.plus': 'person-add',
  'line.3.horizontal.decrease.circle.fill': 'filter-alt',
  'message.badge.fill': 'mark-chat-unread',
  'handshake.fill': 'handshake',
  'arrow.up': 'arrow-upward',
  'list': 'menu',
  'list.bullet': 'menu',
  'xmark': 'close',
  'arrow.right': 'chevron-right',
  'arrow.forward': 'arrow-forward',
  'arrow.up.left.and.arrow.down.right': 'fullscreen',
  'arrow.up.right.and.arrow.down.left': 'fullscreen',
  'globe': 'public',
  'arrow.up.doc': 'upload',
  'gearshape.fill': 'settings',
  'gauge': 'speed',
  'tag.fill': 'local-offer',
  'shield.checkerboard': 'verified-user',
  'building.2.fill': 'business',
  'hand.raised.fill': 'pan-tool',
  'lock.shield.fill': 'security',
  'arrow.down.doc.fill': 'download',
  'sun.max.fill': 'light-mode',
  'moon.fill': 'dark-mode',
  // Direct Material Icons fallbacks (when backend sends Material names directly)
  'electric_car': 'electric-car',
  'electric-car': 'electric-car',
  'directions-car': 'directions-car',
  'two-wheeler': 'two-wheeler',
  'motorcycle': 'motorcycle',
  'directions-bus': 'directions-bus',
  'local-shipping': 'local-shipping',
  'bolt': 'bolt',
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  const iconName = MAPPING[name as keyof typeof MAPPING] || 'help-outline';

  // On web, use unicode character with Material Icons font for reliable rendering
  if (isWeb) {
    const unicodeChar = UNICODE_MAPPING[iconName] || UNICODE_MAPPING['help-outline'] || '\uE8FD';
    return (
      <Text
        style={[
          {
            fontFamily: '"Material Icons"',
            fontSize: size,
            color: color as string,
            fontWeight: 'normal',
            fontStyle: 'normal',
            lineHeight: size,
            letterSpacing: 0,
            textTransform: 'none',
          },
          style,
        ]}
      >
        {unicodeChar}
      </Text>
    );
  }

  // Use @expo/vector-icons on native platforms
  return <MaterialIcons color={color} size={size} name={iconName as any} style={style} />;
}
