import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Upload, X } from 'lucide-react'
import {
  fetchAllBlogPosts,
  fetchAllProjects,
  createBlogPost,
  updateBlogPost,
  uploadBlogCover,
} from '../../api/admin'
import RichTextEditor from '../../components/RichTextEditor'
import { API } from '../../api/config.js'
import { SITE_DOMAIN } from '../../lib/site'

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export default function BlogForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)
  const coverInputRef = useRef(null)

  // Recipe fields are held as strings here — an empty number input gives '' and
  // has to stay distinguishable from 0, and the ingredient list is edited as
  // one line per ingredient. Both are converted in buildPayload() on submit.
  const [form, setForm] = useState({
    title: '',
    slug: '',
    excerpt: '',
    metaDescription: '',
    content: '',
    collectionId: '',
    published: false,
    prepMinutes: '',
    cookMinutes: '',
    servings: '',
    equipment: '',
    ingredients: '',
  })
  const [collections, setCollections] = useState([])
  const [coverPreview, setCoverPreview] = useState(null)
  const [coverFile, setCoverFile] = useState(null)
  const [slugManual, setSlugManual] = useState(false)
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Koleksiyon seçimi için tüm projeler (taslaklar dahil): yazı, koleksiyon
  // yayına alınmadan da bağlanabilsin. Liste alınamazsa seçim kapalı kalır.
  useEffect(() => {
    fetchAllProjects()
      .then(setCollections)
      .catch(() => setCollections([]))
  }, [])

  useEffect(() => {
    if (!isEdit) return
    fetchAllBlogPosts().then((posts) => {
      const post = posts.find((p) => p.id === id)
      if (!post) { navigate('/rnl-panel/blog'); return }
      setForm({
        title: post.title || '',
        slug: post.slug || '',
        excerpt: post.excerpt || '',
        metaDescription: post.metaDescription || '',
        content: post.content || '',
        collectionId: post.collectionId || '',
        published: post.published || false,
        prepMinutes: post.prepMinutes ?? '',
        cookMinutes: post.cookMinutes ?? '',
        servings: post.servings ?? '',
        equipment: post.equipment || '',
        ingredients: (post.ingredients || []).join('\n'),
      })
      if (post.coverImage) setCoverPreview(`${API}${post.coverImage}`)
      setSlugManual(true)
      setLoading(false)
    })
  }, [id, isEdit, navigate])

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }))

  const handleTitleChange = (val) => {
    set('title', val)
    if (!slugManual) set('slug', slugify(val))
  }

  const handleCoverChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setCoverFile(file)
    setCoverPreview(URL.createObjectURL(file))
  }

  const removeCover = () => {
    setCoverFile(null)
    setCoverPreview(null)
    if (coverInputRef.current) coverInputRef.current.value = ''
  }

  // Form strings -> API shape. A cleared number field sends null so the column
  // is actually cleared, rather than 0 (which the DTO would reject for servings
  // and which would read as "no cooking time" for the other two).
  const buildPayload = () => {
    const num = (value) => (String(value).trim() === '' ? null : Number(value))
    return {
      ...form,
      prepMinutes: num(form.prepMinutes),
      cookMinutes: num(form.cookMinutes),
      servings: num(form.servings),
      equipment: form.equipment.trim() || null,
      ingredients: form.ingredients
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean),
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.title.trim()) { setError('Title is required.'); return }
    if (!form.slug.trim()) { setError('Slug is required.'); return }
    if (!form.content.trim()) { setError('Content is required.'); return }

    const payload = buildPayload()
    setSaving(true)
    try {
      let post
      if (isEdit) {
        // Upload a manually selected cover before publication. The backend can
        // then see it and will not spend an AI image call unnecessarily.
        if (coverFile) {
          await uploadBlogCover(id, coverFile)
          setCoverFile(null)
        }
        post = await updateBlogPost(id, payload)
      } else {
        post = await createBlogPost(payload)
        if (coverFile) await uploadBlogCover(post.id, coverFile)
      }
      navigate('/rnl-panel/blog')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-5 h-5 border-2 border-[#b33b62] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <main className="max-w-3xl mx-auto px-6 py-8">
      <button
        onClick={() => navigate('/rnl-panel/blog')}
        className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-700 mb-6 transition-colors"
      >
        <ArrowLeft size={16} />
        Blog Posts
      </button>

      <h1 className="text-xl font-bold text-gray-900 mb-6">
        {isEdit ? 'Edit Post' : 'New Blog Post'}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Title *</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Post title"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#b33b62]/30 focus:border-[#b33b62]"
          />
        </div>

        {/* Slug */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Slug *</label>
          <input
            type="text"
            value={form.slug}
            onChange={(e) => { setSlugManual(true); set('slug', e.target.value) }}
            placeholder="url-adresi"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#b33b62]/30 focus:border-[#b33b62]"
          />
          <p className="text-xs text-gray-400 mt-1">{SITE_DOMAIN}/recipes/{form.slug || '...'}</p>
        </div>

        {/* Summary */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Short Summary</label>
          <textarea
            value={form.excerpt}
            onChange={(e) => set('excerpt', e.target.value)}
            placeholder="Short description shown in the blog list (optional)"
            rows={2}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#b33b62]/30 focus:border-[#b33b62]"
          />
        </div>

        {/* Meta Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Meta Description <span className="text-gray-400 font-normal">(Google arama sonucu)</span></label>
          <textarea
            value={form.metaDescription}
            onChange={(e) => set('metaDescription', e.target.value)}
            placeholder="If left empty the short summary is used. Max 160 characters recommended."
            rows={2}
            maxLength={160}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#b33b62]/30 focus:border-[#b33b62]"
          />
          <p className="text-xs text-gray-400 mt-1">{form.metaDescription.length}/160</p>
        </div>

        {/* Collection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Collection</label>
          <select
            value={form.collectionId}
            onChange={(e) => set('collectionId', e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#b33b62]/30 focus:border-[#b33b62]"
          >
            <option value="">No collection</option>
            {collections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.published ? '' : ' (taslak)'}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-400 mt-1">
            The post is listed on this collection&apos;s page. Leave empty to keep it in the blog only.
          </p>
        </div>

        {/* Recipe details — prefilled by the AI pipeline at generation time.
            Left empty for technique and planning articles, which then render
            without the "At a glance" and "Ingredients" panels on the site. */}
        <fieldset className="border border-gray-200 rounded-xl p-5 space-y-4">
          <legend className="px-2 text-sm font-medium text-gray-700">
            Recipe details <span className="text-gray-400 font-normal">(shown on the recipe page)</span>
          </legend>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Prep (min)</label>
              <input
                type="number"
                min="0"
                max="2880"
                value={form.prepMinutes}
                onChange={(e) => set('prepMinutes', e.target.value)}
                placeholder="10"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#b33b62]/30 focus:border-[#b33b62]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Cook (min)</label>
              <input
                type="number"
                min="0"
                max="2880"
                value={form.cookMinutes}
                onChange={(e) => set('cookMinutes', e.target.value)}
                placeholder="40"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#b33b62]/30 focus:border-[#b33b62]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Serves</label>
              <input
                type="number"
                min="1"
                max="100"
                value={form.servings}
                onChange={(e) => set('servings', e.target.value)}
                placeholder="4"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#b33b62]/30 focus:border-[#b33b62]"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Equipment</label>
            <input
              type="text"
              maxLength={120}
              value={form.equipment}
              onChange={(e) => set('equipment', e.target.value)}
              placeholder="One roasting tray"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#b33b62]/30 focus:border-[#b33b62]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Ingredients</label>
            <textarea
              value={form.ingredients}
              onChange={(e) => set('ingredients', e.target.value)}
              placeholder={'6 bone-in, skin-on chicken thighs\n800 g small waxy potatoes\n3 tbsp olive oil'}
              rows={8}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-[#b33b62]/30 focus:border-[#b33b62]"
            />
            <p className="text-xs text-gray-400 mt-1">
              One ingredient per line, with its quantity. Check these against the article
              body before publishing — {form.ingredients.split('\n').filter((l) => l.trim()).length}/60 lines.
            </p>
          </div>
        </fieldset>

        {/* Cover Image */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Cover Image</label>
          {coverPreview ? (
            <div className="relative w-full h-52 rounded-xl overflow-hidden group">
              <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={removeCover}
                className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1.5 transition-colors opacity-0 group-hover:opacity-100"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              className="w-full h-36 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-[#b33b62] hover:text-[#b33b62] transition-colors"
            >
              <Upload size={22} />
              <span className="text-sm">Upload cover image</span>
            </button>
          )}
          <input
            ref={coverInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleCoverChange}
            className="hidden"
          />
        </div>

        {/* Content */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Content *</label>
          <RichTextEditor value={form.content} onChange={(val) => set('content', val)} />
        </div>

        {/* Publish status */}
        <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3.5">
          <button
            type="button"
            onClick={() => set('published', !form.published)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              form.published ? 'bg-[#b33b62]' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                form.published ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <div>
            <p className="text-sm font-medium text-gray-700">
              {form.published ? 'Published' : 'Taslak'}
            </p>
            <p className="text-xs text-gray-400">
              {form.published ? 'The post is visible to everyone' : 'Only admins can see it'}
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3">{error}</div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 bg-[#b33b62] hover:bg-[#8e2c4d] disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors text-sm"
          >
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Post'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/rnl-panel/blog')}
            className="px-6 py-3 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </main>
  )
}
