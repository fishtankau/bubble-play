const ONESIGNAL_SDK_URL = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js'
const appId = import.meta.env.VITE_ONESIGNAL_APP_ID

let initialization

/** Loads OneSignal once and initializes it when the app ID is configured. */
export function initializeOneSignal() {
  if (!appId) return Promise.resolve(null)
  if (initialization) return initialization

  initialization = new Promise((resolve, reject) => {
    window.OneSignalDeferred = window.OneSignalDeferred || []
    window.OneSignalDeferred.push(async OneSignal => {
      try {
        await OneSignal.init({
          appId,
          serviceWorkerPath: '/OneSignalSDKWorker.js',
        })
        resolve(OneSignal)
      } catch (error) {
        reject(error)
      }
    })

    const script = document.createElement('script')
    script.src = ONESIGNAL_SDK_URL
    script.defer = true
    script.onerror = () => reject(new Error('Could not load the OneSignal Web SDK.'))
    document.head.appendChild(script)
  })

  return initialization
}

export function isOneSignalConfigured() {
  return Boolean(appId)
}
