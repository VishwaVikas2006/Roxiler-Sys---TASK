import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { adminApi } from '../../api/admin.api.js';
import { useToast } from '../../context/ToastContext.jsx';
import { FormField, PasswordField } from '../../components/forms/FormField.jsx';
import { Button, Card, CardBody, PageHeader, Alert } from '../../components/ui/index.jsx';
import {
  validateName,
  validateEmail,
  validateAddress,
  validatePassword,
  validateForm,
  LIMITS,
} from '../../utils/validators.js';
import { ROLE_OPTIONS, ROLES, roleLabel } from '../../utils/roles.js';

const VALIDATORS = {
  name: validateName,
  email: validateEmail,
  password: validatePassword,
  address: validateAddress,
  role: (value) => (Object.values(ROLES).includes(value) ? null : 'Select a role'),
};

export function AddUserPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const presetRole = searchParams.get('role');

  const [values, setValues] = useState({
    name: '',
    email: '',
    password: '',
    address: '',
    role: Object.values(ROLES).includes(presetRole) ? presetRole : ROLES.USER,
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const setField = (e) => {
    const { name, value } = e.target;
    setValues((v) => ({ ...v, [name]: value }));
    if (errors[name]) setErrors((er) => ({ ...er, [name]: undefined }));
  };

  const onBlur = (e) => {
    const { name, value } = e.target;
    setErrors((er) => ({ ...er, [name]: VALIDATORS[name](value) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validation = validateForm(values, VALIDATORS);
    setErrors(validation);
    if (Object.keys(validation).length) return;

    setSubmitting(true);
    setFormError('');
    try {
      const { user } = await adminApi.createUser(values);
      toast.success(`${roleLabel(user.role)} "${user.name}" created`);
      const returnTo = searchParams.get('returnTo');
      navigate(returnTo || `/admin/users/${user.id}`);
    } catch (error) {
      setErrors(error.fieldErrors ?? {});
      setFormError(Object.keys(error.fieldErrors ?? {}).length ? '' : error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page--narrow" style={{ margin: '0 auto' }}>
      <Link to="/admin/users" className="back-link">
        ← Back to users
      </Link>
      <PageHeader title="Add user" subtitle="Create a normal user, store owner or another administrator." />
      <Card>
        <CardBody>
          <form className="form" onSubmit={handleSubmit} noValidate>
            <Alert type="error">{formError}</Alert>
            <FormField
              label="Full name"
              name="name"
              value={values.name}
              onChange={setField}
              onBlur={onBlur}
              error={errors.name}
              hint={`${LIMITS.NAME_MIN}–${LIMITS.NAME_MAX} characters`}
              maxLength={LIMITS.NAME_MAX}
              showCount
              required
            />
            <div className="form-grid">
              <FormField
                label="Email"
                name="email"
                type="email"
                value={values.email}
                onChange={setField}
                onBlur={onBlur}
                error={errors.email}
                required
              />
              <FormField
                label="Role"
                name="role"
                as="select"
                value={values.role}
                onChange={setField}
                error={errors.role}
                options={ROLE_OPTIONS}
                required
              />
            </div>
            <PasswordField
              label="Password"
              name="password"
              value={values.password}
              onChange={setField}
              onBlur={onBlur}
              error={errors.password}
              autoComplete="new-password"
              showRules
              required
            />
            <FormField
              label="Address"
              name="address"
              as="textarea"
              value={values.address}
              onChange={setField}
              onBlur={onBlur}
              error={errors.address}
              maxLength={LIMITS.ADDRESS_MAX}
              showCount
              required
            />
            {values.role === ROLES.STORE_OWNER && (
              <Alert type="info">
                After creating this store owner, assign them a store from <strong>Stores → Add store</strong>.
              </Alert>
            )}
            <div className="form-actions">
              <Button variant="secondary" onClick={() => navigate('/admin/users')}>
                Cancel
              </Button>
              <Button type="submit" loading={submitting}>
                Create user
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
