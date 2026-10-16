import { useState } from 'react';
import { useNavigate } from 'react-router';
import { authApi } from '../../api/auth.api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { PasswordField } from '../../components/forms/FormField.jsx';
import { Button, Card, CardBody, PageHeader, Alert } from '../../components/ui/index.jsx';
import { validatePassword, validateRequired } from '../../utils/validators.js';
import { ROLE_HOME } from '../../utils/roles.js';

const INITIAL = { currentPassword: '', newPassword: '', confirmPassword: '' };

function validate(values) {
  const errors = {};
  const current = validateRequired(values.currentPassword, 'Current password');
  if (current) errors.currentPassword = current;

  const next = validatePassword(values.newPassword);
  if (next) errors.newPassword = next;
  else if (values.newPassword === values.currentPassword) {
    errors.newPassword = 'New password must be different from the current password';
  }

  if (!values.confirmPassword) errors.confirmPassword = 'Please confirm your new password';
  else if (values.confirmPassword !== values.newPassword) errors.confirmPassword = 'Passwords do not match';

  return errors;
}

export function ChangePasswordPage() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [values, setValues] = useState(INITIAL);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const setField = (e) => {
    const { name, value } = e.target;
    setValues((v) => ({ ...v, [name]: value }));
    if (errors[name]) setErrors((er) => ({ ...er, [name]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validation = validate(values);
    setErrors(validation);
    if (Object.keys(validation).length) return;

    setSubmitting(true);
    setFormError('');
    try {
      await authApi.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      toast.success('Password updated successfully');
      setValues(INITIAL);
      navigate(ROLE_HOME[user.role] ?? '/');
    } catch (error) {
      setErrors(error.fieldErrors ?? {});
      setFormError(error.fieldErrors && Object.keys(error.fieldErrors).length ? '' : error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page--narrow" style={{ margin: '0 auto' }}>
      <PageHeader title="Change password" subtitle="Choose a strong password you don't use elsewhere." />
      <Card>
        <CardBody>
          <form className="form" onSubmit={handleSubmit} noValidate>
            <Alert type="error">{formError}</Alert>
            <PasswordField
              label="Current password"
              name="currentPassword"
              value={values.currentPassword}
              onChange={setField}
              error={errors.currentPassword}
              autoComplete="current-password"
              required
            />
            <PasswordField
              label="New password"
              name="newPassword"
              value={values.newPassword}
              onChange={setField}
              error={errors.newPassword}
              autoComplete="new-password"
              showRules
              required
            />
            <PasswordField
              label="Confirm new password"
              name="confirmPassword"
              value={values.confirmPassword}
              onChange={setField}
              error={errors.confirmPassword}
              autoComplete="new-password"
              required
            />
            <div className="form-actions">
              <Button variant="secondary" onClick={() => navigate(-1)}>
                Cancel
              </Button>
              <Button type="submit" loading={submitting}>
                Update password
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
