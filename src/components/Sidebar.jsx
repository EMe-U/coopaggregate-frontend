import { NavLink, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  BookOpen,
  Boxes,
  FileChartColumn,
  Inbox,
  LayoutDashboard,
  LogOut,
  PackagePlus,
  Scale,
  Settings,
  ShoppingCart,
  Split,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const menuItems = [
  { to: '/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { to: '/deliveries/new', labelKey: 'nav.recordDelivery', icon: PackagePlus },
  { to: '/members', labelKey: 'nav.members', icon: Users },
  { to: '/lots', labelKey: 'nav.lots', icon: Boxes },
  { to: '/sales', labelKey: 'nav.sales', icon: ShoppingCart },
  { to: '/share', labelKey: 'nav.share', icon: Split },
  { to: '/payments', labelKey: 'nav.payments', icon: Wallet },
  { to: '/buyer-requests', labelKey: 'nav.buyerRequests', icon: Inbox },
  { to: '/ledger', labelKey: 'nav.ledger', icon: BookOpen },
  { labelKey: 'nav.disputes', icon: Scale, disabled: true },
  { labelKey: 'nav.reports', icon: FileChartColumn, disabled: true },
  { to: '/settings', labelKey: 'nav.settings', icon: Settings },
]

const itemClass = 'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium'

export default function Sidebar({ isOpen, onClose }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { signOut } = useAuth()

  function handleLogout() {
    signOut()
    navigate('/login', { replace: true })
  }

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={onClose} />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-surface shadow-sm transition-transform md:static md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <div>
            <p className="text-lg font-bold text-primary">{t('app.name')}</p>
            <p className="text-xs text-muted">{t('app.cooperative')}</p>
          </div>
          <button
            type="button"
            className="text-muted md:hidden"
            onClick={onClose}
            aria-label={t('topbar.closeMenu')}
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3">
          {menuItems.map(({ to, labelKey, icon: Icon, disabled }) =>
            disabled ? (
              <span key={labelKey} className={`${itemClass} cursor-not-allowed text-muted/60`}>
                <Icon size={18} />
                <span className="flex-1">{t(labelKey)}</span>
                <span className="rounded-full bg-background px-2 py-0.5 text-xs">
                  {t('nav.soon')}
                </span>
              </span>
            ) : (
              <NavLink
                key={to}
                to={to}
                onClick={onClose}
                className={({ isActive }) =>
                  `${itemClass} ${
                    isActive ? 'bg-primary text-white' : 'text-text hover:bg-background'
                  }`
                }
              >
                <Icon size={18} />
                {t(labelKey)}
              </NavLink>
            ),
          )}
        </nav>

        <div className="border-t border-background p-3">
          <button
            type="button"
            onClick={handleLogout}
            className={`${itemClass} w-full text-danger hover:bg-background`}
          >
            <LogOut size={18} />
            {t('nav.logout')}
          </button>
        </div>
      </aside>
    </>
  )
}
