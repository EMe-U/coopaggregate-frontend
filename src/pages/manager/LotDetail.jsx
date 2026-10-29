import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Boxes, HandCoins, Lock, Split, TriangleAlert, Truck, Users } from 'lucide-react'
import { closeLot, getLot, listLosses } from '../../api/lots'
import EmptyState from '../../components/EmptyState'
import GradeName from '../../components/GradeName'
import SuccessToast from '../../components/SuccessToast'
import LossModal from '../../components/lots/LossModal'
import LotDeliveries from '../../components/lots/LotDeliveries'
import LotStatusBadge from '../../components/lots/LotStatusBadge'
import { formatDate, formatKg, formatMoney } from '../../utils/format'
import useNeedsInternet from '../../hooks/useNeedsInternet'

function Stat({ label, value, highlight, note }) {
  return (
    <div className="min-w-0 rounded-xl bg-surface p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${highlight ?? 'text-text'}`}>{value}</p>
      {note && <p className="mt-1 text-xs text-amber-800">{note}</p>}
    </div>
  )
}

function Section({ icon: Icon, title, children }) {
  return (
    <section className="min-w-0 rounded-xl bg-surface p-5 shadow-sm">
      <h2 className="mb-4 flex items-center gap-2 font-semibold text-text">
        <Icon size={18} className="text-primary" />
        {title}
      </h2>
      {children}
    </section>
  )
}

function LossesList({ lotId, reloadKey }) {
  const { t } = useTranslation()
  const [losses, setLosses] = useState(null)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    let ignore = false
    setLoadError(false)
    listLosses(lotId)
      .then((data) => {
        if (!ignore) setLosses(data)
      })
      .catch(() => {
        if (!ignore) setLoadError(true)
      })
    return () => {
      ignore = true
    }
  }, [lotId, reloadKey])

  if (loadError) return <p className="text-sm text-danger">{t('lots.detail.lossesError')}</p>
  if (!losses) return <div className="h-16 animate-pulse rounded bg-background" />
  if (losses.length === 0) return <p className="py-4 text-center text-sm text-muted">{t('lots.detail.noLosses')}</p>

  const cell = 'px-3 py-2'
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-background text-xs text-muted">
          <tr>
            {['lossDate', 'lossKg', 'lossReason', 'lossNotes'].map((column) => (
              <th key={column} className="whitespace-nowrap px-3 py-2 font-semibold">
                {t(`lots.detail.${column}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-text/5">
          {losses.map((loss) => (
            <tr key={loss.id}>
              <td className={`${cell} whitespace-nowrap`}>{formatDate(loss.recordedAt)}</td>
              <td className={`${cell} whitespace-nowrap text-danger`}>{formatKg(loss.quantityKg)}</td>
              <td className={`${cell} whitespace-nowrap`}>{t(`lots.loss.reasons.${loss.reason}`)}</td>
              <td className={`${cell} min-w-48 text-muted`}>{loss.notes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function LotDetail() {
  const { t } = useTranslation()
  const needsInternet = useNeedsInternet()
  const { id } = useParams()
  const navigate = useNavigate()

  const [lot, setLot] = useState(null)
  const [loadState, setLoadState] = useState('loading')
  const [reloadKey, setReloadKey] = useState(0)

  const [closing, setClosing] = useState(false)
  const [recordingLoss, setRecordingLoss] = useState(false)
  const [actionError, setActionError] = useState('')
  const [notice, setNotice] = useState('')
  const clearNotice = useCallback(() => setNotice(''), [])

  const reload = useCallback(() => setReloadKey((key) => key + 1), [])

  function handleLossSaved() {
    setRecordingLoss(false)
    setNotice(t('lots.loss.saved'))
    reload()
  }

  async function handleClose() {
    if (!window.confirm(t('lots.detail.confirmClose', { code: lot.code }))) return

    setClosing(true)
    setActionError('')
    try {
      await closeLot(lot.id)
      setNotice(t('lots.detail.closedNotice'))
      reload()
    } catch (error) {
      setActionError(error.response?.data?.message || t('lots.detail.closeError'))
    } finally {
      setClosing(false)
    }
  }

  useEffect(() => {
    let ignore = false
    getLot(id)
      .then((data) => {
        if (ignore) return
        setLot(data)
        setLoadState('loaded')
      })
      .catch((error) => {
        if (!ignore) setLoadState(error.response?.status === 404 ? 'notFound' : 'error')
      })
    return () => {
      ignore = true
    }
  }, [id, reloadKey])

  const backLink = (
    <Link to="/lots" className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted hover:text-primary">
      <ArrowLeft size={16} />
      {t('lots.detail.back')}
    </Link>
  )

  if (loadState === 'notFound' || loadState === 'error') {
    const notFound = loadState === 'notFound'
    return (
      <div className="rounded-xl bg-surface shadow-sm">
        <EmptyState
          icon={Boxes}
          title={notFound ? t('lots.detail.notFound') : t('lots.detail.loadError')}
          message={notFound ? t('lots.detail.notFoundMessage') : undefined}
        >
          <div className="flex flex-col items-center gap-2">
            {!notFound && (
              <button
                type="button"
                onClick={reload}
                className="min-h-11 rounded-lg border border-text/10 px-4 text-sm font-medium text-primary hover:bg-background"
              >
                {t('lots.retry')}
              </button>
            )}
            {backLink}
          </div>
        </EmptyState>
      </div>
    )
  }

  if (loadState === 'loading') {
    return <div className="h-64 animate-pulse rounded-xl bg-surface shadow-sm" />
  }

  const hasStock = Number(lot.remainingKg) > 0
  const canRecordLoss = (lot.status === 'OPEN' || lot.status === 'CLOSED') && hasStock
  // Sales are by grade and take the oldest batches whatever their lot, so a lot does not need to be
  // closed first. A lot with sales is never shared: its members were paid by batch (sharing is 409).
  const canSell = (lot.status === 'OPEN' || lot.status === 'CLOSED') && hasStock
  const canShare = lot.status === 'SOLD' && !(Number(lot.soldKg) > 0)

  return (
    <div className="space-y-6">
      {backLink}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-mono text-2xl font-semibold text-text">{lot.code}</h1>
            <LotStatusBadge status={lot.status} />
          </div>
          <p className="mt-1 text-sm text-muted">
            <GradeName name={lot.gradeName} /> · {t('lots.detail.opened', { date: formatDate(lot.createdAt) })}
            {lot.closedAt && <> · {t('lots.detail.closedOn', { date: formatDate(lot.closedAt) })}</>}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {lot.status === 'OPEN' && (
            <button
              type="button"
              onClick={handleClose}
              disabled={closing || needsInternet.offline}
              title={needsInternet.title}
              className="flex min-h-11 items-center gap-2 rounded-lg border border-text/10 bg-surface px-4 text-sm font-medium text-text hover:bg-background disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Lock size={16} />
              {closing ? t('lots.detail.closing') : t('lots.detail.closeLot')}
            </button>
          )}
          {canRecordLoss && (
            <button
              type="button"
              onClick={() => setRecordingLoss(true)}
              disabled={needsInternet.offline}
              title={needsInternet.title}
              className="flex min-h-11 items-center gap-2 rounded-lg border border-danger/30 bg-surface px-4 text-sm font-medium text-danger hover:bg-danger/5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <TriangleAlert size={16} />
              {t('lots.detail.recordLoss')}
            </button>
          )}
          {canSell && (
            <button
              type="button"
              onClick={() => navigate(`/sales?grade=${encodeURIComponent(lot.gradeName)}`)}
              disabled={needsInternet.offline}
              title={needsInternet.title}
              className="flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <HandCoins size={16} />
              {t('lots.detail.recordSale')}
            </button>
          )}
          {canShare && (
            <button
              type="button"
              onClick={() => navigate(`/share?lotId=${lot.id}`)}
              disabled={needsInternet.offline}
              title={needsInternet.title}
              className="flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Split size={16} />
              {t('share.shareMoney')}
            </button>
          )}
        </div>
      </div>

      {actionError && (
        <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          {actionError}
        </p>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Stat
          label={t('lots.detail.delivered')}
          value={formatKg(lot.deliveredKg)}
          note={
            Number(lot.pendingConfirmationKg) > 0
              ? t('lots.pendingConfirmation', { kg: formatKg(lot.pendingConfirmationKg) })
              : null
          }
        />
        <Stat label={t('lots.detail.sold')} value={formatKg(lot.soldKg)} />
        <Stat
          label={t('lots.detail.lost')}
          value={formatKg(lot.lostKg)}
          highlight={Number(lot.lostKg) > 0 ? 'text-danger' : undefined}
        />
        <Stat label={t('lots.detail.inStock')} value={formatKg(lot.remainingKg)} highlight="text-primary" />
        <Stat label={t('lots.detail.saleAmount')} value={lot.saleAmountRwf ? formatMoney(lot.saleAmountRwf) : '–'} />
        <Stat label={t('lots.detail.members')} value={lot.memberCount} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section icon={Users} title={t('lots.detail.membersTitle')}>
          {lot.members.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted">{t('lots.detail.noMembers')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-background text-xs text-muted">
                  <tr>
                    {['memberName', 'memberNumber', 'kg'].map((column) => (
                      <th key={column} className="whitespace-nowrap px-3 py-2 font-semibold">
                        {t(`lots.detail.${column}`)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-text/5">
                  {lot.members.map((member) => (
                    <tr key={member.memberId}>
                      <td className="whitespace-nowrap px-3 py-2">
                        <Link to={`/members/${member.memberId}`} className="text-primary hover:underline">
                          {member.memberName}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">{member.memberNumber}</td>
                      <td className="whitespace-nowrap px-3 py-2">{formatKg(member.kg)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        <Section icon={TriangleAlert} title={t('lots.detail.lossesTitle')}>
          <LossesList lotId={lot.id} reloadKey={reloadKey} />
        </Section>
      </div>

      <Section icon={Truck} title={t('lots.detail.deliveriesTitle')}>
        <LotDeliveries lot={lot} reloadKey={reloadKey} onChanged={reload} />
      </Section>

      {recordingLoss && (
        <LossModal lot={lot} onClose={() => setRecordingLoss(false)} onSaved={handleLossSaved} />
      )}
      {notice && <SuccessToast message={notice} onDone={clearNotice} />}
    </div>
  )
}
