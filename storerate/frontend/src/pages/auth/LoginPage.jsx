import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { AuthLayout } from './AuthLayout.jsx';
import { FormField, PasswordField } from '../../components/forms/FormField.jsx';
import { Button, Alert } from '../../components/ui/index.jsx';
import { validateEmail, validateRequired, validateForm } from '../../utils/validators.js';
import { ROLE_HOME } from '../../utils/roles.js';

const DEMO_ACCOUNTS = [
  { label: 'Admin', email: 'admin@storerate.com', password: 'Admin@1234' },
  { label: 'Normal user', email: 'user1@storerate.com', password: 'User@12345' },
  { label: 'Store owner', email: 'owner1@storerate.com', password: 'Owner@1234' },
];

const SHOW_DEMO = import.meta.env.VITE_SHOW_DEMO_CREDENTIALS !== 'false';

const VALIDATORS = {
  email: validateEmail,
  password: (value) => validateRequired(value, 'Password'),
};

export function LoginPage() {
  const { login, sessionExpired } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [values, setValues] = useState({ email: '', password: '' });
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
    const validation = validateForm(values, VALIDATORS);
    setErrors(validation);
    if (Object.keys(validation).length) return;

    setSubmitting(true);
    setFormError('');
    try {
      const user = await login(values);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}!`);
      const redirectTo = location.state?.from?.pathname || ROLE_HOME[user.role] || '/';
      navigate(redirectTo, { replace: true });
    } catch (error) {
      setErrors(error.fieldErrors ?? {});
      setFormError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Sign in"
      subtitle="Sign in to your account"
      footer={
        <>
          New here? <Link to="/signup">Create an account</Link>
        </>
      }
    >
      <form className="form" onSubmit={handleSubmit} noValidate>
        {sessionExpired && !formError && (
          <Alert type="warning">Your session has ended. Please sign in again.</Alert>
        )}
        <Alert type="error">{formError}</Alert>
        <FormField
          label="Email"
          name="email"
          type="email"
          value={values.email}
          onChange={setField}
          error={errors.email}
          autoComplete="email"
          placeholder="you@example.com"
          required
        />
        <PasswordField
          label="Password"
          name="password"
          value={values.password}
          onChange={setField}
          error={errors.password}
          autoComplete="current-password"
          required
        />
        <Button type="submit" size="lg" block loading={submitting}>
          Sign in
        </Button>
      </form>

      {SHOW_DEMO && (
        <div className="demo-box">
          <div className="demo-box__title">Demo accounts (seeded data)</div>
          <div className="demo-box__list">
            {DEMO_ACCOUNTS.map((account) => (
              <Button
                key={account.email}
                variant="secondary"
                size="sm"
                onClick={() => setValues({ email: account.email, password: account.password })}
              >
                {account.label}
              </Button>
            ))}
          </div>
          <p className="text-muted mt-1">Click a role to fill the form, then sign in.</p>
        </div>
      )}
    </AuthLayout>
  );
}
