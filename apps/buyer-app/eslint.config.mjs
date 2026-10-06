import { reactNative } from '@tawreed/eslint-config/react-native';

export default [...reactNative, { ignores: ['eslint.config.mjs', '.expo/**', 'expo-env.d.ts', 'metro.config.js', 'babel.config.js'] }];
