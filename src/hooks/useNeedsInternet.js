import { useTranslation } from 'react-i18next'
import useOnlineStatus from './useOnlineStatus'

// For buttons that change data on the server: disable them while offline and say why.
// Usage: <button disabled={saving || offline} title={title}>
export default function useNeedsInternet() {
  const { t } = useTranslation()
  const isOnline = useOnlineStatus()
  return { offline: !isOnline, title: isOnline ? undefined : t('offline.needsInternet') }
}
