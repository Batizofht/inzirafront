const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ensure ttf font files are included as assets (required for @expo/vector-icons on web)
if (!config.resolver.assetExts.includes('ttf')) {
  config.resolver.assetExts.push('ttf');
}

const originalResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // During SSR / server rendering (Node.js), AsyncStorage has no native module.
  // Return an empty stub so the CommonJS build doesn't crash.
  if (
    moduleName === '@react-native-async-storage/async-storage' &&
    context.customResolverOptions?.environment === 'node'
  ) {
    return { type: 'empty' };
  }

  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
