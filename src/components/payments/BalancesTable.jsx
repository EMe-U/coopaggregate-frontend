import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Banknote, Eye, HandCoins, Search, Wallet } from 'lucide-react'
import { getBalances } from '../../api/payments'
import useDebouncedValue from '../../hooks/useDebouncedValue'
import ActionsMenu from '../ActionsMenu'
import EmptyState from '../EmptyState'
import { formatMoney } from '../../utils/format'

const STATUSES = ['UNPAID', 'PART_PAID', 'PAID']

const statusStyles = {
  UNPAID: 'bg-danger/10 text-danger',
  PART_PAID: 'bg-warning/15 text-amber-800',
  PAID: 'bg-primary-light text-primary',
}

const controlClass =
  'min-h-11 rounded-lg border border-transparent bg-background text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20'

// The ⋮ menu of a row: view the breakdown, or pick the member in the Record payment panel. Nothing
// to pay keeps the item, greyed out, with the reason.
function BalanceActionsMenu({ member, onOpen, onPay }) {
  const { t } = useTranslation()
  const nothingToPay = !(member.balanceRwf > 0)
  return (
    <ActionsMenu
      label={t('payments.balances.menu', { name: member.memberName })}
      actions={[
        { key: 'breakdown', icon: Eye, label: t('payments.balances.viewBreakdown'), run: () => onOpen(member) },
        {
          key: 'pay',
          icon: HandCoins,
          label: t('payments.balances.recordPayment'),
          run: () => onPay(member),
          ...(nothingToPay && { disabled: true, title: t('payments.balances.nothingToPay') }),
        },
      ]}
    />
  )
}

// Each row has a ⋮ menu (keyboard: Tab to it, Enter, arrow keys). Clicking anywhere else on the row
// is a shortcut to the breakdown: onOpen(member). onPay(member) selects the member for a payment.
export default function BalancesTable({ reloadKey, selectedId, onOpen, onPay }) {
  const { t } = useTranslation()

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search.trim(), 300)
  const [status, setStatus] = useState('')
  const [members, setMembers] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    let ignore = false
    setLoading(true)
    setLoadError(false)
    getBalances({ search: debouncedSearch, status })
      .then((data) => {
        if (!ignore) setMembers(data.members)
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
  }, [debouncedSearch, status, reloadKey, retryKey])

  function renderBody() {
    if (loadError) {
      return (
        <EmptyState title={t('payments.balances.error')}>
          <button
            type="button"
            onClick={() => setRetryKey((key) => key + 1)}
            className="min-h-11 rounded-lg border border-text/10 px-4 text-sm font-medium text-primary hover:bg-background"
          >
            {t('payments.balances.retry')}
          </button>
        </EmptyState>
      )
    }
    if (!members) {
      return (
        <div className="space-y-2">
          {[0, 1, 2].map((index) => (
            <div key={index} className="h-12 animate-pulse rounded bg-background" />
          ))}
        </div>
      )
    }
    if (members.length === 0) {
      const filtered = debouncedSearch !== '' || status !== ''
      return (
        <EmptyState icon={Wallet} title={filtered ? t('payments.balances.noResults') : t('payments.balances.empty')} />
      )
    }

    const cell = 'px-3 py-3'
    // On a narrow screen the table scrolls sideways: the Actions column stays in view at the right.
    const pinned = 'max-lg:sticky max-lg:right-0 max-lg:bg-surface max-lg:shadow-[-6px_0_6px_-6px_rgba(0,0,0,0.15)]'
    const number = `${cell} text-right`
    return (
      <div className={`overflow-x-auto ${loading ? 'opacity-60' : ''}`}>
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-muted">
            <tr className="border-b border-text/10">
              <th className="whitespace-nowrap px-3 py-2 font-semibold">{t('payments.balances.member')}</th>
              {['share', 'deduction', 'paidSoFar', 'balance'].map((column) => (
                <th key={column} className="whitespace-nowrap px-3 py-2 text-right font-semibold">
                  {t(`payments.balances.${column}`)}
                </th>
              ))}
              <th className="whitespace-nowrap px-3 py-2 font-semibold">{t('payments.balances.status')}</th>
              <th className={`whitespace-nowrap px-3 py-2 font-semibold ${pinned}`}>{t('payments.balances.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-text/5">
            {members.map((member) => {
              const selected = member.memberId === selectedId
              return (
                <tr
                  key={member.memberId}
                  onClick={() => onOpen(member)}
                  title={t('payments.breakdown.open', { name: member.memberName })}
                  className={`cursor-pointer hover:bg-background/70 ${selected ? 'bg-primary-light/60' : ''}`}
                >
                  <td className={`${cell} min-w-36`}>
                    <p className="font-medium text-text">{member.memberName}</p>
                    <p className="font-mono text-xs text-muted">{member.memberNumber}</p>
                  </td>
                  <td className={number}>{formatMoney(member.shareRwf)}</td>
                  <td className={`${number} text-muted`}>{formatMoney(member.deductionRwf)}</td>
                  <td className={`${number} text-muted`}>{formatMoney(member.paidRwf)}</td>
                  <td className={`${number} font-semibold`}>{formatMoney(member.balanceRwf)}</td>
                  <td className={cell}>
                    <span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[member.status]}`}>
                      {t(`payments.status.${member.status}`)}
                    </span>
                  </td>
                  {/* The menu is drawn in a portal, but its events still reach the row: stop them
                      here so choosing an item does not also open the breakdown. */}
                  <td className={`px-1 py-1 text-right ${pinned}`} onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
                    <BalanceActionsMenu member={member} onOpen={onOpen} onPay={onPay} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <section className="min-w-0 rounded-xl bg-surface p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-text">
          <Banknote size={20} className="text-primary" />
          {t('payments.balances.title')}
        </h2>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <div className="relative min-w-0 flex-1 sm:w-56 sm:flex-none">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('payments.balances.searchPlaceholder')}
              aria-label={t('payments.balances.searchLabel')}
              className={`${controlClass} w-full py-2 pl-9 pr-3 placeholder:text-muted/70`}
            />
          </div>
          <select
            aria-label={t('payments.balances.filterLabel')}
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className={`${controlClass} px-3`}
          >
            <option value="">{t('payments.balances.allStatuses')}</option>
            {STATUSES.map((value) => (
              <option key={value} value={value}>
                {t(`payments.status.${value}`)}
              </option>
            ))}
          </select>
        </div>
      </div>
      {renderBody()}
    </section>
  )
}
