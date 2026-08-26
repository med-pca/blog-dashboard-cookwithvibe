import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import * as Sentry from "@sentry/react";
import "./index.css";
import App from "./App.jsx";
import { getAdsConfig } from "./api/ads";
import { ensureAdSenseMeta, isAdSenseEligiblePath, loadAdSenseScript } from "./lib/adsense";

const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.MODE,
    tracesSampleRate: import.meta.env.PROD ? 0.2 : 0,
    sendDefaultPii: false,
  });
}

const umamiUrl = import.meta.env.VITE_UMAMI_URL;
const umamiId = import.meta.env.VITE_UMAMI_WEBSITE_ID;
if (umamiUrl && umamiId) {
  const s = document.createElement("script");
  s.defer = true;
  s.src = `${umamiUrl}/script.js`;
  s.setAttribute("data-website-id", umamiId);
  document.head.appendChild(s);
}

// The verification meta remains available before ads are approved/enabled.
// Auto Ads is separate and deliberately excluded from admin/legal routes.
getAdsConfig().then((ads) => {
  if (!ads.clientId) return;
  ensureAdSenseMeta(ads.clientId);
  if (ads.enabled && ads.autoAds && isAdSenseEligiblePath(window.location.pathname)) {
    loadAdSenseScript(ads.clientId).catch(() => {});
  }
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Sentry.ErrorBoundary>
      <HelmetProvider>
        <App />
      </HelmetProvider>
    </Sentry.ErrorBoundary>
  </StrictMode>,
);
