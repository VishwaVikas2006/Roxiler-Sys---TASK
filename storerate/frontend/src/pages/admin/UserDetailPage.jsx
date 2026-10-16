import { Link, useParams } from 'react-router';
import { adminApi } from '../../api/admin.api.js';
import { useAsync } from '../../hooks/useAsync.js';
import {
  Card,
  CardHeader,
  CardBody,
  RoleBadge,
  Spinner,
  Alert,
  LinkButton,
} from '../../components/ui/index.jsx';
import { RatingDisplay } from '../../components/rating/Rating.jsx';
import { formatDateTime, pluralize } from '../../utils/format.js';
import { ROLES } from '../../utils/roles.js';

export function UserDetailPage() {
  const { id } = useParams();
  const { data, loading, error } = useAsync(() => adminApi.getUser(id), [id]);

  if (loading) return <Spinner label="Loading user…" />;
  if (error) {
    return (
      <>
        <Link to="/admin/users" className="back-link">
          ← Back to users
        </Link>
        <Alert type="error">{error.status === 404 ? 'User not found.' : error.message}</Alert>
      </>
    );
  }

  const { user, store } = data;

  return (
    <div className="page--narrow" style={{ margin: '0 auto' }}>
      <Link to="/admin/users" className="back-link">
        ← Back to users
      </Link>

      <Card>
        <CardHeader
          title={user.name}
          subtitle={`User #${user.id}`}
          actions={<RoleBadge role={user.role} />}
        />
        <CardBody>
          <dl className="detail-list">
            <dt>Email</dt>
            <dd>
              <a href={`mailto:${user.email}`}>{user.email}</a>
            </dd>
            <dt>Address</dt>
            <dd>{user.address}</dd>
            <dt>Role</dt>
            <dd>
              <RoleBadge role={user.role} />
            </dd>
            <dt>Joined</dt>
            <dd>{formatDateTime(user.createdAt)}</dd>
          </dl>
        </CardBody>
      </Card>

      {user.role === ROLES.STORE_OWNER && (
        <Card className="mt-2">
          <CardHeader title="Store" subtitle="This owner's store and its current rating." />
          <CardBody>
            {store ? (
              <div className="stack">
                <div className="row row--between">
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 17 }}>{store.name}</div>
                    <div className="text-muted text-sm">{store.email}</div>
                    <div className="text-muted text-sm">{store.address}</div>
                  </div>
                  <div className="text-right">
                    <div className="stat-card__label">Rating</div>
                    <div className="big-rating">
                      <span className="big-rating__value">
                        {store.averageRating === null ? '—' : store.averageRating.toFixed(1)}
                      </span>
                      <span className="big-rating__max">/ 5</span>
                    </div>
                    <div className="text-muted text-sm">
                      {store.ratingCount ? pluralize(store.ratingCount, 'rating') : 'No ratings yet'}
                    </div>
                  </div>
                </div>
                <div>
                  <RatingDisplay value={store.averageRating} count={store.ratingCount} />
                </div>
              </div>
            ) : (
              <div className="row row--between">
                <span className="text-muted">No store has been assigned to this owner yet.</span>
                <LinkButton to="/admin/stores/new" variant="secondary" size="sm">
                  Assign a store
                </LinkButton>
              </div>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
