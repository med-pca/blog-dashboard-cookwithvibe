import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Megaphone, Save, Copy, Check, ExternalLink, AlertCircle, Upload, Trash2 } from 'lucide-react'
import { fetchAdsSettings, saveAdsSettings, EMPTY_SLOTS } from '../../api/ads'
import { useAdminAuth } from '../../contexts/AdminAuthContext'
import { parseSiteScripts } from '../../lib/siteScripts'

const CLIENT_ID_PATTERN = /^ca-pub-\d{16}$/
const SLOT_PATTERN = /^\d{6,20}$/
const MAX_ADS_TXT_LENGTH = 100000

// Mirrors the placements the public site renders; the copy explains where each
// unit shows up so slots are not pasted into the wrong box.
const PLACEMENTS = [
  {
    key: 'blogList',
    label: 'Blog list',
    where: 'Between the cards on the Blog page',
    hint: 'A wide banner works best here.',
  },
  {
    key: 'blogArticleTop',
    label: 'Article — top',
    where: 'Under the header of a blog post, before the text',
    hint: 'Highest visibility placement.',
  },
  {
    key: 'blogArticleBottom',
    label: 'Article — bottom',
    where: 'At the end of a blog post, before the related posts',
    hint: 'Good for readers who finish the article.',
  },
  {
    key: 'recipeDetail',
    label: 'Recipe detail',
    where: 'Inside a recipe guide page, after the intro',
    hint: 'Leave empty to keep recipe pages ad-free.',
  },
]

const INPUT =
  'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#448834]/30 focus:border-[#448834]'

export default function AdsAdmin() {
  const { logout } = useAdminAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({ enabled: false, clientId: '', additionalAdsTxt: '', headerScripts: '', footerScripts: '', slots: { ...EMPTY_SLOTS } })
  const importInput = useRef(null)
  const [importing, setImporting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetchAdsSettings()
      .then((data) => setForm({ additionalAdsTxt: '', headerScripts: '', footerScripts: '', ...data, slots: { ...EMPTY_SLOTS, ...data.slots } }))
      .catch((err) => {
        if (err.status === 401) {
          logout()
          navigate('/rnl-panel/login')
        } else {
          setError(err.message)
        }
      })
      .finally(() => setLoading(false))
  }, [logout, navigate])

  const setSlot = (key, value) =>
    setForm((f) => ({ ...f, slots: { ...f.slots, [key]: value.trim() } }))

  const clientIdValid = !form.clientId || CLIENT_ID_PATTERN.test(form.clientId)
  const invalidSlots = PLACEMENTS.filter(
    (p) => form.slots[p.key] && !SLOT_PATTERN.test(form.slots[p.key]),
  )
  const filledSlots = PLACEMENTS.filter((p) => form.slots[p.key]).length
  const canSave = clientIdValid && invalidSlots.length === 0 && !saving && !importing

  // The publisher id without the "ca-" prefix is what ads.txt expects.
  const adsTxtLine = form.clientId
    ? `google.com, ${form.clientId.replace(/^ca-/, '')}, DIRECT, f08c47fec0942fa0`
    : ''
  const adsTxtContent = [adsTxtLine, form.additionalAdsTxt.replace(/\r\n?/g, '\n').trim()]
    .filter(Boolean).join('\n')

  const importAdsTxt = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setError('')
    setSaved(false)
    setImporting(true)
    try {
      if (file.size > MAX_ADS_TXT_LENGTH) throw new Error('The file must be under 100 KB.')
      const content = await file.text()
      setForm((f) => ({ ...f, additionalAdsTxt: content }))
    } catch (err) {
      setError(err.message || 'Could not read the file')
    } finally {
      setImporting(false)
    }
  }

  const copyAdsTxt = async () => {
    try {
      await navigator.clipboard.writeText(adsTxtContent ? `${adsTxtContent}\n` : '')
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Permission denied or old browser — fail silently, the text stays selectable
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSaved(false)
    setSaving(true)
    try {
      parseSiteScripts(form.headerScripts)
      parseSiteScripts(form.footerScripts)
      const next = await saveAdsSettings(form)
      setForm({ headerScripts: '', footerScripts: '', ...next, slots: { ...EMPTY_SLOTS, ...next.slots } })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="text-center py-20 text-gray-400">Loading...</div>
  }

  return (
    <main className="max-w-3xl mx-auto px-6 py-8">
      <div className="flex items-center gap-3 mb-1">
        <Megaphone size={20} className="text-[#448834]" />
        <h1 className="text-xl font-bold text-gray-900">Google AdSense</h1>
      </div>
      <p className="text-sm text-gray-400 mb-6">
        Paste your publisher id and ad unit slots here. Changes go live on the
        site immediately — no redeploy needed.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Master switch */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, enabled: !f.enabled }))}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                form.enabled ? 'bg-[#448834]' : 'bg-gray-200'
              }`}
              aria-label="Toggle ads"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  form.enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <div>
              <p className="text-sm font-semibold text-gray-800">
                {form.enabled ? 'Ads are on' : 'Ads are off'}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {form.enabled
                  ? `${filledSlots} of ${PLACEMENTS.length} placements filled in`
                  : 'The AdSense script is not loaded for visitors while this is off.'}
              </p>
            </div>
          </div>

          {form.enabled && !form.clientId && (
            <p className="flex items-start gap-2 text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mt-4">
              <AlertCircle size={14} className="shrink-0 mt-px" />
              Ads stay hidden until a publisher id is filled in below.
            </p>
          )}
        </div>

        {/* Publisher id */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Publisher ID
          </label>
          <input
            value={form.clientId}
            onChange={(e) => setForm((f) => ({ ...f, clientId: e.target.value.trim() }))}
            className={INPUT}
            placeholder="ca-pub-1234567890123456"
            autoComplete="off"
            spellCheck={false}
          />
          <p className="text-xs text-gray-400 mt-1.5">
            Found in AdSense under Account → Settings → Account information.
          </p>
          {!clientIdValid && (
            <p className="text-xs text-red-500 mt-1.5">
              Must look like ca-pub- followed by 16 digits.
            </p>
          )}
        </div>

        {/* Slots */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-5">
          <div>
            <p className="text-sm font-semibold text-gray-800">Ad placements</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Paste the numeric slot id of an ad unit. Leave a box empty to hide
              that placement.
            </p>
          </div>

          {PLACEMENTS.map((p) => {
            const value = form.slots[p.key]
            const invalid = value && !SLOT_PATTERN.test(value)
            return (
              <div key={p.key}>
                <label className="block text-sm font-medium text-gray-700">{p.label}</label>
                <p className="text-xs text-gray-400 mb-1.5">{p.where}</p>
                <input
                  value={value}
                  onChange={(e) => setSlot(p.key, e.target.value)}
                  className={INPUT}
                  placeholder="1234567890"
                  inputMode="numeric"
                  autoComplete="off"
                  spellCheck={false}
                />
                <p className={`text-xs mt-1.5 ${invalid ? 'text-red-500' : 'text-gray-400'}`}>
                  {invalid ? 'Slot ids are digits only.' : p.hint}
                </p>
              </div>
            )
          })}
        </div>

        <section className="border-t border-gray-200 pt-5 space-y-3" aria-label="ads.txt">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-gray-800">ads.txt</h2>
            <a href="/ads.txt" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-[#448834] hover:underline">
              /ads.txt <ExternalLink size={14} />
            </a>
          </div>
          {adsTxtLine && <code className="block text-xs text-gray-600 break-all">{adsTxtLine}</code>}
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="additional-ads-txt" className="text-sm font-medium text-gray-700">Additional content</label>
            <div className="flex shrink-0 gap-1">
              <input ref={importInput} type="file" accept=".txt,text/plain" className="hidden"
                aria-label="Import ads.txt" onChange={importAdsTxt} disabled={saving || importing} />
              <button type="button" title="Import .txt file" aria-label="Import .txt file"
                disabled={saving || importing} onClick={() => importInput.current?.click()}
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-40"><Upload size={16} /></button>
              <button type="button" title="Clear additional content" aria-label="Clear additional content"
                disabled={saving || importing || !form.additionalAdsTxt}
                onClick={() => { setForm((f) => ({ ...f, additionalAdsTxt: '' })); setSaved(false) }}
                className="p-2 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"><Trash2 size={16} /></button>
              <button type="button" title="Copy complete ads.txt" aria-label="Copy complete ads.txt"
                onClick={copyAdsTxt} disabled={!adsTxtContent}
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-40">
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
          </div>
          <textarea id="additional-ads-txt" rows={12} maxLength={MAX_ADS_TXT_LENGTH}
            value={form.additionalAdsTxt} disabled={saving || importing} spellCheck={false}
            onChange={(e) => { setForm((f) => ({ ...f, additionalAdsTxt: e.target.value })); setSaved(false) }}
            className="w-full min-w-0 resize-y border border-gray-200 rounded-lg p-3 text-xs font-mono leading-5 focus:outline-none focus:ring-2 focus:ring-[#448834]/30 focus:border-[#448834]" />
          <p className="text-right text-xs text-gray-400">{form.additionalAdsTxt.length.toLocaleString()} / 100,000</p>
        </section>

        <section className="border-t border-gray-200 pt-5 space-y-4" aria-label="Site scripts">
          <h2 className="text-sm font-semibold text-gray-800">Site scripts</h2>
          {[
            ['headerScripts', 'Header scripts'],
            ['footerScripts', 'Footer scripts'],
          ].map(([key, label]) => (
            <div key={key}>
              <div className="flex items-center justify-between gap-2 mb-2">
                <label htmlFor={key} className="text-sm font-medium text-gray-700">{label}</label>
                <button type="button" title={`Clear ${label.toLowerCase()}`} aria-label={`Clear ${label.toLowerCase()}`}
                  disabled={saving || !form[key]}
                  onClick={() => { setForm((f) => ({ ...f, [key]: '' })); setSaved(false) }}
                  className="p-2 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-40">
                  <Trash2 size={16} />
                </button>
              </div>
              <textarea id={key} rows={5} maxLength={20000} value={form[key]} disabled={saving}
                spellCheck={false} autoCapitalize="off" autoCorrect="off"
                placeholder={'<script src="https://example.com/script.js" async></script>'}
                onChange={(e) => { setForm((f) => ({ ...f, [key]: e.target.value })); setSaved(false) }}
                className="w-full min-w-0 resize-y border border-gray-200 rounded-lg p-3 text-xs font-mono leading-5 focus:outline-none focus:ring-2 focus:ring-[#448834]/30 focus:border-[#448834]" />
            </div>
          ))}
        </section>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3">{error}</div>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={!canSave}
            className="inline-flex items-center gap-2 bg-[#448834] hover:bg-[#357228] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-6 py-3 rounded-xl transition-colors text-sm"
          >
            <Save size={16} />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          {saved && <span className="text-sm text-[#448834] font-medium">Saved</span>}
          <a
            href="https://www.google.com/adsense/"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors"
          >
            Open AdSense
            <ExternalLink size={14} />
          </a>
        </div>
      </form>
    </main>
  )
}
