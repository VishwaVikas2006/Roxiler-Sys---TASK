import { useMemo } from 'react';
import { Link } from 'react-router';
import { adminApi } from '../../api/admin.api.js';
import { useAsync } from '../../hooks/useAsync.js';
import { useListQuery } from '../../hooks/useListQuery.js';
import { DataTable, TableFooter } from '../../components/table/DataTable.jsx';
import { FilterBar } from '../../components/table/FilterBar.jsx';
import { Card, LinkButton, PageHeader } from '../../components/ui/index.jsx';
import { RatingDisplay } from '../../components/rating/Rating.jsx';

const FILTER_KEYS = ['name', 'email', 'address'];
const FILTER_FIELDS = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'address', label: 'Address' },
];

export function StoresPage() {
  const list = useListQuery({ defaultSort: 'name', filterKeys: FILTER_KEYS });
  const { data, loading, error, reload } = useAsync(
    () => adminApi.listStores(list.params),
    [JSON.stringify(list.params)],
  );

  const columns = useMemo(
    () => [
      {
        key: 'name',
        label: 'Store',
        sortable: true,
        render: (row) => <span style={{ fontWeight: 600 }}>{row.name}</span>,
      },
      { key: 'email', label: 'Email', sortable: true, className: 'cell--muted' },
      { key: 'address', label: 'Address', sortable: true, className: 'cell--address' },
      {
        key: 'owner',
        label: 'Owner',
        render: (row) => (
          <Link to={`/admin/users/${row.owner.id}`} title={row.owner.email}>
            {row.owner.name}
          </Link>
        ),
      },
      {
        key: 'rating',
        label: 'Rating',
        sortable: true,
        render: (row) => <RatingDisplay value={row.averageRating} count={row.ratingCount} />,
      },
    ],
    [],
  );

  return (
    <>
      <PageHeader
        title="Stores"
        subtitle="Every store registered on the platform with its overall rating."
        actions={<LinkButton to="/admin/stores/new">+ Add store</LinkButton>}
      />
      <Card className="table-card">
        <FilterBar
          fields={FILTER_FIELDS}
          filters={list.filters}
          setFilters={list.setFilters}
          clearFilters={list.clearFilters}
        />
        <DataTable
          columns={columns}
          rows={data?.data}
          loading={loading}
          error={error}
          onRetry={reload}
          sort={{ sortBy: list.sortBy, order: list.order, onToggle: list.toggleSort }}
          emptyTitle="No stores match these filters"
        />
        <TableFooter meta={data?.meta} onPageChange={list.setPage} onLimitChange={list.setLimit} />
      </Card>
    </>
  );
}
