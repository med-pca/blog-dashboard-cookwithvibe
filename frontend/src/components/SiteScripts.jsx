import { useEffect } from 'react'
import { fetchSiteScripts } from '../api/ads'
import { installSiteScripts } from '../lib/siteScripts'

export default function SiteScripts() {
  useEffect(() => {
    let cancelled = false
    fetchSiteScripts().then((settings) => {
      if (!cancelled) installSiteScripts(settings)
    }).catch((error) => console.warn('Site scripts could not be loaded:', error))
    return () => { cancelled = true }
  }, [])
  return null
}
