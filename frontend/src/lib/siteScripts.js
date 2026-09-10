const ATTRIBUTES = new Set(['src', 'async', 'defer', 'type', 'crossorigin', 'integrity', 'referrerpolicy', 'id', 'nomodule'])

export function parseSiteScripts(content = '') {
  const template = document.createElement('template')
  template.innerHTML = content
  const scripts = []
  for (const node of template.content.childNodes) {
    if (node.nodeType === Node.COMMENT_NODE || (node.nodeType === Node.TEXT_NODE && !node.textContent.trim())) continue
    if (node.nodeName !== 'SCRIPT' || node.textContent.trim()) {
      throw new Error('Use external <script src="https://..."> tags only. Inline JavaScript and other HTML are not supported.')
    }
    let url
    try { url = new URL(node.getAttribute('src')) } catch { throw new Error('Each script needs a valid HTTPS URL.') }
    if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Each script needs a valid HTTPS URL.')
    for (const attribute of node.attributes) {
      if (!ATTRIBUTES.has(attribute.name) && !attribute.name.startsWith('data-')) {
        throw new Error(`Unsupported script attribute: ${attribute.name}`)
      }
    }
    scripts.push(node)
  }
  return scripts
}

// Scripts retain global effects after removal; execute each URL only once per
// document, including StrictMode and client-side navigation.
const loaded = new Set()

export function installSiteScripts(settings) {
  const groups = [
    [document.head, parseSiteScripts(settings.headerScripts)],
    [document.body, parseSiteScripts(settings.footerScripts)],
  ]
  for (const [target, scripts] of groups) {
    for (const source of scripts) {
      const src = source.src
      if (loaded.has(src) || Array.from(document.scripts).some((script) => script.src === src)) continue
      const script = document.createElement('script')
      script.async = source.hasAttribute('async')
      for (const attribute of source.attributes) script.setAttribute(attribute.name, attribute.value)
      loaded.add(src)
      script.addEventListener('error', () => {
        loaded.delete(src)
        script.remove()
      }, { once: true })
      target.appendChild(script)
    }
  }
}
