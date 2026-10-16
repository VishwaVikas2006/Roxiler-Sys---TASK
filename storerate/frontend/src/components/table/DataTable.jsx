import { Button } from '../ui/index.jsx';
import { WarningIcon, InboxIcon } from '../ui/Icons.jsx';

/**
 * Generic sortable table.
 *
 * columns: [{ key, label, sortable?, render?(row), className?, width? }]
 * sort:    { sortBy, order, onToggle(key) }
 */
export function DataTable({
  columns,
  rows,
  rowKey = 'id',
  sort,
  loading,
  error,
  emptyTitle = 'Nothing here yet',
  emptyHint,
  onRetry,
}) {
  const hasRows = rows && rows.length > 0;

  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={column.className}
                style={column.width ? { width: column.width } : undefined}
                scope="col"
                aria-sort={
                  sort && sort.sortBy === column.key
                    ? sort.order === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : undefined
                }
              >
                {column.sortable && sort ? <SortButton column={column} sort={sort} /> : column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading && !hasRows && (
            <tr>
              <td colSpan={columns.length}>
                <div className="table-state">
                  <span className="spinner" aria-hidden="true" />
                  <div className="mt-1">Loading…</div>
                </div>
              </td>
            </tr>
          )}
          {error && !loading && (
            <tr>
              <td colSpan={columns.length}>
                <div className="table-state">
                  <div className="table-state__icon">
                    <WarningIcon />
                  </div>
                  <div className="table-state__title">Could not load data</div>
                  <div className="text-sm mt-1">{error.message}</div>
                  {onRetry && (
                    <Button variant="secondary" size="sm" className="mt-2" onClick={onRetry}>
                      Try again
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          )}
          {!loading && !error && !hasRows && (
            <tr>
              <td colSpan={columns.length}>
                <div className="table-state">
                  <div className="table-state__icon">
                    <InboxIcon />
                  </div>
                  <div className="table-state__title">{emptyTitle}</div>
                  {emptyHint && <div className="text-sm mt-1">{emptyHint}</div>}
                </div>
              </td>
            </tr>
          )}
          {hasRows &&
            rows.map((row) => (
              <tr key={row[rowKey]} style={loading ? { opacity: 0.55 } : undefined}>
                {columns.map((column) => (
                  <td key={column.key} className={column.className}>
                    {column.render ? column.render(row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

function SortButton({ column, sort }) {
  const active = sort.sortBy === column.key;
  return (
    <button
      type="button"
      className="sort-btn"
      onClick={() => sort.onToggle(column.key)}
      title={`Sort by ${column.label} ${active && sort.order === 'asc' ? 'descending' : 'ascending'}`}
    >
      {column.label}
      <span className="sort-btn__icon" aria-hidden="true">
        <span className={active && sort.order === 'asc' ? 'active' : ''}>▲</span>
        <span className={active && sort.order === 'desc' ? 'active' : ''}>▼</span>
      </span>
    </button>
  );
}

export function TableFooter({ meta, onPageChange, onLimitChange, limitOptions = [10, 25, 50] }) {
  if (!meta) return null;
  const { page, limit, total, totalPages } = meta;
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="table-footer">
      <span>{total === 0 ? 'No results' : `Showing ${from}–${to} of ${total}`}</span>
      <div className="pagination">
        {onLimitChange && (
          <label className="row" style={{ gap: 6 }}>
            <span className="text-sm">Rows</span>
            <select
              className="select"
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              aria-label="Rows per page"
            >
              {limitOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        )}
        <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          ‹ Prev
        </Button>
        <span className="text-sm">
          Page {page} / {totalPages}
        </span>
        <Button
          variant="secondary"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next ›
        </Button>
      </div>
    </div>
  );
}
