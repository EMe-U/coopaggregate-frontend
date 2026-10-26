import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Package, Scale, ShoppingCart, Truck, Wallet } from 'lucide-react'
import GradeName from '../GradeName'
import { formatKg, formatMoney, formatNumber } from '../../utils/format'

const noValue = '–'
// Wide tables become cards on phones. On paper the tables are kept: they fit the page width.
const tableBox = 'hidden overflow-x-auto md:block print:block print:overflow-visible'
const cardList = 'divide-y divide-text/5 md:hidden print:hidden'
const headClass = 'whitespace-nowrap px-3 py-2 font-semibold'
const cell = 'whitespace-nowrap px-3 py-2'
const rowClass = 'print:break-inside-avoid'

const kg = (value) => formatKg(Number(value ?? 0))

function Section({ title, icon: Icon, children }) {
  return (
    <section className="min-w-0 rounded-xl bg-surface p-5 shadow-sm print:p-0 print:shadow-none">
      <h2 className="mb-4 flex items-center gap-2 font-semibold text-text print:break-after-avoid">
        <Icon size={18} className="text-primary" />
        {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </section>
  )
}

// now marks a number taken at the time of the request, not the week's.
function Stat({ label, value, now, children }) {
  const { t } = useTranslation()
  return (
    <div className="min-w-0 rounded-lg bg-background p-3 print:break-inside-avoid print:border print:border-text/10">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium uppercase tracking-wide text-muted">
        {label}
        {now && (
          <span className="rounded bg-warning/15 px-1.5 py-0.5 text-[10px] normal-case tracking-normal text-amber-800">
            {t('reports.asOfNow')}
          </span>
        )}
      </p>
      <p className="mt-1 wrap-break-word text-xl font-semibold text-text">{value}</p>
      {children && <div className="mt-1 text-xs text-muted">{children}</div>}
    </div>
  )
}

function NoActivity() {
  const { t } = useTranslation()
  return <p className="rounded-lg bg-background p-3 text-sm text-muted">{t('reports.noActivity')}</p>
}

const statGrid = 'grid grid-cols-2 gap-3 lg:grid-cols-4'

export function DeliveriesSection({ data }) {
  const { t } = useTranslation()
  const grades = data.byGrade.map((grade) => grade.gradeName)

  return (
    <Section title={t('reports.deliveries.title')} icon={Truck}>
      {data.deliveries === 0 ? (
        <NoActivity />
      ) : (
        <>
          <div className={statGrid}>
            <Stat label={t('reports.deliveries.totalKg')} value={kg(data.totalKg)}>
              {t('reports.deliveries.count', { count: data.deliveries })}
            </Stat>
            {data.byGrade.map((grade) => (
              <Stat key={grade.gradeName} label={<GradeName name={grade.gradeName} />} value={kg(grade.kg)}>
                {t('reports.deliveries.count', { count: grade.deliveries })}
              </Stat>
            ))}
          </div>

          <h3 className="text-sm font-semibold text-text print:break-after-avoid">{t('reports.deliveries.byMember')}</h3>
          <div className={tableBox}>
            <table className="w-full text-left text-sm">
              <thead className="bg-background text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className={headClass}>{t('reports.deliveries.columns.number')}</th>
                  <th className={headClass}>{t('reports.deliveries.columns.name')}</th>
                  {grades.map((name) => (
                    <th key={name} className={`${headClass} text-right`}>
                      <GradeName name={name} />
                    </th>
                  ))}
                  <th className={`${headClass} text-right`}>{t('reports.deliveries.columns.total')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-text/5">
                {data.byMember.map((member) => (
                  <tr key={member.memberId} className={rowClass}>
                    <td className={`${cell} font-mono text-xs text-muted`}>{member.memberNumber}</td>
                    <td className="px-3 py-2">
                      <Link to={`/members/${member.memberId}`} className="font-medium text-text hover:text-primary hover:underline">
                        {member.memberName}
                      </Link>
                    </td>
                    {member.kgByGrade.map((grade) => (
                      <td key={grade.gradeName} className={`${cell} text-right`}>
                        {Number(grade.kg) > 0 ? kg(grade.kg) : <span className="text-muted">{noValue}</span>}
                      </td>
                    ))}
                    <td className={`${cell} text-right font-semibold`}>{kg(member.totalKg)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className={cardList}>
            {data.byMember.map((member) => (
              <li key={member.memberId} className="py-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0">
                    <Link to={`/members/${member.memberId}`} className="font-medium text-text hover:text-primary hover:underline">
                      {member.memberName}
                    </Link>
                    <span className="text-xs text-muted"> · {member.memberNumber}</span>
                  </p>
                  <p className="shrink-0 font-semibold">{kg(member.totalKg)}</p>
                </div>
                <p className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted">
                  {member.kgByGrade
                    .filter((grade) => Number(grade.kg) > 0)
                    .map((grade) => (
                      <span key={grade.gradeName}>
                        <GradeName name={grade.gradeName} />: {kg(grade.kg)}
                      </span>
                    ))}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </Section>
  )
}

export function StockSection({ data }) {
  const { t } = useTranslation()
  const losses = data.lossesByReason.filter((line) => Number(line.kg) > 0)

  return (
    <Section title={t('reports.stock.title')} icon={Package}>
      <div className={statGrid}>
        <Stat label={t('reports.stock.remaining')} value={kg(data.remainingKgNow)} now />
        {data.remainingByGradeNow.map((grade) => (
          <Stat key={grade.gradeName} label={<GradeName name={grade.gradeName} />} value={kg(grade.kg)} now />
        ))}
      </div>

      <h3 className="text-sm font-semibold text-text print:break-after-avoid">{t('reports.stock.losses')}</h3>
      {losses.length === 0 ? (
        <NoActivity />
      ) : (
        <div className={statGrid}>
          <Stat label={t('reports.stock.lostKg')} value={kg(data.lostKg)} />
          {losses.map((line) => (
            <Stat
              key={line.reason}
              label={t(`lots.loss.reasons.${line.reason}`, { defaultValue: line.reason })}
              value={kg(line.kg)}
            />
          ))}
        </div>
      )}
    </Section>
  )
}

export function SalesSection({ data }) {
  const { t } = useTranslation()

  return (
    <Section title={t('reports.sales.title')} icon={ShoppingCart}>
      {data.sales.length === 0 ? (
        <NoActivity />
      ) : (
        <>
          <div className={tableBox}>
            <table className="w-full text-left text-sm">
              <thead className="bg-background text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className={headClass}>{t('reports.sales.columns.code')}</th>
                  <th className={headClass}>{t('reports.sales.columns.buyer')}</th>
                  <th className={headClass}>{t('reports.sales.columns.lots')}</th>
                  <th className={`${headClass} text-right`}>{t('reports.sales.columns.kg')}</th>
                  <th className={`${headClass} text-right`}>{t('reports.sales.columns.amount')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-text/5">
                {data.sales.map((sale) => (
                  <tr key={sale.code} className={rowClass}>
                    <td className={`${cell} font-mono text-xs font-semibold text-primary`}>{sale.code}</td>
                    <td className="px-3 py-2">{sale.buyerName}</td>
                    <td className="px-3 py-2 font-mono text-xs">{sale.lotCodes.join(', ')}</td>
                    <td className={`${cell} text-right`}>{kg(sale.kg)}</td>
                    <td className={`${cell} text-right font-semibold`}>{formatMoney(sale.amountRwf)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className={cardList}>
            {data.sales.map((sale) => (
              <li key={sale.code} className="py-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-mono text-xs font-semibold text-primary">{sale.code}</p>
                  <p className="shrink-0 font-semibold">{formatMoney(sale.amountRwf)}</p>
                </div>
                <p className="font-medium text-text">{sale.buyerName}</p>
                <p className="flex flex-wrap justify-between gap-x-3 text-xs text-muted">
                  <span className="font-mono">{sale.lotCodes.join(', ')}</span>
                  <span>{kg(sale.kg)}</span>
                </p>
              </li>
            ))}
          </ul>

          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label={t('reports.sales.totalKg')} value={kg(data.totalKg)} />
            <Stat label={t('reports.sales.totalAmount')} value={formatMoney(data.totalAmountRwf)} />
            <Stat
              label={t('reports.sales.average')}
              value={t('reports.sales.perKg', { amount: formatMoney(Number(data.averagePricePerKg)) })}
            />
          </div>
        </>
      )}
    </Section>
  )
}

export function MoneySection({ data }) {
  const { t } = useTranslation()
  const quietWeek = data.sharedRwf === 0 && data.paidRwf === 0

  return (
    <Section title={t('reports.money.title')} icon={Wallet}>
      <div className="grid gap-3 sm:grid-cols-3">
        {!quietWeek && (
          <>
            <Stat label={t('reports.money.shared')} value={formatMoney(data.sharedRwf)}>
              {data.sharedRwf > 0 &&
                t('reports.money.sharedNote', {
                  deductions: formatMoney(data.shareDeductionsRwf),
                  net: formatMoney(data.sharedNetRwf),
                })}
            </Stat>
            <Stat label={t('reports.money.paid')} value={formatMoney(data.paidRwf)}>
              <ul>
                {data.paidByMethod.map((line) => (
                  <li key={line.method} className="flex justify-between gap-3">
                    <span>{t(`payments.methods.${line.method}`, { defaultValue: line.method })}</span>
                    <span>{formatMoney(line.amountRwf)}</span>
                  </li>
                ))}
              </ul>
            </Stat>
          </>
        )}
        <Stat label={t('reports.money.owed')} value={formatMoney(data.owedNowRwf)} now />
      </div>
      {quietWeek && <NoActivity />}
    </Section>
  )
}

export function ConfirmationsSection({ data }) {
  const { t } = useTranslation()
  const quietWeek = data.confirmedThisWeek === 0 && data.disputesSettledThisWeek === 0 && data.pendingFromThisWeek === 0

  return (
    <Section title={t('reports.confirmations.title')} icon={Scale}>
      <div className={statGrid}>
        {!quietWeek && (
          <>
            <Stat label={t('reports.confirmations.confirmed')} value={formatNumber(data.confirmedThisWeek)}>
              <ul>
                {data.confirmedByMethod.map((line) => (
                  <li key={line.method}>
                    {t(`confirmation.method.${line.method}`, { defaultValue: line.method })}: {formatNumber(line.deliveries)}
                  </li>
                ))}
              </ul>
            </Stat>
            <Stat label={t('reports.confirmations.settled')} value={formatNumber(data.disputesSettledThisWeek)} />
          </>
        )}
        <Stat label={t('reports.confirmations.pending')} value={formatNumber(data.pendingNow)} now>
          {data.pendingFromThisWeek > 0 && t('reports.confirmations.pendingFromWeek', { count: data.pendingFromThisWeek })}
        </Stat>
        <Stat label={t('reports.confirmations.openDisputes')} value={formatNumber(data.disputedNow)} now />
      </div>
      {quietWeek && <NoActivity />}
    </Section>
  )
}
