import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, UserX } from 'lucide-react'
import { activateMember, deactivateMember, getMember } from '../../api/members'
import EmptyState from '../../components/EmptyState'
import SuccessToast from '../../components/SuccessToast'
import MemberFormModal from '../../components/members/MemberFormModal'
import MemberProfileCard from '../../components/members/MemberProfileCard'
import { formatDate, todayIso } from '../../utils/format'
import { FinancialSummaryCard, StatementSections } from '../../components/members/MemberStatement'

export default function MemberDetail() {
  const { t } = useTranslation()
  const { id } = useParams()

  const [member, setMember] = useState(null)
  const [loadState, setLoadState] = useState('loading')
  const [reloadKey, setReloadKey] = useState(0)
  const [editing, setEditing] = useState(false)
  const [notice, setNotice] = useState('')
  const [changingStatus, setChangingStatus] = useState(false)
  const [statusError, setStatusError] = useState('')
  const clearNotice = useCallback(() => setNotice(''), [])

  useEffect(() => {
    let ignore = false
    setLoadState('loading')

    getMember(id)
      .then((data) => {
        if (ignore) return
        setMember(data)
        setLoadState('loaded')
      })
      .catch((error) => {
        if (!ignore) setLoadState(error.response?.status === 404 ? 'notFound' : 'error')
      })

    return () => {
      ignore = true
    }
  }, [id, reloadKey])

  function handleSaved(saved) {
    setMember(saved)
    setEditing(false)
    setNotice(t('members.form.saved'))
  }

  async function handleToggleActive() {
    const active = member.status === 'ACTIVE'
    if (active && !window.confirm(t('members.detail.confirmDeactivate', { name: member.fullName }))) {
      return
    }

    setChangingStatus(true)
    setStatusError('')
    try {
      const updated = active ? await deactivateMember(member.id) : await activateMember(member.id)
      setMember(updated)
      setNotice(active ? t('members.detail.deactivated') : t('members.detail.activated'))
    } catch {
      setStatusError(t('members.detail.statusError'))
    } finally {
      setChangingStatus(false)
    }
  }

  const backLink = (
    <Link
      to="/members"
      className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-primary print:hidden"
    >
      <ArrowLeft size={16} />
      {t('members.detail.back')}
    </Link>
  )

  if (loadState === 'notFound') {
    return (
      <div className="rounded-xl bg-surface shadow-sm">
        <EmptyState icon={UserX} title={t('members.detail.notFound')} message={t('members.detail.notFoundMessage')}>
          {backLink}
        </EmptyState>
      </div>
    )
  }

  if (loadState === 'error') {
    return (
      <div className="rounded-xl bg-surface shadow-sm">
        <EmptyState title={t('members.detail.loadError')}>
          <div className="flex flex-col items-center gap-4">
            <button
              type="button"
              onClick={() => setReloadKey((key) => key + 1)}
              className="rounded-lg border border-text/10 px-4 py-2 text-sm font-medium text-primary hover:bg-background"
            >
              {t('members.error.retry')}
            </button>
            {backLink}
          </div>
        </EmptyState>
      </div>
    )
  }

  if (loadState === 'loading') {
    return <div className="h-64 animate-pulse rounded-xl bg-surface shadow-sm" />
  }

  return (
    <div className="space-y-6">
      {backLink}

      <header className="hidden border-b border-text/10 pb-4 print:block">
        <p className="text-lg font-bold text-primary">{t('app.cooperative')}</p>
        <p className="text-base font-semibold text-text">
          {member.fullName} – {member.memberCode}
        </p>
        <p className="text-sm text-muted">
          {t('members.print.statementAsOf', { date: formatDate(todayIso()) })}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="min-w-0 lg:col-span-2">
          <MemberProfileCard
            member={member}
            onEdit={() => setEditing(true)}
            onToggleActive={handleToggleActive}
            changingStatus={changingStatus}
          />
          {statusError && (
            <p role="alert" className="mt-2 text-sm text-danger print:hidden">
              {statusError}
            </p>
          )}
        </div>
        <div className="min-w-0 lg:col-span-3">
          <FinancialSummaryCard />
        </div>
      </div>

      <StatementSections />

      {editing && (
        <MemberFormModal member={member} onClose={() => setEditing(false)} onSaved={handleSaved} />
      )}
      {notice && <SuccessToast message={notice} onDone={clearNotice} />}
    </div>
  )
}
