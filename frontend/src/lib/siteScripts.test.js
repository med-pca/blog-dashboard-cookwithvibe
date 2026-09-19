import { describe, expect, it } from 'vitest'
import { installSiteScripts, parseSiteScripts } from './siteScripts'

describe('site scripts', () => {
  it('accepts the supplied Header Bidding tag and preserves async', () => {
    const [script] = parseSiteScripts('<script src="https://d3u598arehftfk.cloudfront.net/prebid_hb_39706_43524.js" async> </script>')
    expect(script.src).toBe('https://d3u598arehftfk.cloudfront.net/prebid_hb_39706_43524.js')
    expect(script.hasAttribute('async')).toBe(true)
  })
  it('accepts an external loader followed by its inline configuration', () => {
    const scripts = parseSiteScripts(`
      <script async src="https://www.googletagmanager.com/gtag/js?id=G-TEST"></script>
      <script>window.dataLayer = window.dataLayer || []; gtag('config', 'G-TEST')</script>
    `)
    expect(scripts).toHaveLength(2)
    expect(scripts[1].src).toBe('')
    expect(scripts[1].textContent).toContain("gtag('config', 'G-TEST')")
  })
  it.each([
    ['other HTML', '<img src="https://example.com/a">'],
    ['stray text', 'load this: <script src="https://example.com/a.js"></script>'],
    ['a non-HTTPS src', '<script src="http://example.com/a.js"></script>'],
    ['an event handler', '<script src="https://example.com/a.js" onload="alert(1)"></script>'],
    ['an empty tag', '<script></script>'],
    ['a src alongside inline code', '<script src="https://example.com/a.js">alert(1)</script>'],
  ])('rejects %s', (_label, content) => {
    expect(() => parseSiteScripts(content)).toThrow()
  })
  it('places scripts in head and at the end of body without duplicating on repeat calls', () => {
    const settings = {
      headerScripts: '<script src="https://example.com/header-test.js" async data-site="123"></script>',
      footerScripts: '<script src="https://example.com/footer-test.js"></script>',
    }
    installSiteScripts(settings)
    installSiteScripts(settings)
    expect(document.head.querySelectorAll('script[src="https://example.com/header-test.js"]')).toHaveLength(1)
    expect(document.head.querySelector('script[data-site="123"]').async).toBe(true)
    expect(document.body.lastElementChild.src).toBe('https://example.com/footer-test.js')
    expect(document.body.lastElementChild.async).toBe(false)
  })
  // jsdom defers evaluation behind its resource queue, so assert the element the
  // browser runs: one inline tag holding the code, however often install is called.
  it('installs an inline script once, however often it is installed', () => {
    const code = 'window.dataLayer = window.dataLayer || []'
    installSiteScripts({ headerScripts: `<script>${code}</script>`, footerScripts: '' })
    installSiteScripts({ headerScripts: `<script>${code}</script>`, footerScripts: '' })
    const inline = document.head.querySelectorAll('script:not([src])')
    expect(inline).toHaveLength(1)
    expect(inline[0].textContent).toBe(code)
  })
  it('does not install partial content when either field is invalid', () => {
    expect(() => installSiteScripts({ headerScripts: '<script src="https://example.com/partial.js"></script>', footerScripts: '<b>invalid</b>' })).toThrow()
    expect(document.querySelector('script[src="https://example.com/partial.js"]')).toBeNull()
  })
})
