import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AdsAdmin from '../AdsAdmin'
import { fetchAdsSettings, saveAdsSettings } from '../../../api/ads'

vi.mock('../../../api/ads', () => ({
  EMPTY_SLOTS: { blogList: '', blogArticleTop: '', blogArticleBottom: '', recipeDetail: '' },
  fetchAdsSettings: vi.fn(),
  saveAdsSettings: vi.fn(),
}))
vi.mock('../../../contexts/AdminAuthContext', () => {
  const logout = vi.fn()
  return { useAdminAuth: () => ({ logout }) }
})

describe('AdsAdmin additional ads.txt', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fetchAdsSettings.mockResolvedValue({ enabled: false, clientId: '', slots: {}, additionalAdsTxt: 'example.com, 1, DIRECT' })
    saveAdsSettings.mockImplementation(async (settings) => settings)
  })

  const open = async () => {
    render(<MemoryRouter><AdsAdmin /></MemoryRouter>)
    return screen.findByLabelText('Additional content')
  }

  it('loads, edits and saves content even without a Google publisher id', async () => {
    const field = await open()
    expect(field).toHaveValue('example.com, 1, DIRECT')
    fireEvent.change(field, { target: { value: 'another.com, 2, RESELLER' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))
    await waitFor(() => expect(saveAdsSettings).toHaveBeenCalledWith(expect.objectContaining({ additionalAdsTxt: 'another.com, 2, RESELLER' })))
  })

  it('clears content only when saved', async () => {
    const field = await open()
    fireEvent.click(screen.getByRole('button', { name: 'Clear additional content' }))
    expect(field).toHaveValue('')
    expect(saveAdsSettings).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))
    await waitFor(() => expect(saveAdsSettings).toHaveBeenCalledWith(expect.objectContaining({ additionalAdsTxt: '' })))
  })

  it('imports a text file into the editable content', async () => {
    const field = await open()
    fireEvent.change(screen.getByLabelText('Import ads.txt'), { target: { files: [{ size: 30, text: async () => '# Agency\nexample.com, 2, DIRECT' }] } })
    await waitFor(() => expect(field).toHaveValue('# Agency\nexample.com, 2, DIRECT'))
    expect(saveAdsSettings).not.toHaveBeenCalled()
  })

  it('rejects oversized imports without losing the current content', async () => {
    const field = await open()
    fireEvent.change(screen.getByLabelText('Import ads.txt'), { target: { files: [{ size: 100001 }] } })
    expect(await screen.findByText('The file must be under 100 KB.')).toBeInTheDocument()
    expect(field).toHaveValue('example.com, 1, DIRECT')
  })
})
