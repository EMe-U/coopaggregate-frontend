import { useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PackagePlus, WifiOff } from 'lucide-react'
import useOnlineStatus from '../hooks/useOnlineStatus'

// Layout route for pages that only work with the server. Opened offline, the page explains why
// instead of showing load errors. A page that was already open stays on screen when the
// connection drops, so nothing typed is lost; its buttons that change data are disabled until
// it comes back.
export default function RequiresInternet() {
  const { t } = useTranslation()
  const isOnline = useOnlineStatus()
  const { pathname } = useLocation()
  // The page that has been shown online. This layout stays mounted while moving between its
  // pages, so a page opened offline is checked again instead of inheriting the last one.
  const [shownPath, setShownPath] = useState(isOnline ? pathname : null)
  if (isOnline && shownPath !== pathname) setShownPath(pathname)

  if (shownPath !== pathname) {
    return (
      <div className="mx-auto max-w-lg rounded-xl bg-surface p-8 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-background text-muted">
          <WifiOff size={22} />
        </div>
        <h1 className="mt-4 text-lg font-semibold text-text">{t('offline.pageNeedsInternet.title')}</h1>
        <p className="mt-1 text-sm text-muted">{t('offline.pageNeedsInternet.message')}</p>
        <Link
          to="/record-delivery"
          className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-white hover:bg-primary/90"
        >
          <PackagePlus size={16} />
          {t('offline.pageNeedsInternet.recordDelivery')}
        </Link>
      </div>
    )
  }

  return (
    <>
      {!isOnline && (
        <p
          role="status"
          className="mb-4 flex items-start gap-2 rounded-lg bg-text/85 px-4 py-3 text-sm text-white print:hidden"
        >
          <WifiOff size={16} className="mt-0.5 shrink-0" />
          {t('offline.pageNeedsInternet.lost')}
        </p>
      )}
      <Outlet />
    </>
  )
}
