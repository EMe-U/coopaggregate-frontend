import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { saveSettings } from '../api/settings'
import { cleanPhone } from '../utils/phone'

// Every field PUT /api/settings takes. deductionPerKg is read-only, so it is never sent. The
// backend clears the email, location and phone when they are left out, so every save sends them.
const REQUEST_KEYS = [
  'cooperativeEmail',
  'cooperativePhone',
  'location',
  'minOrderKg',
  'smsEnabled',
  'committeeEmails',
]

function clean(value) {
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

// Inputs hold text, the server sends numbers: 100 and "100" are the same value.
function comparable(value) {
  return JSON.stringify(typeof value === 'number' ? String(value) : clean(value ?? null))
}

function pick(source, keys) {
  return Object.fromEntries(keys.map((key) => [key, source?.[key] ?? null]))
}

// One settings section: its own draft of a few fields and its own Save. The backend replaces all
// settings at once, so saving sends the last saved values of every other section with this
// section's draft; unsaved edits in other sections are not sent. A 400 shows the backend's message
// in this section.
export default function useSettingsSection(settings, keys, onSaved) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState(() => pick(settings, keys))
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  const dirty = keys.some((key) => comparable(draft[key]) !== comparable(settings[key]))

  function setField(key, value) {
    setDraft((current) => ({ ...current, [key]: value }))
    setMessage(null)
  }

  async function save() {
    setSaving(true)
    setMessage(null)
    try {
      const request = Object.fromEntries(
        Object.entries({ ...pick(settings, REQUEST_KEYS), ...draft }).map(([key, value]) => [key, clean(value)]),
      )
      // The input holds text such as "150" or "150,5"; the backend expects a number.
      request.minOrderKg = Number(String(request.minOrderKg).replace(',', '.'))
      // A phone may be typed with spaces ("0788 123 456"); the backend wants it without.
      if (request.cooperativePhone) request.cooperativePhone = cleanPhone(request.cooperativePhone)
      const saved = await saveSettings(request)
      onSaved(saved)
      setDraft(pick(saved, keys))
      setMessage({ ok: t('settings.saved') })
    } catch (error) {
      setMessage({ error: error.response?.data?.message || t('settings.saveError') })
    } finally {
      setSaving(false)
    }
  }

  return { draft, setField, dirty, saving, message, save }
}
