import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { History } from 'lucide-react'
import { listSettingsHistory } from '../../api/settings'
import usePageSize from '../../hooks/usePageSize'
import { formatDateTime } from '../../utils/format'
import Pagination from '../Pagination'
import SettingsSection from './SettingsSection'

// The stored details of a skipped-batches entry: "Sale SAL-…: skipped R-…, R-…. Reason: <text>".
const SKIPPED_DETAILS = /^Sale (\S+): skipped (.+?)\. Reason: ([\s\S]*)$/

// Shown in plain words when they can be read, otherwise as stored.
function Details({ entry }) {
  const { t } = useTranslation()
  const skipped = entry.action === 'SALE_FIFO_SKIPPED' && SKIPPED_DETAILS.exec(entry.details)
  if (skipped) {
    return (
      <p className="break-words text-xs text-muted">
        {t('settings.history.details.saleFifoSkipped', { sale: skipped[1], batches: skipped[2], reason: skipped[3] })}
      </p>
    )
  }
  return <p className="break-words font-mono text-xs text-muted">{entry.details}</p>
}

// Changes to settings, grades and the password, new confirmation codes, manager reviews and the
// batches a sale skipped. Passwords and codes are never in it.
export default function RecentChanges({ reloadKey }) {
  const { t } = useTranslation()
  const pageSize = usePageSize()
  const [page, setPage] = useState(0)
  const [result, setResult] = useState(null)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    setPage(0)
  }, [reloadKey])

  useEffect(() => {
    let ignore = false
    setLoadError(false)
    listSettingsHistory({ page, size: pageSize })
      .then((data) => {
        if (!ignore) setResult(data)
      })
      .catch(() => {
        if (!ignore) setLoadError(true)
      })
    return () => {
      ignore = true
    }
  }, [page, pageSize, reloadKey])

  return (
    <SettingsSection icon={History} title={t('settings.history.title')} subtitle={t('settings.history.subtitle')}>
      {loadError && <p className="text-sm text-danger">{t('settings.history.error')}</p>}
      {!loadError && !result && <div className="h-24 animate-pulse rounded-lg bg-background" />}
      {!loadError && result?.content.length === 0 && (
        <p className="py-4 text-center text-sm text-muted">{t('settings.history.empty')}</p>
      )}
      {!loadError && result?.content.length > 0 && (
        <>
          <ul className="divide-y divide-text/5">
            {result.content.map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 py-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-text">
                    {t(`settings.history.actions.${entry.action}`, { defaultValue: entry.action })}
                    {entry.memberId && (
                      <>
                        {' · '}
                        <Link to={`/members/${entry.memberId}`} className="text-primary hover:underline">
                          {entry.memberName}
                        </Link>
                      </>
                    )}
                  </p>
                  {entry.details && <Details entry={entry} />}
                </div>
                <p className="shrink-0 text-xs text-muted">
                  {entry.managerName && `${entry.managerName} · `}
                  {formatDateTime(entry.createdAt)}
                </p>
              </li>
            ))}
          </ul>
          <Pagination result={result} onPageChange={setPage} className="mt-3" />
        </>
      )}
    </SettingsSection>
  )
}
