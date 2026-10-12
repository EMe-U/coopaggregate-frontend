import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CircleCheck, Info, Split } from 'lucide-react'
import { listAllLots } from '../../api/lots'
import { getSharePreview, shareLot } from '../../api/shares'
import EmptyState from '../../components/EmptyState'
import GradeName from '../../components/GradeName'
import PageTitle from '../../components/PageTitle'
import LotStatusBadge from '../../components/lots/LotStatusBadge'
import SharePreviewTable from '../../components/share/SharePreviewTable'
import { formatKg, formatMoney } from '../../utils/format'

function Fact({ label, children }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-0.5 font-semibold text-text">{children}</p>
    </div>
  )
}

async function loadShareableLots() {
  const [sold, shared] = await Promise.all([listAllLots('SOLD'), listAllLots('SHARED')])
  return { sold, shared }
}

export default function ShareLotMoney() {
  const { t } = useTranslation()
  // Set when coming from a lot's "Share money" button.
  const [searchParams, setSearchParams] = useSearchParams()
  const lotId = searchParams.get('lotId') ?? ''

  const [lots, setLots] = useState(null)
  const [lotsError, setLotsError] = useState(false)
  const [lotsReloadKey, setLotsReloadKey] = useState(0)

  const [preview, setPreview] = useState(null)
  const [previewState, setPreviewState] = useState('idle')
  const [previewReloadKey, setPreviewReloadKey] = useState(0)

  const [sharing, setSharing] = useState(false)
  const [shareError, setShareError] = useState('')
  const [sharedCode, setSharedCode] = useState('')

  useEffect(() => {
    let ignore = false
    setLotsError(false)
    loadShareableLots()
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
    setShareError('')
    setSharedCode('')
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
    return () => {
      ignore = true
    }
  }, [lotId, previewReloadKey])

  const lot = lots && [...lots.sold, ...lots.shared].find((candidate) => String(candidate.id) === lotId)

  function chooseLot(id) {
    setSearchParams(id ? { lotId: id } : {})
  }

  async function handleShare() {
    if (!window.confirm(t('share.confirmQuestion', { code: preview.lotCode }))) return

    setSharing(true)
    setShareError('')
    try {
      // The answer holds the saved shares, which replace the preview.
      setPreview(await shareLot(lotId))
      setSharedCode(preview.lotCode)
      setLotsReloadKey((key) => key + 1)
    } catch (error) {
      setShareError(error.response?.data?.message || t('share.error'))
    } finally {
      setSharing(false)
    }
  }

  function lotLabel(candidate) {
    return t('share.lotOption', {
      code: candidate.code,
      grade: t(`grades.${candidate.gradeName}`, { defaultValue: candidate.gradeName }),
    })
  }

  function renderPreview() {
    if (previewState === 'idle') {
      return <EmptyState icon={Split} title={t('share.empty')} />
    }
    if (previewState === 'loading') {
      return <div className="h-48 animate-pulse rounded-lg bg-background" />
    }
    if (previewState === 'error') {
      return (
        <EmptyState title={t('share.previewError')}>
          <button
            type="button"
            onClick={() => setPreviewReloadKey((key) => key + 1)}
            className="min-h-11 rounded-lg border border-text/10 px-4 text-sm font-medium text-primary hover:bg-background"
          >
            {t('share.retry')}
          </button>
        </EmptyState>
      )
    }

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 rounded-lg bg-background p-4 sm:grid-cols-4">
          <Fact label={t('share.facts.grade')}>
            <GradeName name={preview.gradeName} />
          </Fact>
          <Fact label={t('share.facts.delivered')}>{formatKg(preview.deliveredKg)}</Fact>
          <Fact label={t('share.facts.saleMoney')}>{formatMoney(preview.saleAmountRwf)}</Fact>
          <Fact label={t('share.facts.members')}>{preview.members.length}</Fact>
        </div>

        <p className="flex items-start gap-2 text-sm text-muted">
          <Info size={16} className="mt-0.5 shrink-0 text-primary" />
          {t('share.formula')}
        </p>

        {sharedCode ? (
          <div role="status" className="flex flex-wrap items-center gap-3 rounded-lg bg-primary-light p-3 text-sm text-primary">
            <CircleCheck size={20} className="shrink-0" />
            <span className="flex-1 font-medium">{t('share.success', { code: sharedCode })}</span>
            <Link
              to="/payments"
              className="flex min-h-11 items-center rounded-lg bg-primary px-4 font-semibold text-white hover:bg-primary/90"
            >
              {t('share.goToPayments')}
            </Link>
          </div>
        ) : (
          lot?.status === 'SHARED' && (
            <p className="rounded-lg bg-primary-light px-3 py-2 text-sm text-primary">{t('share.sharedNote')}</p>
          )
        )}

        {shareError && (
          <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
            {shareError}
          </p>
        )}

        <SharePreviewTable members={preview.members} totals={preview.totals} />

        {lot?.status === 'SOLD' && !sharedCode && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleShare}
              disabled={sharing}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 text-base font-semibold text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              <Split size={18} />
              {sharing ? t('share.sharing') : t('share.confirm')}
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <PageTitle className="mb-1">{t('share.title')}</PageTitle>
        <p className="text-sm text-muted">{t('share.subtitle')}</p>
      </div>

      <section className="min-w-0 space-y-5 rounded-xl bg-surface p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-full sm:w-80">
            <label htmlFor="share-lot" className="mb-1.5 block text-sm font-medium text-text">
              {t('share.lot')}
            </label>
            {lotsError ? (
              <p className="text-sm text-danger">
                {t('share.lotsError')}{' '}
                <button
                  type="button"
                  onClick={() => setLotsReloadKey((key) => key + 1)}
                  className="font-medium underline"
                >
                  {t('share.retry')}
                </button>
              </p>
            ) : (
              <select
                id="share-lot"
                value={lotId}
                onChange={(event) => chooseLot(event.target.value)}
                disabled={!lots}
                className="min-h-12 w-full rounded-lg border border-transparent bg-background px-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                <option value="">
                  {lots && lots.sold.length + lots.shared.length === 0 ? t('share.noLots') : t('share.chooseLot')}
                </option>
                {lots?.sold.length > 0 && (
                  <optgroup label={t('share.groupSold')}>
                    {lots.sold.map((candidate) => (
                      <option key={candidate.id} value={candidate.id}>
                        {lotLabel(candidate)}
                      </option>
                    ))}
                  </optgroup>
                )}
                {lots?.shared.length > 0 && (
                  <optgroup label={t('share.groupShared')}>
                    {lots.shared.map((candidate) => (
                      <option key={candidate.id} value={candidate.id}>
                        {lotLabel(candidate)}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            )}
          </div>
          {lot && (
            <div className="flex min-h-12 items-center">
              <LotStatusBadge status={lot.status} />
            </div>
          )}
        </div>

        {renderPreview()}
      </section>
    </div>
  )
}
