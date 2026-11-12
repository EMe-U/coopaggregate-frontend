import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown } from 'lucide-react'

const MENU_MIN_WIDTH = 176

// The nearest element that scrolls (the app's main area), or the page itself.
function scrollParent(element) {
  for (let node = element.parentElement; node; node = node.parentElement) {
    if (/(auto|scroll)/.test(getComputedStyle(node).overflowY) && node.scrollHeight > node.clientHeight) return node
  }
  return document.scrollingElement
}

// A filter shown as plain text with a chevron: "Status ⌄", or "Status: Sold ⌄" when the value is
// not the default. It opens a small menu of options; the current one has a check. options is
// [{ value, label }]; value and defaultValue are compared as strings.
// Keyboard: Enter, Space or the arrow keys open it; in the menu the arrow keys, Home and End move,
// Enter or Space chooses, Escape and Tab close it and return to the filter.
export default function FilterMenu({ name, options, value, defaultValue, onChange, valueLabel }) {
  const buttonRef = useRef(null)
  const menuRef = useRef(null)
  const openedAt = useRef(0)
  const menuId = useId()
  const [position, setPosition] = useState(null)
  const open = position !== null

  const current = options.find((option) => String(option.value) === String(value))
  const isDefault = String(value) === String(defaultValue)
  const text = isDefault || !current ? name : valueLabel(name, current.label)

  function openMenu(focusLast = false) {
    // Drawn in a portal with fixed coordinates, so the card's rounded, clipped corners cannot cut
    // it off. It always opens under the filter, lined up with its right edge: when the screen has
    // no room below, the page scrolls up just enough first.
    const needed = Math.min(44 * options.length + 8, window.innerHeight * 0.6) + 12
    const shortBy = buttonRef.current.getBoundingClientRect().bottom + needed - window.innerHeight
    if (shortBy > 0) {
      scrollParent(buttonRef.current)?.scrollBy({ top: shortBy, behavior: 'instant' })
      openedAt.current = performance.now()
    }
    const rect = buttonRef.current.getBoundingClientRect()
    setPosition({ right: Math.max(8, window.innerWidth - rect.right), top: rect.bottom + 4, focusLast })
  }

  function closeMenu(returnFocus) {
    setPosition(null)
    if (returnFocus) buttonRef.current?.focus()
  }

  useEffect(() => {
    if (!open) return

    // Start on the current option (or the last one when opened with the up arrow).
    const items = [...menuRef.current.querySelectorAll('[role="menuitemradio"]')]
    const checked = items.find((item) => item.getAttribute('aria-checked') === 'true')
    ;(position.focusLast ? items.at(-1) : checked ?? items[0])?.focus()

    function handlePointerDown(event) {
      if (!menuRef.current?.contains(event.target) && !buttonRef.current?.contains(event.target)) closeMenu(false)
    }
    // A fixed menu would drift away from its filter while the page scrolls, so close it instead.
    // The scroll made to fit the menu arrives just after it opens and must not close it.
    function handleScrollOrResize(event) {
      if (menuRef.current?.contains(event.target)) return
      if (event.type === 'scroll' && performance.now() - openedAt.current < 150) return
      closeMenu(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('scroll', handleScrollOrResize, true)
    window.addEventListener('resize', handleScrollOrResize)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('scroll', handleScrollOrResize, true)
      window.removeEventListener('resize', handleScrollOrResize)
    }
    // Only when it opens; position.focusLast is read once.
  }, [open])

  function handleButtonKeyDown(event) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      openMenu(event.key === 'ArrowUp')
    }
  }

  function handleMenuKeyDown(event) {
    const items = [...menuRef.current.querySelectorAll('[role="menuitemradio"]')]
    const index = items.indexOf(document.activeElement)
    let next = null
    if (event.key === 'ArrowDown') next = (index + 1) % items.length
    else if (event.key === 'ArrowUp') next = (index - 1 + items.length) % items.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = items.length - 1
    else if (event.key === 'Escape' || event.key === 'Tab') {
      event.preventDefault()
      closeMenu(true)
      return
    }
    if (next === null) return
    event.preventDefault()
    items[next].focus()
  }

  function choose(option) {
    closeMenu(true)
    if (String(option.value) !== String(value)) onChange(option.value)
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => (open ? closeMenu(false) : openMenu())}
        onKeyDown={handleButtonKeyDown}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={current ? valueLabel(name, current.label) : name}
        className={`inline-flex min-h-11 items-center gap-1 rounded-md px-2 text-sm font-medium outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-primary/30 ${
          isDefault ? 'text-text' : 'text-primary'
        }`}
      >
        <span className="whitespace-nowrap">{text}</span>
        <ChevronDown size={16} aria-hidden="true" className={`shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-label={name}
            onKeyDown={handleMenuKeyDown}
            style={{ right: position.right, top: position.top, bottom: position.bottom, minWidth: MENU_MIN_WIDTH }}
            className="fixed z-50 max-h-[60vh] max-w-[calc(100vw-16px)] overflow-y-auto rounded-lg border border-text/10 bg-surface py-1 shadow-lg"
          >
            {options.map((option) => {
              const checked = String(option.value) === String(value)
              return (
                <button
                  key={option.value}
                  type="button"
                  role="menuitemradio"
                  aria-checked={checked}
                  tabIndex={-1}
                  onClick={() => choose(option)}
                  className={`flex min-h-11 w-full items-center gap-2.5 px-3 text-left text-sm hover:bg-background focus:bg-background focus:outline-none ${
                    checked ? 'font-semibold text-primary' : 'text-text'
                  }`}
                >
                  <Check size={16} aria-hidden="true" className={`shrink-0 ${checked ? '' : 'invisible'}`} />
                  {option.label}
                </button>
              )
            })}
          </div>,
          document.body,
        )}
    </>
  )
}
