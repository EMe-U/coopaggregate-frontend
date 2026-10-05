import { NavLink, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import LanguageSwitch from './LanguageSwitch'

const links = [
  { to: '/', labelKey: 'publicNav.home' },
  { to: '/request', labelKey: 'publicNav.sendRequest' },
  { to: '/status', labelKey: 'publicNav.checkStatus' },
]

export default function PublicLayout() {
  const { t } = useTranslation()

  return (
    <div className="min-h-screen">
      <header className="bg-surface shadow-sm">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-4">
          <span className="text-lg font-bold text-primary">{t('app.name')}</span>
          <nav className="flex flex-wrap gap-4 text-sm">
            {links.map(({ to, labelKey }) => (
              <NavLink
                key={to}
                to={to}
                end
                className={({ isActive }) =>
                  isActive ? 'font-semibold text-primary' : 'text-muted hover:text-text'
                }
              >
                {t(labelKey)}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto">
            <LanguageSwitch />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl p-4 md:p-6">
        <Outlet />
      </main>
    </div>
  )
}
