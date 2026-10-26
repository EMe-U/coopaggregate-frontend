import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Menu, X } from 'lucide-react'
import usePublicInfo from '../hooks/usePublicInfo'
import LanguageSwitch from './LanguageSwitch'
import Logo from './Logo'

// The public pages share one load of the cooperative info and grades (outlet context), and the
// nav uses it: Grades only when there are grades, Contact only when there is something to show.
export default function PublicLayout() {
  const { t } = useTranslation()
  const { pathname, hash } = useLocation()
  const publicInfo = usePublicInfo()
  // On phones and tablets the links are in a menu opened with a button.
  const [menuOpen, setMenuOpen] = useState(false)
  const headerRef = useRef(null)
  const [scrolled, setScrolled] = useState(false)
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

  useEffect(() => {
    setMenuOpen(false)
  }, [pathname, hash])

  // The nav stays at the top, so a section opened from a link (#grades, #contact) would end up under
  // it. The page's scroll padding follows the nav's real height, which changes with the language and
  // the phone menu.
  useEffect(() => {
    const header = headerRef.current
    const root = document.documentElement
    const observer = new ResizeObserver(() => {
      root.style.scrollPaddingTop = `${header.offsetHeight}px`
    })
    observer.observe(header)
    return () => {
      observer.disconnect()
      root.style.scrollPaddingTop = ''
    }
  }, [])

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 0)
    }
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    if (!menuOpen) return undefined
    function handleKeyDown(event) {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [menuOpen])

  // The same links in the header (wide screens) and in the menu (small screens); only the look differs.
  const links = [
    hasGrades && { to: '/#grades', label: t('publicNav.grades'), section: true },
    { to: '/request', label: t('publicNav.sendRequest') },
    { to: '/status', label: t('publicNav.checkStatus') },
    hasContact && { to: '/#contact', label: t('publicNav.contact'), section: true },
  ].filter(Boolean)

  function renderLinks(layout) {
    const base = layout === 'menu' ? 'flex min-h-12 items-center rounded-lg px-3 text-base' : 'whitespace-nowrap py-2 text-sm'
    return links.map(({ to, label, section }) =>
      section ? (
        <Link key={to} to={to} onClick={() => setMenuOpen(false)} className={`${base} text-muted hover:text-text`}>
          {label}
        </Link>
      ) : (
        <NavLink
          key={to}
          to={to}
          onClick={() => setMenuOpen(false)}
          className={({ isActive }) => `${base} ${isActive ? 'font-semibold text-primary' : 'text-muted hover:text-text'}`}
        >
          {label}
        </NavLink>
      ),
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header ref={headerRef} className={`sticky top-0 z-40 bg-surface transition-shadow ${scrolled ? 'shadow-sm' : ''}`}>
        <div className="mx-auto flex max-w-6xl items-center gap-x-6 px-4 py-2">
          <Link to="/" className="flex min-w-0 items-center gap-2 py-2 text-lg font-bold text-primary">
            <Logo size={32} />
            <span className="truncate">{t('app.name')}</span>
          </Link>
          <nav className="hidden gap-x-6 lg:flex lg:flex-1 lg:justify-center">{renderLinks('bar')}</nav>
          <div className="ml-auto flex items-center gap-1 lg:ml-0">
            <LanguageSwitch />
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-controls="public-menu"
              aria-label={t(menuOpen ? 'publicNav.closeMenu' : 'publicNav.openMenu')}
              className="flex h-11 w-11 items-center justify-center rounded-lg text-text hover:bg-background lg:hidden"
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav id="public-menu" className="border-t border-text/5 px-4 py-2 lg:hidden">
            <div className="mx-auto flex max-w-6xl flex-col">{renderLinks('menu')}</div>
          </nav>
        )}
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
