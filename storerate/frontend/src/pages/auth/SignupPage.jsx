import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { AuthLayout } from './AuthLayout.jsx';
import { FormField, PasswordField } from '../../components/forms/FormField.jsx';
import { Button, Alert } from '../../components/ui/index.jsx';
import {
  validateName,
  validateEmail,
  validateAddress,
  validatePassword,
  validateForm,
  LIMITS,
} from '../../utils/validators.js';
import { ROLE_HOME } from '../../utils/roles.js';

const VALIDATORS = {
  name: validateName,
  email: validateEmail,
  address: validateAddress,
  password: validatePassword,
};

export function SignupPage() {
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [values, setValues] = useState({ name: '', email: '', address: '', password: '' });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const setField = (e) => {
    const { name, value } = e.target;
    setValues((v) => ({ ...v, [name]: value }));
    if (touched[name]) setErrors((er) => ({ ...er, [name]: VALIDATORS[name](value) }));
  };

  const onBlur = (e) => {
    const { name, value } = e.target;
    setTouched((t) => ({ ...t, [name]: true }));
    setErrors((er) => ({ ...er, [name]: VALIDATORS[name](value) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validation = validateForm(values, VALIDATORS);
    setErrors(validation);
    setTouched({ name: true, email: true, address: true, password: true });
    if (Object.keys(validation).length) return;

    setSubmitting(true);
    setFormError('');
    try {
      const user = await register(values);
      toast.success('Account created. Welcome to StoreRate!');
      navigate(ROLE_HOME[user.role], { replace: true });
    } catch (error) {
      setErrors(error.fieldErrors ?? {});
      setFormError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Create account"
      subtitle="Create your account to start rating stores"
      footer={
        <>
          Already registered? <Link to="/login">Sign in</Link>
        </>
      }
    >
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
          autoComplete="name"
          placeholder="e.g. Priya Lakshmi Narasimhan"
          required
        />
        <FormField
          label="Email"
          name="email"
          type="email"
          value={values.email}
          onChange={setField}
          onBlur={onBlur}
          error={errors.email}
          autoComplete="email"
          placeholder="you@example.com"
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
          hint={`Up to ${LIMITS.ADDRESS_MAX} characters`}
          maxLength={LIMITS.ADDRESS_MAX}
          showCount
          autoComplete="street-address"
          required
        />
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
        <Button type="submit" size="lg" block loading={submitting}>
          Create account
        </Button>
      </form>
    </AuthLayout>
  );
}
