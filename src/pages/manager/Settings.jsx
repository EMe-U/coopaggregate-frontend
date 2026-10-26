import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SlidersHorizontal } from 'lucide-react'
import { getSettings } from '../../api/settings'
import PageTitle from '../../components/PageTitle'
import { LedgerIntegritySection, ManagerAccountSection } from '../../components/settings/AccountSections'
import {
  CommitteeEmailsSection,
  CooperativeSection,
  DeductionSection,
  OrdersSection,
  SmsSection,
} from '../../components/settings/GeneralSections'
import GradesSection from '../../components/settings/GradesSection'
import RecentChanges from '../../components/settings/RecentChanges'

// Each section has its own Save. Sections that edit the settings row share the last saved copy,
// so a save in one section never sends another section's unsaved edits.
export default function Settings() {
  const { t } = useTranslation()
  const [settings, setSettings] = useState(null)
  const [loadError, setLoadError] = useState(false)
  const [retryKey, setRetryKey] = useState(0)
  const [historyKey, setHistoryKey] = useState(0)

  useEffect(() => {
    let ignore = false
    setLoadError(false)
    getSettings()
      .then((data) => {
        if (!ignore) setSettings(data)
      })
      .catch(() => {
        if (!ignore) setLoadError(true)
      })
    return () => {
      ignore = true
    }
  }, [retryKey])

  const reloadHistory = () => setHistoryKey((key) => key + 1)

  function handleSaved(saved) {
    setSettings(saved)
    reloadHistory()
  }

  const sectionProps = { settings, onSaved: handleSaved }

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-primary">
          <SlidersHorizontal size={14} />
          {t('settings.eyebrow')}
        </p>
        <PageTitle className="mb-1">{t('settings.title')}</PageTitle>
        <p className="text-sm text-muted">{t('settings.subtitle')}</p>
      </div>

      {loadError && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger"
        >
          {t('settings.loadError')}
          <button type="button" onClick={() => setRetryKey((key) => key + 1)} className="min-h-11 font-medium underline">
            {t('settings.retry')}
          </button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="min-w-0 space-y-6 lg:col-span-3">
          {settings ? (
            <>
              <CooperativeSection {...sectionProps} />
              <DeductionSection settings={settings} />
            </>
          ) : (
            !loadError && <div className="h-64 animate-pulse rounded-xl bg-surface shadow-sm" />
          )}
          <GradesSection onChanged={reloadHistory} />
          {settings && <CommitteeEmailsSection {...sectionProps} />}
        </div>
        <div className="min-w-0 space-y-6 lg:col-span-2">
          {settings && (
            <>
              <SmsSection {...sectionProps} />
              <OrdersSection {...sectionProps} />
            </>
          )}
          <LedgerIntegritySection />
          <ManagerAccountSection onChanged={reloadHistory} />
        </div>
      </div>

      <RecentChanges reloadKey={historyKey} />
    </div>
  )
}
