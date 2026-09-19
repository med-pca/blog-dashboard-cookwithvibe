// Event handlers (onload, onerror, ...) stay out: a tag may only run code the
// parser has seen, either as a vetted HTTPS src or as its own inline body.
const ATTRIBUTES = new Set(['src', 'async', 'defer', 'type', 'crossorigin', 'integrity', 'referrerpolicy', 'id', 'nomodule'])

export function parseSiteScripts(content = '') {
  const template = document.createElement('template')
  template.innerHTML = content
  const scripts = []
  for (const node of template.content.childNodes) {
    if (node.nodeType === Node.COMMENT_NODE || (node.nodeType === Node.TEXT_NODE && !node.textContent.trim())) continue
    if (node.nodeName !== 'SCRIPT') {
      throw new Error('Use <script> tags only. Other HTML is not supported.')
    }
    const code = node.textContent.trim()
    if (node.hasAttribute('src')) {
      let url
      try { url = new URL(node.getAttribute('src')) } catch { throw new Error('Each external script needs a valid HTTPS URL.') }
      if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Each external script needs a valid HTTPS URL.')
      // Browsers ignore the body of a script that has a src, so accepting one
      // here would silently drop code the author expected to run.
      if (code) throw new Error('A <script src="..."> tag cannot also hold inline code. Put the inline code in its own tag.')
    } else if (!code) {
      throw new Error('Each <script> tag needs a src="https://..." or inline code.')
    }
    for (const attribute of node.attributes) {
      if (!ATTRIBUTES.has(attribute.name) && !attribute.name.startsWith('data-')) {
        throw new Error(`Unsupported script attribute: ${attribute.name}`)
      }
    }
    scripts.push(node)
  }
  return scripts
}

// Scripts retain global effects after removal; execute each one only once per
// document, including StrictMode and client-side navigation. External tags are
// keyed by URL, inline ones by their code.
const loaded = new Set()

export function installSiteScripts(settings) {
  const groups = [
    [document.head, parseSiteScripts(settings.headerScripts)],
    [document.body, parseSiteScripts(settings.footerScripts)],
  ]
  for (const [target, scripts] of groups) {
    for (const source of scripts) {
      const src = source.src
      const code = source.textContent
      const key = src || `inline:${code}`
      const present = Array.from(document.scripts)
        .some((script) => (src ? script.src === src : !script.src && script.textContent === code))
      if (loaded.has(key) || present) continue
      const script = document.createElement('script')
      script.async = source.hasAttribute('async')
      for (const attribute of source.attributes) script.setAttribute(attribute.name, attribute.value)
      loaded.add(key)
      if (src) {
        script.addEventListener('error', () => {
          loaded.delete(key)
          script.remove()
        }, { once: true })
      } else {
        // Set last: an inline script runs the moment it is appended.
        script.textContent = code
      }
      target.appendChild(script)
    }
  }
}
