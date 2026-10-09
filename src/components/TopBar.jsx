import { useTranslation } from 'react-i18next'
import { Menu } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import useOnlineStatus from '../hooks/useOnlineStatus'
import LanguageSwitch from './LanguageSwitch'

export default function TopBar({ onMenuClick }) {
  const { t } = useTranslation()
  const { manager } = useAuth()
  const isOnline = useOnlineStatus()

  return (
    <header className="flex items-center gap-4 bg-surface px-4 py-3 shadow-sm md:px-6 print:hidden">
      <button
        type="button"
        className="text-text md:hidden"
        onClick={onMenuClick}
        aria-label={t('topbar.openMenu')}
      >
        <Menu size={22} />
      </button>

      <span
        className={`rounded-full px-3 py-1 text-xs font-medium ${
          isOnline ? 'bg-primary-light text-primary' : 'bg-danger/10 text-danger'
        }`}
      >
        {isOnline ? t('topbar.online') : t('topbar.offline')}
      </span>

      <div className="ml-auto flex items-center gap-4">
        <LanguageSwitch />
        {manager && (
          <span className="hidden text-sm text-text sm:inline">
            {manager.name} – {t('auth.role')}
          </span>
        )}
      </div>
    </header>
  )
}
