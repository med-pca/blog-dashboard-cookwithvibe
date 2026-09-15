import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AppSetting } from '../instagram-token/app-setting.entity'
import { UpdateAdsDto } from './dto/update-ads.dto'
import { AdsSettings, AD_PLACEMENTS, DEFAULT_SETTINGS, EMPTY_SLOTS } from './ads.types'

// Single JSON blob in the existing app_settings key/value table — no migration
// needed and the whole config is read/written atomically.
const SETTINGS_KEY = 'adsense_settings'

@Injectable()
export class AdsService {
  private readonly logger = new Logger(AdsService.name)

  constructor(@InjectRepository(AppSetting) private readonly settings: Repository<AppSetting>) {}

  async get(): Promise<AdsSettings> {
    const row = await this.settings.findOne({ where: { key: SETTINGS_KEY } })
    if (!row?.value) return { ...DEFAULT_SETTINGS, slots: { ...EMPTY_SLOTS } }

    try {
      return this.normalise(JSON.parse(row.value))
    } catch {
      // A hand-edited or truncated row must not take the whole site down;
      // fall back to "ads off" and let the admin re-save.
      this.logger.warn('Stored AdSense settings are not valid JSON, falling back to defaults')
      return { ...DEFAULT_SETTINGS, slots: { ...EMPTY_SLOTS } }
    }
  }

  // What the public site is allowed to see. Ads stay off unless they are both
  // enabled and actually configured, so the frontend never injects a script for
  // a half-filled setup.
  async getPublic(): Promise<Pick<AdsSettings, 'enabled' | 'autoAds' | 'clientId' | 'slots'>> {
    const settings = await this.get()
    if (!settings.clientId) {
      return { enabled: false, autoAds: false, clientId: '', slots: { ...EMPTY_SLOTS } }
    }
    if (!settings.enabled) {
      return { enabled: false, autoAds: false, clientId: settings.clientId, slots: { ...EMPTY_SLOTS } }
    }
    return { enabled: settings.enabled, autoAds: settings.autoAds, clientId: settings.clientId, slots: settings.slots }
  }

  // Additional sellers can also be published without a Google publisher id.
  // Deliberately NOT gated on `enabled`: the file has to be reachable for Google
  // to verify the account, which happens before ads are ever switched on.
  async adsTxt(): Promise<string> {
    const { clientId, additionalAdsTxt } = await this.get()
    const googleLine = clientId
      ? `google.com, ${clientId.replace(/^ca-/, '')}, DIRECT, f08c47fec0942fa0\n`
      : ''
    return googleLine + (additionalAdsTxt ? `${additionalAdsTxt}\n` : '')
  }

  async update(dto: UpdateAdsDto): Promise<AdsSettings> {
    const current = await this.get()
    const next = this.normalise({
      enabled: dto.enabled ?? current.enabled,
      autoAds: dto.autoAds ?? current.autoAds,
      clientId: dto.clientId ?? current.clientId,
      additionalAdsTxt: dto.additionalAdsTxt ?? current.additionalAdsTxt,
      headerScripts: dto.headerScripts ?? current.headerScripts,
      footerScripts: dto.footerScripts ?? current.footerScripts,
      slots: { ...current.slots, ...(dto.slots ?? {}) },
    })

    await this.settings.save({ key: SETTINGS_KEY, value: JSON.stringify(next) })
    this.logger.log(`AdSense settings updated (enabled: ${next.enabled}, client: ${next.clientId || 'none'})`)
    return next
  }

  // Keeps the stored shape stable even if placements are added or removed later.
  private normalise(raw: Partial<AdsSettings>): AdsSettings {
    const slots = { ...EMPTY_SLOTS }
    for (const placement of AD_PLACEMENTS) {
      const value = raw.slots?.[placement]
      slots[placement] = typeof value === 'string' ? value.trim() : ''
    }
    return {
      enabled: raw.enabled === true,
      autoAds: raw.autoAds === true,
      headerScripts: typeof raw.headerScripts === 'string' ? raw.headerScripts.trim() : '',
      footerScripts: typeof raw.footerScripts === 'string' ? raw.footerScripts.trim() : '',
      clientId: typeof raw.clientId === 'string' ? raw.clientId.trim() : '',
      additionalAdsTxt: typeof raw.additionalAdsTxt === 'string'
        ? raw.additionalAdsTxt.replace(/\r\n?/g, '\n').trim()
        : '',
      slots,
    }
  }
}
