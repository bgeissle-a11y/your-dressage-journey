import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE, // 'development' or 'production'
  enabled: import.meta.env.PROD,      // only send errors in production builds
});

export default Sentry;
