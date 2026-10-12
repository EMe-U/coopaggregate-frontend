import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, UserPlus } from 'lucide-react'
import { createBuyer, listBuyers } from '../../api/buyers'
import useDebouncedValue from '../../hooks/useDebouncedValue'
import { formatPhone } from '../../utils/format'
import { RWANDAN_PHONE_PATTERN, cleanPhone } from '../../utils/phone'

const RESULT_COUNT = 8

const inputClass =
  'min-h-12 w-full rounded-lg border border-transparent bg-background px-3 text-base outline-none placeholder:text-muted/70 focus:border-primary focus:ring-2 focus:ring-primary/20'

function NewBuyerForm({ initialName, onCreated, onCancel }) {
  const { t } = useTranslation()
  const [name, setName] = useState(initialName)
  const [phone, setPhone] = useState('')
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [adding, setAdding] = useState(false)

  // A button, not a submit: this sits inside the sale form, and forms cannot be nested.
  async function handleAdd() {
    if (adding) return
    setFormError('')

    const fieldErrors = {}
    if (!name.trim()) fieldErrors.name = t('sales.buyer.errors.nameRequired')
    if (!RWANDAN_PHONE_PATTERN.test(cleanPhone(phone))) fieldErrors.phone = t('sales.buyer.errors.phoneInvalid')
    setErrors(fieldErrors)
    if (Object.keys(fieldErrors).length > 0) return

    setAdding(true)
    try {
      onCreated(await createBuyer({ name: name.trim(), phone: cleanPhone(phone) }))
    } catch (error) {
      setFormError(error.response?.data?.message || t('sales.buyer.errors.generic'))
      setAdding(false)
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-primary/30 bg-primary-light/30 p-3">
      <p className="text-sm font-semibold text-text">{t('sales.buyer.newTitle')}</p>
      {formError && <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{formError}</p>}
      <div>
        <label htmlFor="buyer-name" className="mb-1 block text-xs font-medium text-text">
          {t('sales.buyer.name')}
        </label>
        <input
          id="buyer-name"
          value={name}
          maxLength={150}
          onChange={(event) => setName(event.target.value)}
          className={inputClass}
        />
        {errors.name && <p className="mt-1 text-sm text-danger">{errors.name}</p>}
      </div>
      <div>
        <label htmlFor="buyer-phone" className="mb-1 block text-xs font-medium text-text">
          {t('sales.buyer.phone')}
        </label>
        <input
          id="buyer-phone"
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          className={inputClass}
        />
        {errors.phone ? (
          <p className="mt-1 text-sm text-danger">{errors.phone}</p>
        ) : (
          <p className="mt-1 text-xs text-muted">{t('sales.buyer.phoneHint')}</p>
        )}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={adding}
          className="min-h-11 flex-1 rounded-lg border border-text/10 bg-surface px-3 text-sm font-medium text-text hover:bg-background"
        >
          {t('sales.buyer.cancel')}
        </button>
        <button
          type="button"
          onClick={handleAdd}
          disabled={adding}
          className="min-h-11 flex-1 rounded-lg bg-primary px-3 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60"
        >
          {adding ? t('sales.buyer.adding') : t('sales.buyer.add')}
        </button>
      </div>
    </div>
  )
}

export default function BuyerPicker({ buyer, onChange, disabled }) {
  const { t } = useTranslation()

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search.trim(), 300)
  const [results, setResults] = useState([])
  const [status, setStatus] = useState('idle')
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    if (buyer || adding || debouncedSearch === '') {
      setResults([])
      setStatus('idle')
      return
    }

    let ignore = false
    setStatus('loading')
    listBuyers(debouncedSearch)
      .then((data) => {
        if (ignore) return
        setResults(data.slice(0, RESULT_COUNT))
        setStatus('done')
      })
      .catch(() => {
        if (!ignore) setStatus('error')
      })
    return () => {
      ignore = true
    }
  }, [debouncedSearch, buyer, adding])

  function choose(selected) {
    setSearch('')
    setAdding(false)
    onChange(selected)
  }

  if (buyer) {
    return (
      <div className="flex min-h-12 items-center gap-3 rounded-lg border border-primary/30 bg-primary-light/40 px-3 py-2">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-text">{buyer.name}</p>
          <p className="text-xs text-muted">{formatPhone(buyer.phone)}</p>
        </div>
        {!disabled && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="min-h-11 rounded-lg px-3 text-sm font-medium text-primary hover:bg-primary-light"
          >
            {t('sales.buyer.change')}
          </button>
        )}
      </div>
    )
  }

  if (adding) {
    // A search made of digits is probably a phone number, not a name.
    const initialName = /\d/.test(search) ? '' : search.trim()
    return <NewBuyerForm initialName={initialName} onCreated={choose} onCancel={() => setAdding(false)} />
  }

  return (
    <div className="relative">
      <Search size={18} className="pointer-events-none absolute left-3 top-3.5 text-muted" />
      <input
        id="buyer-search"
        type="search"
        autoComplete="off"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder={t('sales.buyer.placeholder')}
        disabled={disabled}
        className={`${inputClass} pl-10`}
      />

      {status !== 'idle' && (
        <div className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-lg border border-text/10 bg-surface shadow-lg">
          {status === 'loading' && <p className="p-3 text-sm text-muted">{t('sales.buyer.searching')}</p>}
          {status === 'error' && <p className="p-3 text-sm text-danger">{t('sales.buyer.error')}</p>}
          {status === 'done' && results.length === 0 && (
            <p className="p-3 text-sm text-muted">{t('sales.buyer.noResults')}</p>
          )}
          {status === 'done' && results.length > 0 && (
            <ul className="max-h-64 divide-y divide-text/5 overflow-y-auto">
              {results.map((result) => (
                <li key={result.id}>
                  <button
                    type="button"
                    onClick={() => choose(result)}
                    className="block min-h-12 w-full px-3 py-2 text-left hover:bg-background"
                  >
                    <span className="block font-medium text-text">{result.name}</span>
                    <span className="block text-xs text-muted">{formatPhone(result.phone)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {status !== 'loading' && (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="flex min-h-12 w-full items-center gap-2 border-t border-text/5 px-3 text-sm font-medium text-primary hover:bg-primary-light"
            >
              <UserPlus size={16} />
              {t('sales.buyer.addNew')}
            </button>
          )}
        </div>
      )}

      {status === 'idle' && !disabled && (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="mt-1 flex min-h-11 items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          <UserPlus size={15} />
          {t('sales.buyer.addNew')}
        </button>
      )}
    </div>
  )
}
