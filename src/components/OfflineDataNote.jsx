import { useTranslation } from 'react-i18next'
import { WifiOff } from 'lucide-react'
import { formatDateTime } from '../utils/format'

// Shown above data that came from the copy saved on this device instead of the server.
export default function OfflineDataNote({ savedAt }) {
  const { t } = useTranslation()
  if (!savedAt) return null

  return (
    <p role="status" className="flex items-start gap-2 rounded-lg bg-text/85 px-4 py-3 text-sm text-white print:hidden">
      <WifiOff size={16} className="mt-0.5 shrink-0" />
      <span>
        {t('offline.cachedData', { time: formatDateTime(savedAt) })}
        <span className="block text-white/80">{t('offline.readOnly')}</span>
      </span>
    </p>
  )
}
