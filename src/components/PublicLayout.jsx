import { useEffect } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import LanguageSwitch from './LanguageSwitch'

// Pages are NavLinks; the two sections of the home page (section: true) are links to its anchors.
const links = [
  { to: '/', labelKey: 'publicNav.home' },
  { to: '/#grades', labelKey: 'publicNav.grades', section: true },
  { to: '/request', labelKey: 'publicNav.sendRequest' },
  { to: '/status', labelKey: 'publicNav.checkStatus' },
  { to: '/#contact', labelKey: 'publicNav.contact', section: true },
]

const linkClass = 'whitespace-nowrap py-2 text-sm'

export default function PublicLayout() {
  const { t } = useTranslation()
  const { pathname, hash } = useLocation()

  // A link to /#grades from another page opens the home page and scrolls to the section.
  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0)
      return
    }
    // The section may appear after its data loads, so wait a moment before scrolling.
    const timer = setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' }), 150)
    return () => clearTimeout(timer)
  }, [pathname, hash])

  return (
    <div className="flex min-h-screen flex-col">
      <header className="bg-surface shadow-sm">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-1 px-4 py-2">
          <Link to="/" className="py-2 text-lg font-bold text-primary">
            {t('app.name')}
          </Link>
          <nav className="flex flex-wrap gap-x-5">
            {links.map(({ to, labelKey, section }) =>
              section ? (
                <Link key={to} to={to} className={`${linkClass} text-muted hover:text-text`}>
                  {t(labelKey)}
                </Link>
              ) : (
                <NavLink
                  key={to}
                  to={to}
                  end
                  className={({ isActive }) =>
                    `${linkClass} ${isActive && !hash ? 'font-semibold text-primary' : 'text-muted hover:text-text'}`
                  }
                >
                  {t(labelKey)}
                </NavLink>
              ),
            )}
          </nav>
          <div className="ml-auto">
            <LanguageSwitch />
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="bg-surface py-5 text-center text-xs text-muted">
        {t('publicNav.copyright', { year: new Date().getFullYear(), name: t('app.name') })}
      </footer>
    </div>
  )
}
