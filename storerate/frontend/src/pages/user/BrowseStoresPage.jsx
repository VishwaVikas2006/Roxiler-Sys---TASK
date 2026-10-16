import { useMemo, useState } from 'react';
import { storesApi } from '../../api/stores.api.js';
import { useAsync } from '../../hooks/useAsync.js';
import { useListQuery, useDebouncedFilters } from '../../hooks/useListQuery.js';
import { useToast } from '../../context/ToastContext.jsx';
import { DataTable, TableFooter } from '../../components/table/DataTable.jsx';
import { Card, Button, PageHeader } from '../../components/ui/index.jsx';
import { RatingDisplay, Stars } from '../../components/rating/Rating.jsx';
import { RateStoreModal } from './RateStoreModal.jsx';
import { formatDate } from '../../utils/format.js';
import { SearchIcon } from '../../components/ui/Icons.jsx';

const FILTER_KEYS = ['q'];

export function BrowseStoresPage() {
  const toast = useToast();
  const list = useListQuery({ defaultSort: 'name', filterKeys: FILTER_KEYS });
  const [draft, setDraftField] = useDebouncedFilters(list.filters, list.setFilters);
  const { data, loading, error, reload, setData } = useAsync(
    () => storesApi.browse(list.params),
    [JSON.stringify(list.params)],
  );
  const [rating, setRating] = useState(null); // store currently being rated

  const handleSaved = (storeId, result, isNew) => {
    // Update the row in place - no refetch needed.
    setData((current) => ({
      ...current,
      data: current.data.map((row) =>
        row.id === storeId
          ? {
              ...row,
              myRating: result.rating.rating,
              myRatingUpdatedAt: result.rating.updatedAt,
              averageRating: result.store.averageRating,
              ratingCount: result.store.ratingCount,
            }
          : row,
      ),
    }));
    toast.success(isNew ? 'Thanks! Your rating has been submitted.' : 'Your rating has been updated.');
    setRating(null);
  };

  const columns = useMemo(
    () => [
      {
        key: 'name',
        label: 'Store',
        sortable: true,
        render: (row) => <span style={{ fontWeight: 600 }}>{row.name}</span>,
      },
      { key: 'address', label: 'Address', sortable: true, className: 'cell--address' },
      {
        key: 'rating',
        label: 'Overall rating',
        sortable: true,
        render: (row) => <RatingDisplay value={row.averageRating} count={row.ratingCount} />,
      },
      {
        key: 'myRating',
        label: 'Your rating',
        sortable: true,
        render: (row) =>
          row.myRating ? (
            <span
              className="row"
              style={{ gap: 8 }}
              title={`Last updated ${formatDate(row.myRatingUpdatedAt)}`}
            >
              <Stars value={row.myRating} />
              <span style={{ fontWeight: 600 }}>{row.myRating}/5</span>
            </span>
          ) : (
            <span className="text-faint">Not rated yet</span>
          ),
      },
      {
        key: 'actions',
        label: '',
        className: 'cell--actions',
        render: (row) => (
          <Button variant={row.myRating ? 'secondary' : 'primary'} size="sm" onClick={() => setRating(row)}>
            {row.myRating ? 'Edit rating' : 'Rate store'}
          </Button>
        ),
      },
    ],
    [],
  );

  return (
    <>
      <PageHeader title="Stores" subtitle="Browse every registered store and share your experience." />

      <Card className="table-card">
        <div className="filter-bar" style={{ gridTemplateColumns: '1fr auto' }}>
          <div className="search-box">
            <span className="search-box__icon" aria-hidden="true">
              <SearchIcon />
            </span>
            <input
              className="input"
              type="search"
              placeholder="Search by store name or address…"
              value={draft.q}
              onChange={(e) => setDraftField('q', e.target.value)}
              aria-label="Search stores by name or address"
            />
          </div>
          <div className="filter-bar__actions">
            <Button variant="ghost" size="sm" onClick={list.clearFilters} disabled={!list.filters.q}>
              Clear
            </Button>
          </div>
        </div>
        <DataTable
          columns={columns}
          rows={data?.data}
          loading={loading}
          error={error}
          onRetry={reload}
          sort={{ sortBy: list.sortBy, order: list.order, onToggle: list.toggleSort }}
          emptyTitle={list.filters.q ? `No stores match "${list.filters.q}"` : 'No stores registered yet'}
          emptyHint={list.filters.q ? 'Try a different name or area.' : undefined}
        />
        <TableFooter meta={data?.meta} onPageChange={list.setPage} onLimitChange={list.setLimit} />
      </Card>

      {rating && <RateStoreModal store={rating} onClose={() => setRating(null)} onSaved={handleSaved} />}
    </>
  );
}
