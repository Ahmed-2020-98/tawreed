// Extends app.json with build-time values (EAS environment variables):
// GOOGLE_MAPS_ANDROID_KEY enables Google Maps on Android; without it the app shows MapFallback (packages/mobile).
module.exports = ({ config }) => {
  const mapsKey = process.env.GOOGLE_MAPS_ANDROID_KEY;
  if (!mapsKey) return config;
  return { ...config, android: { ...config.android, config: { ...config.android?.config, googleMaps: { apiKey: mapsKey } } } };
};
