import { useMemo } from 'react';
import { ownerApi } from '../../api/owner.api.js';
import { useAsync } from '../../hooks/useAsync.js';
import { useListQuery } from '../../hooks/useListQuery.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { DataTable, TableFooter } from '../../components/table/DataTable.jsx';
import {
  Card,
  CardHeader,
  CardBody,
  StatCard,
  PageHeader,
  Alert,
  Spinner,
} from '../../components/ui/index.jsx';
import { Stars } from '../../components/rating/Rating.jsx';
import { StarIcon, ReceiptIcon, CalendarIcon } from '../../components/ui/Icons.jsx';
import { formatDateTime, pluralize } from '../../utils/format.js';

export function OwnerDashboardPage() {
  const { user } = useAuth();
  const dashboard = useAsync(() => ownerApi.dashboard(), []);
  const list = useListQuery({ defaultSort: 'createdAt', defaultOrder: 'desc', filterKeys: [] });
  const ratings = useAsync(() => ownerApi.ratings(list.params), [JSON.stringify(list.params)]);

  const columns = useMemo(
    () => [
      {
        key: 'name',
        label: 'Customer',
        sortable: true,
        render: (row) => <span style={{ fontWeight: 600 }}>{row.user.name}</span>,
      },
      {
        key: 'email',
        label: 'Email',
        sortable: true,
        className: 'cell--muted',
        render: (row) => row.user.email,
      },
      {
        key: 'rating',
        label: 'Rating',
        sortable: true,
        render: (row) => (
          <span className="row" style={{ gap: 8 }}>
            <Stars value={row.rating} />
            <span style={{ fontWeight: 600 }}>{row.rating}/5</span>
          </span>
        ),
      },
      {
        key: 'createdAt',
        label: 'Submitted',
        sortable: true,
        className: 'cell--muted',
        render: (row) => (
          <span
            title={row.updatedAt !== row.createdAt ? `Updated ${formatDateTime(row.updatedAt)}` : undefined}
          >
            {formatDateTime(row.createdAt)}
            {row.updatedAt !== row.createdAt && <span className="text-faint"> (edited)</span>}
          </span>
        ),
      },
    ],
    [],
  );

  if (dashboard.loading) return <Spinner label="Loading your store…" />;
  if (dashboard.error) return <Alert type="error">{dashboard.error.message}</Alert>;

  const store = dashboard.data?.store;

  if (!store) {
    return (
      <>
        <PageHeader title="My store" subtitle={`Hi ${user.name.split(' ')[0]}, welcome to StoreRate.`} />
        <Alert type="warning">
          No store has been assigned to your account yet. Please contact a system administrator to link your
          store.
        </Alert>
      </>
    );
  }

  const average = store.averageRating;

  return (
    <>
      <PageHeader title={store.name} subtitle={`${store.email} · ${store.address}`} />

      <div className="grid-stats">
        <Card className="stat-card">
          <div className="stat-card__icon" aria-hidden="true">
            <StarIcon />
          </div>
          <div>
            <div className="stat-card__label">Average rating</div>
            <div className="big-rating">
              <span className="big-rating__value">{average === null ? '—' : average.toFixed(1)}</span>
              <span className="big-rating__max">/ 5</span>
            </div>
            {average !== null && <Stars value={Math.round(average)} />}
          </div>
        </Card>
        <StatCard icon={<ReceiptIcon />} label="Total ratings" value={store.ratingCount} />
        <StatCard
          icon={<CalendarIcon />}
          label="Store since"
          value={new Date(store.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
        />
      </div>

      <Card className="table-card mt-3">
        <CardHeader
          title="Customers who rated your store"
          subtitle={store.ratingCount ? pluralize(store.ratingCount, 'rating') : 'No ratings yet'}
        />
        <DataTable
          columns={columns}
          rows={ratings.data?.data}
          loading={ratings.loading}
          error={ratings.error}
          onRetry={ratings.reload}
          sort={{ sortBy: list.sortBy, order: list.order, onToggle: list.toggleSort }}
          emptyTitle="No ratings yet"
          emptyHint="Ratings submitted by customers will show up here."
        />
        <TableFooter meta={ratings.data?.meta} onPageChange={list.setPage} onLimitChange={list.setLimit} />
      </Card>
    </>
  );
}
