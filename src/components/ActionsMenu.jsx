import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { MoreVertical } from 'lucide-react'

const MENU_WIDTH = 208

// A ⋮ button with a menu of actions: { key, label, icon, path } to open a page, or
// { key, label, icon, run } to call a function. danger shows the item in red. disabled keeps the
// item in the menu but greyed out, with title saying why; it stays focusable for the arrow keys.
export default function ActionsMenu({ label, actions }) {
  const navigate = useNavigate()
  const buttonRef = useRef(null)
  const menuRef = useRef(null)
  const [position, setPosition] = useState(null)

  const open = position !== null

  function openMenu() {
    // The menu is drawn in a portal with fixed coordinates so a table's scroll container
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
    if (action.disabled) return
    closeMenu(false)
    if (action.path) navigate(action.path)
    else action.run()
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => (open ? closeMenu(false) : openMenu())}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        className="flex h-11 w-11 items-center justify-center rounded-lg border border-text/10 bg-surface text-text hover:bg-background"
      >
        <MoreVertical size={18} />
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            aria-label={label}
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
                  aria-disabled={action.disabled || undefined}
                  title={action.title}
                  onClick={() => choose(action)}
                  className={`flex min-h-11 w-full items-center gap-2.5 px-3 text-left text-sm hover:bg-background focus:bg-background focus:outline-none ${
                    action.danger ? 'text-danger' : 'text-text'
                  } ${action.disabled ? 'cursor-not-allowed opacity-50' : ''}`}
                >
                  <Icon size={16} />
                  {action.label}
                </button>
              )
            })}
          </div>,
          document.body,
        )}
    </>
  )
}
