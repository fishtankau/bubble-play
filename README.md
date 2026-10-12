
# Fishtank Bubble

## OneSignal web push

The app loads the OneSignal Web SDK with its configured public App ID. A Vite environment variable can override the default for a different environment:

```text
VITE_ONESIGNAL_APP_ID=<OneSignal App ID>
```

In OneSignal, configure Web Push for `https://bubble-play.vercel.app`. The OneSignal service worker is served from `/OneSignalSDKWorker.js`. Users can enable browser notifications from the bell button in the dashboard header; the browser permission prompt only appears after they choose it.

Do not put the OneSignal REST API key in a `VITE_` variable or browser code. The web client only needs the public App ID.
