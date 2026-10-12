import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Eye, HandCoins, Lock, MoreVertical, Split, TriangleAlert } from 'lucide-react'

const MENU_WIDTH = 208

// Only the actions the lot's status allows. Close and loss need a handler from the page.
function actionsFor(lot, { onClose, onRecordLoss }) {
  const hasStock = Number(lot.remainingKg) > 0
  const actions = [{ key: 'view', icon: Eye, path: `/lots/${lot.id}` }]

  if (lot.status === 'OPEN') {
    if (onClose) actions.push({ key: 'close', icon: Lock, run: () => onClose(lot) })
    if (onRecordLoss && hasStock) actions.push({ key: 'recordLoss', icon: TriangleAlert, run: () => onRecordLoss(lot), danger: true })
  }
  if (lot.status === 'CLOSED' && hasStock) {
    actions.push({ key: 'recordSale', icon: HandCoins, path: `/sales?lotId=${lot.id}` })
    if (onRecordLoss) actions.push({ key: 'recordLoss', icon: TriangleAlert, run: () => onRecordLoss(lot), danger: true })
  }
  if (lot.status === 'SOLD') actions.push({ key: 'shareMoney', icon: Split, path: `/share?lotId=${lot.id}` })
  if (lot.status === 'SHARED') actions.push({ key: 'viewShares', icon: Split, path: `/share?lotId=${lot.id}` })
  return actions
}

export default function LotActionsMenu({ lot, onClose, onRecordLoss }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const buttonRef = useRef(null)
  const menuRef = useRef(null)
  const [position, setPosition] = useState(null)

  const open = position !== null
  const actions = actionsFor(lot, { onClose, onRecordLoss })

  function openMenu() {
    // The menu is drawn in a portal with fixed coordinates so the table's scroll container
    // cannot cut it off.
    const rect = buttonRef.current.getBoundingClientRect()
    const left = Math.max(8, Math.min(rect.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8))
    const openUp = rect.bottom + 48 * actions.length + 16 > window.innerHeight
    setPosition(openUp ? { left, bottom: window.innerHeight - rect.top + 4 } : { left, top: rect.bottom + 4 })
  }

  function closeMenu(returnFocus) {
    setPosition(null)
    if (returnFocus) buttonRef.current?.focus()
  }

  useEffect(() => {
    if (!open) return

    menuRef.current?.querySelector('[role="menuitem"]')?.focus()

    function handlePointerDown(event) {
      if (!menuRef.current?.contains(event.target) && !buttonRef.current?.contains(event.target)) closeMenu(false)
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') closeMenu(true)
    }
    // A fixed menu would drift away from its row while the page scrolls, so close it instead.
    function handleScrollOrResize() {
      closeMenu(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('scroll', handleScrollOrResize, true)
    window.addEventListener('resize', handleScrollOrResize)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('scroll', handleScrollOrResize, true)
      window.removeEventListener('resize', handleScrollOrResize)
    }
  }, [open])

  function handleMenuKeyDown(event) {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    event.preventDefault()
    const items = [...menuRef.current.querySelectorAll('[role="menuitem"]')]
    const index = items.indexOf(document.activeElement)
    const next = event.key === 'ArrowDown' ? (index + 1) % items.length : (index - 1 + items.length) % items.length
    items[next].focus()
  }

  function choose(action) {
    closeMenu(false)
    if (action.path) navigate(action.path)
    else action.run()
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={(event) => {
          // Rows open the lot when clicked; the menu button must not.
          event.stopPropagation()
          if (open) closeMenu(false)
          else openMenu()
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('lots.actions.menu', { code: lot.code })}
        className="flex h-11 w-11 items-center justify-center rounded-lg text-muted hover:bg-background hover:text-text"
      >
        <MoreVertical size={18} />
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            aria-label={t('lots.actions.menu', { code: lot.code })}
            onKeyDown={handleMenuKeyDown}
            style={{ ...position, width: MENU_WIDTH }}
            className="fixed z-50 overflow-hidden rounded-lg border border-text/10 bg-surface py-1 shadow-lg"
          >
            {actions.map((action) => {
              const Icon = action.icon
              return (
                <button
                  key={action.key}
                  type="button"
                  role="menuitem"
                  onClick={(event) => {
                    event.stopPropagation()
                    choose(action)
                  }}
                  className={`flex min-h-11 w-full items-center gap-2.5 px-3 text-left text-sm hover:bg-background focus:bg-background focus:outline-none ${
                    action.danger ? 'text-danger' : 'text-text'
                  }`}
                >
                  <Icon size={16} />
                  {t(`lots.actions.${action.key}`)}
                </button>
              )
            })}
          </div>,
          document.body,
        )}
    </>
  )
}
