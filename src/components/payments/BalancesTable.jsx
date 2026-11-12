import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Eye, HandCoins, Search, Users } from 'lucide-react'
import { getBalances } from '../../api/payments'
import useDebouncedValue from '../../hooks/useDebouncedValue'
import ActionsMenu from '../ActionsMenu'
import EmptyState from '../EmptyState'
import FilterMenu from '../FilterMenu'
import { formatMoney } from '../../utils/format'

// Owed by default: the farmers who still have money to receive.
const SETTLEMENTS = ['OWED', 'SETTLED', 'ALL']

const settlementStyles = {
  OWED: 'bg-warning/15 text-amber-800',
  SETTLED: 'bg-primary-light text-primary',
}

// The ⋮ menu of a row: view the earnings, and disburse while the farmer is owed money.
function BalanceActionsMenu({ member, onOpen, onPay }) {
  const { t } = useTranslation()
  const actions = [{ key: 'earnings', icon: Eye, label: t('payments.balances.viewEarnings'), run: () => onOpen(member) }]
  if (member.settlement === 'OWED') {
    actions.push({ key: 'disburse', icon: HandCoins, label: t('payments.balances.disburse'), run: () => onPay(member) })
  }
  return <ActionsMenu label={t('payments.balances.menu', { name: member.memberName })} actions={actions} />
}

// Every farmer with earnings: earned, deductions, paid, balance, and Owed / Settled from the backend's
// settlement field. The list is not paged, so the Owed / Settled filter is applied here; the search is
// the backend's. Clicking a row is a shortcut to the earnings: onOpen(member). onPay(member) disburses.
export default function BalancesTable({ reloadKey, onOpen, onPay }) {
  const { t } = useTranslation()

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search.trim(), 300)
  const [settlement, setSettlement] = useState('OWED')
  const [members, setMembers] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    let ignore = false
    setLoading(true)
    setLoadError(false)
    getBalances({ search: debouncedSearch })
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
  }, [debouncedSearch, reloadKey, retryKey])

  const shown = members?.filter((member) => settlement === 'ALL' || member.settlement === settlement)

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
    if (shown.length === 0) {
      let title = t('payments.balances.noResults')
      if (members.length === 0 && debouncedSearch === '') title = t('payments.balances.empty')
      else if (debouncedSearch === '' && settlement === 'OWED') title = t('payments.balances.noneOwed')
      return <EmptyState icon={Users} title={title} />
    }

    const cell = 'px-3 py-3'
    // The table scrolls sideways on a narrow screen: the Actions column stays in view at the right.
    const pinned = 'max-lg:sticky max-lg:right-0 max-lg:bg-surface max-lg:shadow-[-6px_0_6px_-6px_rgba(0,0,0,0.15)]'
    const number = `${cell} whitespace-nowrap text-right`
    return (
      <div className={`overflow-x-auto ${loading ? 'opacity-60' : ''}`}>
        <table className="w-full text-left text-sm" data-testid="balances">
          <thead className="text-xs uppercase tracking-wide text-muted">
            <tr className="border-b border-text/10">
              <th className="whitespace-nowrap px-3 py-2 font-semibold">{t('payments.balances.farmer')}</th>
              {['earned', 'deductions', 'paid', 'balance'].map((column) => (
                <th key={column} className="whitespace-nowrap px-3 py-2 text-right font-semibold">
                  {t(`payments.balances.${column}`)}
                </th>
              ))}
              <th className="whitespace-nowrap px-3 py-2 font-semibold">{t('payments.balances.status')}</th>
              <th className={`whitespace-nowrap px-3 py-2 font-semibold ${pinned}`}>
                <span className="sr-only">{t('payments.balances.actions')}</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-text/5">
            {shown.map((member) => (
              <tr
                key={member.memberId}
                onClick={() => onOpen(member)}
                title={t('payments.breakdown.open', { name: member.memberName })}
                className="cursor-pointer hover:bg-background/70"
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
                  <span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${settlementStyles[member.settlement] ?? ''}`}>
                    {t(`payments.settlement.${member.settlement}`, { defaultValue: member.settlement })}
                  </span>
                </td>
                {/* The menu is drawn in a portal, but its events still reach the row: stop them
                    here so choosing an item does not also open the earnings. */}
                <td className={`px-1 py-1 text-right ${pinned}`} onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
                  <BalanceActionsMenu member={member} onOpen={onOpen} onPay={onPay} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <section className="min-w-0 rounded-xl bg-surface p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-text">
          <Users size={20} className="text-primary" />
          {t('payments.balances.title')}
        </h2>
        <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
          <div className="relative min-w-0 basis-full sm:w-56 sm:basis-auto sm:flex-none">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('payments.balances.searchPlaceholder')}
              aria-label={t('payments.balances.searchLabel')}
              className="min-h-11 w-full rounded-lg border border-transparent bg-background py-2 pl-9 pr-3 text-sm outline-none placeholder:text-muted/70 focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <FilterMenu
            name={t('payments.balances.status')}
            value={settlement}
            defaultValue="OWED"
            options={SETTLEMENTS.map((value) => ({
              value,
              label: value === 'ALL' ? t('payments.balances.all') : t(`payments.settlement.${value}`),
            }))}
            valueLabel={(filter, value) => t('payments.filterValue', { filter, value })}
            onChange={setSettlement}
          />
        </div>
      </div>
      {renderBody()}
    </section>
  )
}
