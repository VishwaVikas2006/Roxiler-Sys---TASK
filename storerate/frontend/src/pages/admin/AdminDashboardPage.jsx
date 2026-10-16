import { adminApi } from '../../api/admin.api.js';
import { useAsync } from '../../hooks/useAsync.js';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  StatCard,
  Card,
  CardHeader,
  CardBody,
  LinkButton,
  Alert,
  Button,
} from '../../components/ui/index.jsx';
import { PageHeader } from '../../components/ui/index.jsx';
import { UsersIcon, StoreIcon, StarIcon } from '../../components/ui/Icons.jsx';

export function AdminDashboardPage() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useAsync(() => adminApi.dashboard(), []);

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={`Welcome back, ${user.name}. Here's what's happening on the platform.`}
        actions={
          <>
            <LinkButton to="/admin/users/new" variant="secondary">
              + Add user
            </LinkButton>
            <LinkButton to="/admin/stores/new">+ Add store</LinkButton>
          </>
        }
      />

      {error && (
        <Alert type="error" className="mt-2">
          {error.message}{' '}
          <Button variant="ghost" size="sm" onClick={reload}>
            Retry
          </Button>
        </Alert>
      )}

      <div className="grid-stats">
        <StatCard
          icon={<UsersIcon />}
          label="Total users"
          value={data?.totalUsers ?? '—'}
          loading={loading}
        />
        <StatCard
          icon={<StoreIcon />}
          label="Total stores"
          value={data?.totalStores ?? '—'}
          loading={loading}
        />
        <StatCard
          icon={<StarIcon />}
          label="Ratings submitted"
          value={data?.totalRatings ?? '—'}
          loading={loading}
        />
      </div>

      <div className="grid-2 mt-3">
        <Card>
          <CardHeader title="Manage users" subtitle="Browse, filter and inspect every account." />
          <CardBody>
            <div className="quick-actions">
              <LinkButton to="/admin/users" variant="secondary">
                View all users
              </LinkButton>
              <LinkButton to="/admin/users?role=store_owner" variant="ghost">
                Store owners
              </LinkButton>
              <LinkButton to="/admin/users?role=admin" variant="ghost">
                Administrators
              </LinkButton>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Manage stores" subtitle="See ratings at a glance and onboard new stores." />
          <CardBody>
            <div className="quick-actions">
              <LinkButton to="/admin/stores" variant="secondary">
                View all stores
              </LinkButton>
              <LinkButton to="/admin/stores?sortBy=rating&order=desc" variant="ghost">
                Top rated
              </LinkButton>
            </div>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
