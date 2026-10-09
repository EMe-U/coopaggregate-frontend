import { useTranslation } from 'react-i18next'

const MAX_PAGE_BUTTONS = 5

// page is 0-based, like the backend. Page buttons show page + 1.
export default function Pagination({ page, totalPages, summary, onPageChange }) {
  const { t } = useTranslation()

  const first = Math.max(0, Math.min(page - 2, totalPages - MAX_PAGE_BUTTONS))
  const pageNumbers = []
  for (let number = first; number < Math.min(totalPages, first + MAX_PAGE_BUTTONS); number++) {
    pageNumbers.push(number)
  }

  const buttonClass =
    'rounded-md border border-text/10 bg-surface px-3 py-1 text-sm text-text hover:bg-background disabled:cursor-not-allowed disabled:opacity-50'

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
      <p className="text-muted">{summary}</p>
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            className={buttonClass}
            disabled={page === 0}
            onClick={() => onPageChange(page - 1)}
          >
            {t('members.pagination.previous')}
          </button>
          {pageNumbers.map((number) => (
            <button
              key={number}
              type="button"
              aria-current={number === page ? 'page' : undefined}
              className={
                number === page
                  ? 'rounded-md bg-primary px-3 py-1 text-sm font-medium text-white'
                  : buttonClass
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
            {t('members.pagination.next')}
          </button>
        </div>
      )}
    </div>
  )
}
