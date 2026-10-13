import { useTranslation } from 'react-i18next'

const MAX_PAGE_BUTTONS = 5

// result is the backend's PageResponse (page is 0-based; buttons show page + 1). Nothing is shown
// when everything fits on one page.
export default function Pagination({ result, onPageChange, className }) {
  const { t } = useTranslation()
  const { page, size, totalPages, totalElements, content } = result
  if (totalPages <= 1) return null

  const from = page * size + 1
  const to = page * size + content.length
  const first = Math.max(0, Math.min(page - 2, totalPages - MAX_PAGE_BUTTONS))
  const pageNumbers = []
  for (let number = first; number < Math.min(totalPages, first + MAX_PAGE_BUTTONS); number++) {
    pageNumbers.push(number)
  }

  const buttonClass =
    'min-h-9 rounded-md border border-text/10 bg-surface px-3 py-1 text-sm text-text hover:bg-background disabled:cursor-not-allowed disabled:opacity-50'

  return (
    <nav aria-label={t('pagination.label')} className={className}>
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <p className="text-muted">{t('pagination.showing', { from, to, total: totalElements })}</p>
        <div className="flex flex-wrap items-center gap-1">
          <button type="button" className={buttonClass} disabled={page === 0} onClick={() => onPageChange(page - 1)}>
            {t('pagination.previous')}
          </button>
          {pageNumbers.map((number) => (
            <button
              key={number}
              type="button"
              aria-current={number === page ? 'page' : undefined}
              className={
                number === page ? 'min-h-9 rounded-md bg-primary px-3 py-1 text-sm font-medium text-white' : buttonClass
              }
              onClick={() => onPageChange(number)}
            >
              {number + 1}
            </button>
          ))}
          <button
            type="button"
            className={buttonClass}
            disabled={page >= totalPages - 1}
            onClick={() => onPageChange(page + 1)}
          >
            {t('pagination.next')}
          </button>
        </div>
      </div>
    </nav>
  )
}
