import { useEffect } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import usePublicInfo from '../hooks/usePublicInfo'
import LanguageSwitch from './LanguageSwitch'
import Logo from './Logo'

const linkClass = 'whitespace-nowrap py-2 text-sm'

// The public pages share one load of the cooperative info and grades (outlet context), and the
// nav uses it: Grades only when there are grades, Contact only when there is something to show.
export default function PublicLayout() {
  const { t } = useTranslation()
  const { pathname, hash } = useLocation()
  const publicInfo = usePublicInfo()
  const cooperative = publicInfo.info.data
  const hasGrades = (publicInfo.grades.data?.length ?? 0) > 0
  const hasContact = Boolean(cooperative?.location || cooperative?.cooperativeEmail || cooperative?.cooperativePhone)

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

  const pageLinkClass = ({ isActive }) =>
    `${linkClass} ${isActive ? 'font-semibold text-primary' : 'text-muted hover:text-text'}`

  return (
    <div className="flex min-h-screen flex-col">
      <header className="bg-surface shadow-sm">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-1 px-4 py-2">
          <Link to="/" className="flex items-center gap-2 py-2 text-lg font-bold text-primary">
            <Logo size={32} />
            {t('app.name')}
          </Link>
          <nav className="flex flex-wrap gap-x-6 md:flex-1 md:justify-center">
            {hasGrades && (
              <Link to="/#grades" className={`${linkClass} text-muted hover:text-text`}>
                {t('publicNav.grades')}
              </Link>
            )}
            <NavLink to="/request" className={pageLinkClass}>
              {t('publicNav.sendRequest')}
            </NavLink>
            <NavLink to="/status" className={pageLinkClass}>
              {t('publicNav.checkStatus')}
            </NavLink>
            {hasContact && (
              <Link to="/#contact" className={`${linkClass} text-muted hover:text-text`}>
                {t('publicNav.contact')}
              </Link>
            )}
          </nav>
          <div className="ml-auto md:ml-0">
            <LanguageSwitch />
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet context={publicInfo} />
      </main>

      <footer className="bg-surface px-4 py-5 text-center text-xs text-muted">
        <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
          <Logo size={20} />
          <span className="font-medium text-text">{cooperative?.cooperativeName ?? t('app.cooperative')}</span>
          {cooperative?.location && <span>· {cooperative.location}</span>}
        </p>
        <p className="mt-1">{t('publicNav.copyright', { year: new Date().getFullYear(), name: t('app.name') })}</p>
      </footer>
    </div>
  )
}
