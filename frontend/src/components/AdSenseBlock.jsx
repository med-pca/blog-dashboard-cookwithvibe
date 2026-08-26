import { useEffect, useRef, useState } from 'react'
import { getAdsConfig } from '../api/ads'
import { loadAdSenseScript } from '../lib/adsense'

/**
 * Renders one AdSense unit for a named placement. The slot id comes from the
 * admin panel at runtime, so ads can be turned on, moved or switched off
 * without a rebuild. Renders nothing when the placement has no slot configured.
 */
export default function AdSenseBlock({ placement, className = '', label = 'Advertisement' }) {
  const [config, setConfig] = useState(null)
  const pushed = useRef(false)

  useEffect(() => {
    let alive = true
    getAdsConfig().then((c) => {
      if (alive) setConfig(c)
    })
    return () => {
      alive = false
    }
  }, [])

  const clientId = config?.enabled ? config.clientId : ''
  const slot = clientId ? config.slots?.[placement] : ''

  useEffect(() => {
    if (!slot || !clientId || pushed.current) return

    let cancelled = false
    loadAdSenseScript(clientId)
      .then(() => {
        if (cancelled || pushed.current) return
        pushed.current = true
        // AdSense needs one push per rendered ad container.
        ;(window.adsbygoogle = window.adsbygoogle || []).push({})
      })
      // Blocked by an ad blocker, offline, or a bad client id: leave the space
      // empty rather than surfacing an error to the reader.
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [slot, clientId])

  if (!slot) return null

  return (
    <div className={className}>
      {label && (
        <p className="text-[10px] uppercase tracking-widest text-gray-300 text-center mb-1.5">
          {label}
        </p>
      )}
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={clientId}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  )
}
