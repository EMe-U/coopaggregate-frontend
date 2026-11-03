import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ShieldAlert, UserPlus, Users, X } from 'lucide-react'
import { getIdentityVerificationStatus, getMemberSummary, startIdentityVerification } from '../../api/members'
import OfflineDataNote from '../../components/OfflineDataNote'
import PageTitle from '../../components/PageTitle'
import EmptyState from '../../components/EmptyState'
import Pagination from '../../components/Pagination'
import MemberSummaryCards from '../../components/members/MemberSummaryCards'
import MemberTable from '../../components/members/MemberTable'
import MemberFilters from '../../components/members/MemberFilters'
import MemberFormModal from '../../components/members/MemberFormModal'
import SuccessToast from '../../components/SuccessToast'
import useDebouncedValue from '../../hooks/useDebouncedValue'
import useNeedsInternet from '../../hooks/useNeedsInternet'
import useOnlineStatus from '../../hooks/useOnlineStatus'
import usePageSize from '../../hooks/usePageSize'
import { loadMembersPage, loadWithCache } from '../../offline/cache'
import { takeVerification, verificationErrorMessage, verificationExpired } from '../../members/identityVerification'

const ACTIVE_PARAM = { all: undefined, active: true, inactive: false }

export default function Members() {
  const { t } = useTranslation()
  const pageSize = usePageSize()
  const isOnline = useOnlineStatus()
  const needsInternet = useNeedsInternet()

  const [summary, setSummary] = useState(null)
  const [summaryError, setSummaryError] = useState(false)

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const debouncedSearch = useDebouncedValue(search.trim(), 300)

  const [page, setPage] = useState(0)
  const [result, setResult] = useState(null)
  // Set when the list comes from the copy saved on this device.
  const [savedAt, setSavedAt] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  // form is null when closed; form.member is null when adding a new member.
  const [form, setForm] = useState(null)

  // Why the last registration attempt stopped: a cancelled or failed identity check, an expired
  // verification, and so on. Shown above the list until closed or a new attempt starts.
  const [registrationError, setRegistrationError] = useState('')
  // { available } from the backend; null until it answers. Without verification nobody can be added.
  const [identity, setIdentity] = useState(null)
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    if (!isOnline) return undefined
    let ignore = false
    getIdentityVerificationStatus()
      .then((status) => {
        if (!ignore) setIdentity(status)
      })
      .catch(() => {})
    return () => {
      ignore = true
    }
  }, [isOnline])
  const registrationBlocked = identity?.available === false

  // Back from the identity check (see MemberVerifyCallback): open the form with the verification,
  // or show why there is none. Read once, then removed from the history entry; the ref keeps a
  // second effect run from finding the verification already taken.
  const location = useLocation()
  const navigate = useNavigate()
  const handledReturn = useRef(false)
  useEffect(() => {
    const registration = location.state?.registration
    if (!registration || handledReturn.current) return
    handledReturn.current = true
    navigate(location.pathname, { replace: true, state: null })
    if (registration.error) {
      setRegistrationError(registration.error)
      return
    }
    const verification = takeVerification()
    if (!verification) setRegistrationError(t('memberVerification.errors.startAgain'))
    else if (verificationExpired(verification)) setRegistrationError(t('memberVerification.errors.expired'))
    else setForm({ member: null, verification })
  }, [location, navigate, t])

  async function handleAdd() {
    setStarting(true)
    setRegistrationError('')
    try {
      const started = await startIdentityVerification()
      window.location.assign(started.authorizationUrl)
      return
    } catch (error) {
      setRegistrationError(verificationErrorMessage(t, error))
    }
    setStarting(false)
  }

  // The form gave up its verification (expired, used, refused): close it and say why.
  const handleVerificationGone = useCallback((message) => {
    setForm(null)
    setRegistrationError(message)
  }, [])

  const [notice, setNotice] = useState('')
  const clearNotice = useCallback(() => setNotice(''), [])

  const loadSummary = useCallback(() => {
    setSummaryError(false)
    loadWithCache('memberSummary', getMemberSummary)
      .then(({ data }) => setSummary(data))
      .catch(() => setSummaryError(true))
  }, [])

  useEffect(() => {
    loadSummary()
  }, [loadSummary, isOnline])

  useEffect(() => {
    // Ignore a slow response if the search, filter or page changed before it arrived.
    let ignore = false
    setLoading(true)
    setLoadError(false)

    loadMembersPage({ page, size: pageSize, search: debouncedSearch, active: ACTIVE_PARAM[status] })
      .then((data) => {
        if (ignore) return
        setResult(data.result)
        setSavedAt(data.savedAt)
      })
      .catch(() => {
        if (!ignore) setLoadError(true)
      })
      .finally(() => {
        if (!ignore) setLoading(false)
      })

    return () => {
      ignore = true
    }
  }, [debouncedSearch, status, page, pageSize, reloadKey, isOnline])

  function handleSearchChange(value) {
    setSearch(value)
    setPage(0)
  }

  function handleStatusChange(value) {
    setStatus(value)
    setPage(0)
  }

  function handleSaved() {
    setForm(null)
    setNotice(t('members.form.saved'))
    setReloadKey((key) => key + 1)
    loadSummary()
  }

  function renderList() {
    if (loadError) {
      return (
        <EmptyState title={t('members.error.load')}>
          <button
            type="button"
            onClick={() => setReloadKey((key) => key + 1)}
            className="rounded-lg border border-text/10 px-4 py-2 text-sm font-medium text-primary hover:bg-background"
          >
            {t('members.error.retry')}
          </button>
        </EmptyState>
      )
    }

    if (loading && !result) {
      return (
        <div className="space-y-3 p-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="h-10 animate-pulse rounded bg-background" />
          ))}
        </div>
      )
    }

    if (result.totalElements === 0) {
      const filtered = debouncedSearch !== '' || status !== 'all'
      return filtered ? (
        <EmptyState
          icon={Users}
          title={t('members.empty.noResults')}
          message={t('members.empty.noResultsMessage')}
        />
      ) : (
        <EmptyState icon={Users} title={t('members.empty.title')} message={t('members.empty.message')} />
      )
    }

    return (
      <div className={loading ? 'opacity-60' : undefined}>
        <MemberTable
          members={result.content}
          onEdit={(member) => setForm({ member })}
          readOnly={needsInternet.offline || savedAt !== null}
        />
        <Pagination
          result={result}
          onPageChange={setPage}
          className="border-t border-text/5 bg-background/60 px-4 py-3"
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-primary">
            <Users size={14} />
            {t('members.eyebrow')}
          </p>
          <PageTitle className="mb-1">{t('members.title')}</PageTitle>
          <p className="text-sm text-muted">{t('members.subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          disabled={needsInternet.offline || registrationBlocked || starting}
          title={needsInternet.title}
          aria-describedby={registrationBlocked ? 'members-registration-blocked' : undefined}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <UserPlus size={16} />
          {starting ? t('memberVerification.starting') : t('members.add')}
        </button>
      </div>

      {registrationBlocked && (
        <p
          id="members-registration-blocked"
          className="flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          <ShieldAlert size={16} className="mt-0.5 shrink-0" />
          {t('memberVerification.errors.blocked')}
        </p>
      )}
      {registrationError && (
        <div role="alert" className="flex items-start gap-2 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
          <ShieldAlert size={16} className="mt-0.5 shrink-0" />
          <p className="min-w-0 flex-1">{registrationError}</p>
          <button
            type="button"
            onClick={() => setRegistrationError('')}
            aria-label={t('members.form.close')}
            className="-m-1 rounded-md p-1 hover:bg-danger/10"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <OfflineDataNote savedAt={savedAt} />

      <MemberSummaryCards summary={summary} error={summaryError} onRetry={loadSummary} />

      <MemberFilters
        search={search}
        onSearchChange={handleSearchChange}
        status={status}
        onStatusChange={handleStatusChange}
      />

      <div className="overflow-hidden rounded-xl bg-surface shadow-sm">{renderList()}</div>

      {form && (
        <MemberFormModal
          member={form.member}
          verification={form.verification}
          onClose={() => setForm(null)}
          onSaved={handleSaved}
          onVerificationGone={handleVerificationGone}
        />
      )}
      {notice && <SuccessToast message={notice} onDone={clearNotice} />}
    </div>
  )
}
