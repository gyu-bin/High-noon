/**
 * QA / App Store screenshot routes under app/capture/*.
 * Open in development, or in a build made with EXPO_PUBLIC_ENABLE_CAPTURE_ROUTES=1
 * (scripts/capture_app_store_screenshots.sh). Store builds never set the flag, so
 * high-noon://capture/... redirects to "/".
 */
export const CAPTURE_ROUTES_ENABLED =
  __DEV__ || process.env.EXPO_PUBLIC_ENABLE_CAPTURE_ROUTES === '1';
