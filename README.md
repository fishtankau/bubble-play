
# Fishtank Bubble

## OneSignal web push

The app loads the OneSignal Web SDK when `VITE_ONESIGNAL_APP_ID` is set. Add the OneSignal App ID as a Vite environment variable in Vercel, then redeploy:

```text
VITE_ONESIGNAL_APP_ID=<OneSignal App ID>
```

In OneSignal, configure Web Push for `https://bubble-play.vercel.app` and use the same App ID. The OneSignal service worker is served from `/OneSignalSDKWorker.js`. Users can enable browser notifications from the bell button in the dashboard header; the browser permission prompt only appears after they choose it.

Do not put the OneSignal REST API key in a `VITE_` variable or browser code. The web client only needs the public App ID.
