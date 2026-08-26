let scriptPromise = null

export function ensureAdSenseMeta(clientId) {
  if (!clientId || document.querySelector('meta[name="google-adsense-account"]')) return
  const meta = document.createElement('meta')
  meta.setAttribute('name', 'google-adsense-account')
  meta.setAttribute('content', clientId)
  document.head.appendChild(meta)
}

export function loadAdSenseScript(clientId) {
  if (!clientId) return Promise.reject(new Error('Missing AdSense publisher id'))
  if (scriptPromise) return scriptPromise

  const existing = document.querySelector('script[data-cookwithvibe-adsense]')
  if (existing) return Promise.resolve()

  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.async = true
    script.crossOrigin = 'anonymous'
    script.dataset.cookwithvibeAdsense = 'true'
    script.src =
      'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' +
      encodeURIComponent(clientId)
    script.onload = resolve
    script.onerror = () => {
      scriptPromise = null
      reject(new Error('Could not load AdSense'))
    }
    document.head.appendChild(script)
  })

  return scriptPromise
}

export function isAdSenseEligiblePath(pathname) {
  return !['/rnl-panel', '/privacy', '/cookies', '/terms', '/disclaimer'].some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  )
}
