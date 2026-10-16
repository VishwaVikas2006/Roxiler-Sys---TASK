import { useMemo } from 'react';
import { Link } from 'react-router';
import { adminApi } from '../../api/admin.api.js';
import { useAsync } from '../../hooks/useAsync.js';
import { useListQuery } from '../../hooks/useListQuery.js';
import { DataTable, TableFooter } from '../../components/table/DataTable.jsx';
import { FilterBar } from '../../components/table/FilterBar.jsx';
import { Card, LinkButton, PageHeader, RoleBadge } from '../../components/ui/index.jsx';
import { ROLE_OPTIONS } from '../../utils/roles.js';
import { formatDate } from '../../utils/format.js';

const FILTER_KEYS = ['name', 'email', 'address', 'role'];

const FILTER_FIELDS = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'address', label: 'Address' },
  {
    key: 'role',
    label: 'Role',
    type: 'select',
    options: [{ value: '', label: 'All roles' }, ...ROLE_OPTIONS],
  },
];

export function UsersPage() {
  const list = useListQuery({ defaultSort: 'name', filterKeys: FILTER_KEYS });
  const { data, loading, error, reload } = useAsync(
    () => adminApi.listUsers(list.params),
    [JSON.stringify(list.params)],
  );

  const columns = useMemo(
    () => [
      {
        key: 'name',
        label: 'Name',
        sortable: true,
        render: (row) => (
          <Link to={`/admin/users/${row.id}`} style={{ fontWeight: 600 }}>
            {row.name}
          </Link>
        ),
      },
      { key: 'email', label: 'Email', sortable: true, className: 'cell--muted' },
      { key: 'address', label: 'Address', sortable: true, className: 'cell--address' },
      { key: 'role', label: 'Role', sortable: true, render: (row) => <RoleBadge role={row.role} /> },
      {
        key: 'createdAt',
        label: 'Joined',
        sortable: true,
        className: 'cell--muted',
        render: (row) => formatDate(row.createdAt),
      },
      {
        key: 'actions',
        label: '',
        className: 'cell--actions',
        render: (row) => (
          <LinkButton to={`/admin/users/${row.id}`} variant="secondary" size="sm">
            View
          </LinkButton>
        ),
      },
    ],
    [],
  );

  return (
    <>
      <PageHeader
        title="Users"
        subtitle="All registered accounts — normal users, store owners and administrators."
        actions={<LinkButton to="/admin/users/new">+ Add user</LinkButton>}
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
          emptyTitle="No users match these filters"
          emptyHint="Try clearing a filter or two."
        />
        <TableFooter meta={data?.meta} onPageChange={list.setPage} onLimitChange={list.setLimit} />
      </Card>
    </>
  );
}
