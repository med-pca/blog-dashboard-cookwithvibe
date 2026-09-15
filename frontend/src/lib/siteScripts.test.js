import { describe, expect, it } from 'vitest'
import { installSiteScripts, parseSiteScripts } from './siteScripts'

describe('site scripts', () => {
  it('accepts the supplied Header Bidding tag and preserves async', () => {
    const [script] = parseSiteScripts('<script src="https://d3u598arehftfk.cloudfront.net/prebid_hb_39706_43524.js" async> </script>')
    expect(script.src).toBe('https://d3u598arehftfk.cloudfront.net/prebid_hb_39706_43524.js')
    expect(script.hasAttribute('async')).toBe(true)
  })
  it.each([
    '<script>alert(1)</script>',
    '<img src="https://example.com/a">',
    '<script src="http://example.com/a.js"></script>',
    '<script src="https://example.com/a.js" onload="alert(1)"></script>',
  ])('rejects unsupported markup: %s', (content) => {
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
  it('does not install partial content when either field is invalid', () => {
    expect(() => installSiteScripts({ headerScripts: '<script src="https://example.com/partial.js"></script>', footerScripts: '<b>invalid</b>' })).toThrow()
    expect(document.querySelector('script[src="https://example.com/partial.js"]')).toBeNull()
  })
})
