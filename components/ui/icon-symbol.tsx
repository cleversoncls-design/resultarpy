import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolWeight, SymbolViewProps } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type IconMapping = Record<SymbolViewProps['name'], ComponentProps<typeof MaterialIcons>['name']>;
type IconSymbolName = keyof typeof MAPPING;

const MAPPING = {
  'house.fill': 'home',
  'airplane': 'flight',
  'checkmark.seal.fill': 'verified',
  'briefcase.fill': 'business-center',
  'chart.bar.fill': 'bar-chart',
  'person.crop.circle.fill': 'account-circle',
  'plus': 'add',
  'chevron.right': 'chevron-right',
  'doc.text.fill': 'description',
  'wallet.pass.fill': 'account-balance-wallet',
  'building.2.fill': 'domain',
  'gearshape.fill': 'settings',
  'globe': 'language',
  'moon.fill': 'dark-mode',
  'paperplane.fill': 'send',
  'bell.fill': 'notifications',
  'magnifyingglass': 'search',
  'line.3.horizontal.decrease.circle': 'filter-list',
  'xmark': 'close',
  'checkmark': 'check',
  'arrow.up.right': 'north-east',
  'car.fill': 'directions-car',
  'wrench.and.screwdriver.fill': 'build',
  'calendar.badge.clock': 'event-available',
  'exclamationmark.triangle.fill': 'warning',
  'camera.fill': 'photo-camera',
  'gauge.medium': 'speed',
} as IconMapping;

export function IconSymbol({ name, size = 24, color, style }: { name: IconSymbolName; size?: number; color: string | OpaqueColorValue; style?: StyleProp<TextStyle>; weight?: SymbolWeight }) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
