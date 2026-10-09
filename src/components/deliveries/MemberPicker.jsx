import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Search } from 'lucide-react'
import { listMembers } from '../../api/members'
import useDebouncedValue from '../../hooks/useDebouncedValue'
import { formatPhone } from '../../utils/format'
import Avatar from '../Avatar'

const RESULT_COUNT = 8

export default function MemberPicker({ member, onChange, disabled, error }) {
  const { t } = useTranslation()

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search.trim(), 300)
  const [results, setResults] = useState([])
  const [status, setStatus] = useState('idle')

  useEffect(() => {
    if (member || debouncedSearch === '') {
      setResults([])
      setStatus('idle')
      return
    }

    let ignore = false
    setStatus('loading')
    listMembers({ search: debouncedSearch, active: true, size: RESULT_COUNT })
      .then((data) => {
        if (ignore) return
        setResults(data.content)
        setStatus('done')
      })
      .catch(() => {
        if (!ignore) setStatus('error')
      })

    return () => {
      ignore = true
    }
  }, [debouncedSearch, member])

  function choose(selected) {
    setSearch('')
    onChange(selected)
  }

  if (member) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary-light/40 p-3">
        <Avatar name={member.fullName} />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-text">{member.fullName}</p>
          <p className="text-xs text-muted">
            {member.memberCode} · {formatPhone(member.phone)}
          </p>
        </div>
        {!disabled && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="min-h-11 rounded-lg px-3 text-sm font-medium text-primary hover:bg-primary-light"
          >
            {t('deliveries.member.change')}
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="relative">
      <Search size={18} className="pointer-events-none absolute left-3 top-3.5 text-muted" />
      <input
        id="member-search"
        type="search"
        autoComplete="off"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder={t('deliveries.member.placeholder')}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        className="min-h-12 w-full rounded-lg border border-transparent bg-background py-3 pl-10 pr-3 text-base outline-none placeholder:text-muted/70 focus:border-primary focus:ring-2 focus:ring-primary/20"
      />

      {status !== 'idle' && (
        <div className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-lg border border-text/10 bg-surface shadow-lg">
          {status === 'loading' && <p className="p-3 text-sm text-muted">{t('deliveries.member.searching')}</p>}
          {status === 'error' && <p className="p-3 text-sm text-danger">{t('deliveries.member.error')}</p>}
          {status === 'done' && results.length === 0 && (
            <p className="p-3 text-sm text-muted">{t('deliveries.member.noResults')}</p>
          )}
          {status === 'done' && results.length > 0 && (
            <ul className="max-h-72 divide-y divide-text/5 overflow-y-auto">
              {results.map((result) => (
                <li key={result.id}>
                  <button
                    type="button"
                    onClick={() => choose(result)}
                    className="flex min-h-14 w-full items-center gap-3 px-3 py-2 text-left hover:bg-background"
                  >
                    <Avatar name={result.fullName} />
                    <span className="min-w-0">
                      <span className="block font-medium text-text">{result.fullName}</span>
                      <span className="block text-xs text-muted">
                        {result.memberCode} · {formatPhone(result.phone)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
