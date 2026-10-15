import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Banknote, CircleCheck, CircleX, Info, Sigma, Split, Users } from 'lucide-react'
import { listAllLots } from '../../api/lots'
import { listSales } from '../../api/sales'
import { getSharePreview, shareLot } from '../../api/shares'
import EmptyState from '../../components/EmptyState'
import PageTitle from '../../components/PageTitle'
import SharePreviewTable from '../../components/share/SharePreviewTable'
import { formatNumber } from '../../utils/format'
import useNeedsInternet from '../../hooks/useNeedsInternet'

// Kilograms only: delivered must equal sold plus lost once a lot is fully sold.
function stockBalances(lot) {
  const accounted = Number(lot.soldKg) + Number(lot.lostKg) + Number(lot.remainingKg)
  return Math.round((Number(lot.deliveredKg) - accounted) * 100) === 0
}

function LotCard({ label, value, unit, valueClass = 'text-text', dark }) {
  return (
    <div className={`min-w-0 rounded-xl p-4 shadow-sm ${dark ? 'bg-primary text-white' : 'bg-surface'}`}>
      <p className={`text-xs font-medium ${dark ? 'text-white/70' : 'text-muted'}`}>{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${dark ? 'text-white' : valueClass}`}>
        {value}
        {unit && <span className={`ml-1 text-sm font-normal ${dark ? 'text-white/70' : 'text-muted'}`}>{unit}</span>}
      </p>
    </div>
  )
}

export default function ShareLotMoney() {
  const { t } = useTranslation()
  const needsInternet = useNeedsInternet()
  // Set when coming from a lot's "Share money" button.
  const [searchParams, setSearchParams] = useSearchParams()
  const lotId = searchParams.get('lotId') ?? ''

  const [lots, setLots] = useState(null)
  const [lotsError, setLotsError] = useState(false)
  const [lotsReloadKey, setLotsReloadKey] = useState(0)

  const [preview, setPreview] = useState(null)
  const [saleCount, setSaleCount] = useState(null)
  const [previewState, setPreviewState] = useState('idle')
  const [previewReloadKey, setPreviewReloadKey] = useState(0)

  const [sharing, setSharing] = useState(false)
  const [shareError, setShareError] = useState('')
  // The lot as it was when it was shared; it is no longer in the list of sold lots.
  const [sharedLot, setSharedLot] = useState(null)

  useEffect(() => {
    let ignore = false
    setLotsError(false)
    listAllLots('SOLD')
      .then((data) => {
        if (!ignore) setLots(data)
      })
      .catch(() => {
        if (!ignore) setLotsError(true)
      })
    return () => {
      ignore = true
    }
  }, [lotsReloadKey])

  useEffect(() => {
    setPreview(null)
    setSaleCount(null)
    setShareError('')
    setSharedLot(null)
    if (!lotId) {
      setPreviewState('idle')
      return
    }

    let ignore = false
    setPreviewState('loading')
    getSharePreview(lotId)
      .then((data) => {
        if (ignore) return
        setPreview(data)
        setPreviewState('loaded')
      })
      .catch(() => {
        if (!ignore) setPreviewState('error')
      })
    // Only for the "Sold (N sales)" label, so a failure just hides the count.
    listSales({ lotId, size: 1 })
      .then((data) => {
        if (!ignore) setSaleCount(data.totalElements)
      })
      .catch(() => {})
    return () => {
      ignore = true
    }
  }, [lotId, previewReloadKey])

  const lot = sharedLot ?? lots?.find((candidate) => String(candidate.id) === lotId)

  function chooseLot(id) {
    setSearchParams(id ? { lotId: id } : {})
  }

  async function handleShare() {
    if (!window.confirm(t('share.confirmQuestion', { code: preview.lotCode }))) return

    setSharing(true)
    setShareError('')
    try {
      // The answer holds the saved shares, which replace the preview.
      const saved = await shareLot(lotId)
      setSharedLot({ ...lot, status: 'SHARED' })
      setPreview(saved)
      setLotsReloadKey((key) => key + 1)
    } catch (error) {
      setShareError(error.response?.data?.message || t('share.error'))
    } finally {
      setSharing(false)
    }
  }

  function renderCards() {
    // Display only: the shares themselves are calculated by the backend.
    const moneyPerKg = Number(lot.deliveredKg) > 0 ? Number(lot.saleAmountRwf) / Number(lot.deliveredKg) : 0
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <LotCard label={t('share.cards.delivered')} value={formatNumber(lot.deliveredKg)} unit="kg" />
        <LotCard
          label={t('share.cards.lost')}
          value={formatNumber(lot.lostKg)}
          unit="kg"
          valueClass={Number(lot.lostKg) > 0 ? 'text-danger' : 'text-text'}
        />
        <LotCard
          label={saleCount === null ? t('share.cards.sold') : t('share.cards.soldSales', { count: saleCount })}
          value={formatNumber(lot.soldKg)}
          unit="kg"
        />
        <LotCard
          label={t('share.cards.saleMoney')}
          value={formatNumber(lot.saleAmountRwf)}
          unit="RWF"
          valueClass="text-primary"
        />
        <LotCard
          label={t('share.cards.moneyPerKg')}
          value={new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(moneyPerKg)}
          unit="RWF"
          dark
        />
      </div>
    )
  }

  function renderBody() {
    if (previewState === 'idle') {
      return (
        <div className="rounded-xl bg-surface shadow-sm">
          <EmptyState icon={Split} title={t('share.empty')} />
        </div>
      )
    }
    if (previewState === 'loading' || !lot) {
      return <div className="h-64 animate-pulse rounded-xl bg-surface shadow-sm" />
    }
    if (previewState === 'error') {
      return (
        <div className="rounded-xl bg-surface shadow-sm">
          <EmptyState title={t('share.previewError')}>
            <button
              type="button"
              onClick={() => setPreviewReloadKey((key) => key + 1)}
              className="min-h-11 rounded-lg border border-text/10 px-4 text-sm font-medium text-primary hover:bg-background"
            >
              {t('share.retry')}
            </button>
          </EmptyState>
        </div>
      )
    }

    return (
      <div className="space-y-6">
        {renderCards()}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <section className="min-w-0 rounded-xl bg-surface p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 font-semibold text-text">
                <Users size={18} className="text-primary" />
                {t('share.breakdown.title')}
              </h2>
              <p className="text-xs text-muted">{t('share.breakdown.contributors', { count: preview.members.length })}</p>
            </div>
            <SharePreviewTable preview={preview} />
          </section>

          <div className="min-w-0 space-y-6">
            <section className="rounded-xl bg-background p-5 ring-1 ring-text/5">
              <h2 className="mb-3 flex items-center gap-2 font-semibold text-text">
                <Info size={18} className="text-primary" />
                {t('share.rules.title')}
              </h2>
              <div className="space-y-3 text-sm">
                <p className="flex items-start gap-2 rounded-lg bg-surface p-3">
                  <Sigma size={16} className="mt-0.5 shrink-0 text-primary" />
                  <span>
                    <strong>{t('share.rules.shareLabel')}</strong> {t('share.rules.share')}
                  </span>
                </p>
                <p className="flex items-start gap-2 rounded-lg bg-surface p-3">
                  <Banknote size={16} className="mt-0.5 shrink-0 text-primary" />
                  {t('share.rules.deduction')}
                </p>
              </div>
            </section>

            <section className="rounded-xl bg-surface p-5 shadow-sm">
              <h2 className="font-semibold text-text">{t('share.finalize.title')}</h2>
              {sharedLot ? (
                <div role="status" className="mt-3 space-y-3 text-sm text-primary">
                  <p className="flex items-start gap-2 rounded-lg bg-primary-light p-3 font-medium">
                    <CircleCheck size={18} className="mt-0.5 shrink-0" />
                    {t('share.success', { code: preview.lotCode })}
                  </p>
                  <Link
                    to="/payments"
                    className="flex min-h-12 items-center justify-center rounded-lg bg-primary px-4 font-semibold text-white hover:bg-primary/90"
                  >
                    {t('share.goToPayments')}
                  </Link>
                </div>
              ) : (
                <>
                  <p className="mt-2 text-sm text-muted">{t('share.finalize.text')}</p>
                  {shareError && (
                    <p role="alert" className="mt-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
                      {shareError}
                    </p>
                  )}
                  <div className="mt-4 grid gap-2">
                    <button
                      type="button"
                      onClick={handleShare}
                      disabled={sharing || needsInternet.offline}
                      title={needsInternet.title}
                      className="flex min-h-12 items-center justify-center gap-2 rounded-lg bg-primary px-4 font-semibold text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <CircleCheck size={18} />
                      {sharing ? t('share.finalize.sharing') : t('share.finalize.confirm')}
                    </button>
                    <button
                      type="button"
                      onClick={() => chooseLot('')}
                      disabled={sharing}
                      className="flex min-h-12 items-center justify-center gap-2 rounded-lg bg-background px-4 text-sm font-medium text-text hover:bg-text/10"
                    >
                      <CircleX size={18} />
                      {t('share.finalize.cancel')}
                    </button>
                  </div>
                </>
              )}
            </section>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-primary">
            <Banknote size={14} />
            {t('share.eyebrow')}
          </p>
          <PageTitle className="mb-0">{t('share.title')}</PageTitle>
        </div>

        <div className="flex w-full flex-wrap items-end gap-3 sm:w-auto">
          <div className="w-full sm:w-80">
            <label htmlFor="share-lot" className="mb-1 block text-xs font-medium text-muted">
              {t('share.lot')}
            </label>
            {lotsError ? (
              <p className="text-sm text-danger">
                {t('share.lotsError')}{' '}
                <button type="button" onClick={() => setLotsReloadKey((key) => key + 1)} className="font-medium underline">
                  {t('share.retry')}
                </button>
              </p>
            ) : (
              <select
                id="share-lot"
                value={lotId}
                onChange={(event) => chooseLot(event.target.value)}
                disabled={!lots || sharing}
                className="min-h-12 w-full rounded-lg border border-transparent bg-surface px-3 text-base shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                <option value="">{lots?.length === 0 ? t('share.noLots') : t('share.chooseLot')}</option>
                {sharedLot && <option value={lotId}>{sharedLot.code}</option>}
                {lots?.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {t('share.lotOption', {
                      code: candidate.code,
                      grade: t(`grades.${candidate.gradeName}`, { defaultValue: candidate.gradeName }),
                    })}
                  </option>
                ))}
              </select>
            )}
          </div>
          {lot && (
            <span
              className={`flex min-h-12 items-center gap-1.5 rounded-lg px-3 text-sm font-medium ${
                stockBalances(lot) ? 'bg-primary-light text-primary' : 'bg-danger/10 text-danger'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${stockBalances(lot) ? 'bg-primary' : 'bg-danger'}`} />
              {stockBalances(lot) ? t('share.stockBalanced') : t('share.stockUnbalanced')}
            </span>
          )}
        </div>
      </div>

      {renderBody()}
    </div>
  )
}
