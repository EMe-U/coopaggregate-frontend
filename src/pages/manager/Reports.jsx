import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FileChartColumn, Printer } from 'lucide-react'
import { getWeeklyReport, listReportWeeks } from '../../api/reports'
import EmptyState from '../../components/EmptyState'
import PageTitle from '../../components/PageTitle'
import WeekPicker from '../../components/reports/WeekPicker'
import {
  ConfirmationsSection,
  DeliveriesSection,
  MoneySection,
  SalesSection,
  StockSection,
} from '../../components/reports/ReportSections'
import { currentMonday, weekLabel } from '../../components/reports/weeks'

export default function Reports() {
  const { t } = useTranslation()
  const [weekStart, setWeekStart] = useState(currentMonday)
  const [weeks, setWeeks] = useState([])
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let ignore = false
    // Without the list the picker still offers the current week and previous/next.
    listReportWeeks()
      .then((data) => !ignore && setWeeks(Array.isArray(data) ? data : []))
      .catch(() => {})
    return () => {
      ignore = true
    }
  }, [])

  useEffect(() => {
    let ignore = false
    setLoading(true)
    setLoadError(null)
    getWeeklyReport(weekStart)
      .then((data) => {
        if (!ignore) setReport(data)
      })
      .catch((error) => {
        if (!ignore) setLoadError(error.response?.data?.message || t('reports.error'))
      })
      .finally(() => {
        if (!ignore) setLoading(false)
      })
    return () => {
      ignore = true
    }
  }, [weekStart, reloadKey, t])

  const title = t('reports.printTitle', { name: t('app.cooperative') })
  const range = weekLabel(t, weekStart)

  // Browsers use the page title as the PDF's file name.
  function handlePrint() {
    const previousTitle = document.title
    document.title = `${title} (${range})`
    window.print()
    document.title = previousTitle
  }

  function renderReport() {
    if (loadError) {
      return (
        <div className="rounded-xl bg-surface shadow-sm">
          <EmptyState icon={FileChartColumn} title={loadError}>
            <button
              type="button"
              onClick={() => setReloadKey((key) => key + 1)}
              className="min-h-11 rounded-lg border border-text/10 px-4 text-sm font-medium text-primary hover:bg-background"
            >
              {t('reports.retry')}
            </button>
          </EmptyState>
        </div>
      )
    }
    if (!report) {
      return [0, 1, 2].map((index) => <div key={index} className="h-48 animate-pulse rounded-xl bg-surface shadow-sm" />)
    }
    return (
      <div className={`space-y-6 ${loading ? 'opacity-60' : ''}`}>
        <DeliveriesSection data={report.deliveries} />
        <StockSection data={report.stock} />
        <SalesSection data={report.sales} />
        <MoneySection data={report.money} />
        <ConfirmationsSection data={report.confirmations} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <header className="hidden border-b border-text/10 pb-3 print:block">
        <p className="text-lg font-bold text-text">{title}</p>
        <p className="text-sm font-medium text-primary">{range}</p>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <PageTitle className="mb-1 print:hidden">{t('reports.title')}</PageTitle>
          <p className="text-sm text-muted print:hidden">{t('reports.subtitle')}</p>
          <p className="mt-1 text-sm text-amber-800">{t('reports.nowNote')}</p>
        </div>
        <button
          type="button"
          onClick={handlePrint}
          disabled={!report || loading || Boolean(loadError)}
          className="flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60 print:hidden"
        >
          <Printer size={16} />
          {t('reports.print')}
        </button>
      </div>

      <WeekPicker weekStart={weekStart} weeks={weeks} onChange={setWeekStart} />

      {renderReport()}
    </div>
  )
}
