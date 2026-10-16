import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { adminApi } from '../../api/admin.api.js';
import { useAsync } from '../../hooks/useAsync.js';
import { useToast } from '../../context/ToastContext.jsx';
import { FormField, PasswordField } from '../../components/forms/FormField.jsx';
import { Button, Card, CardBody, PageHeader, Alert } from '../../components/ui/index.jsx';
import {
  validateName,
  validateEmail,
  validateAddress,
  validatePassword,
  LIMITS,
} from '../../utils/validators.js';

const STORE_VALIDATORS = { name: validateName, email: validateEmail, address: validateAddress };
const OWNER_VALIDATORS = {
  'owner.name': validateName,
  'owner.email': validateEmail,
  'owner.password': validatePassword,
  'owner.address': validateAddress,
};

export function AddStorePage() {
  const toast = useToast();
  const navigate = useNavigate();
  const owners = useAsync(() => adminApi.unassignedOwners(), []);

  const [mode, setMode] = useState('existing'); // 'existing' | 'new'
  const [store, setStore] = useState({ name: '', email: '', address: '' });
  const [ownerId, setOwnerId] = useState('');
  const [owner, setOwner] = useState({ name: '', email: '', password: '', address: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const clearError = (key) => errors[key] && setErrors((er) => ({ ...er, [key]: undefined }));

  const setStoreField = (e) => {
    const { name, value } = e.target;
    setStore((s) => ({ ...s, [name]: value }));
    clearError(name);
  };
  const setOwnerField = (e) => {
    const { name, value } = e.target;
    setOwner((o) => ({ ...o, [name]: value }));
    clearError(`owner.${name}`);
  };
  const blurStore = (e) =>
    setErrors((er) => ({ ...er, [e.target.name]: STORE_VALIDATORS[e.target.name](e.target.value) }));
  const blurOwner = (e) =>
    setErrors((er) => ({
      ...er,
      [`owner.${e.target.name}`]: OWNER_VALIDATORS[`owner.${e.target.name}`](e.target.value),
    }));

  const validate = () => {
    const next = {};
    for (const [key, fn] of Object.entries(STORE_VALIDATORS)) {
      const message = fn(store[key]);
      if (message) next[key] = message;
    }
    if (mode === 'existing') {
      if (!ownerId) next.ownerId = 'Select a store owner';
    } else {
      for (const [key, fn] of Object.entries(OWNER_VALIDATORS)) {
        const message = fn(owner[key.replace('owner.', '')]);
        if (message) next[key] = message;
      }
    }
    return next;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validation = validate();
    setErrors(validation);
    if (Object.keys(validation).length) return;

    setSubmitting(true);
    setFormError('');
    try {
      const payload = mode === 'existing' ? { ...store, ownerId: Number(ownerId) } : { ...store, owner };
      const { store: created } = await adminApi.createStore(payload);
      toast.success(`Store "${created.name}" created`);
      navigate('/admin/stores');
    } catch (error) {
      setErrors(error.fieldErrors ?? {});
      setFormError(Object.keys(error.fieldErrors ?? {}).length ? '' : error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const availableOwners = owners.data?.data ?? [];

  return (
    <div className="page--narrow" style={{ margin: '0 auto' }}>
      <Link to="/admin/stores" className="back-link">
        ← Back to stores
      </Link>
      <PageHeader
        title="Add store"
        subtitle="Register a store and link it to the account that will manage it."
      />
      <Card>
        <CardBody>
          <form className="form" onSubmit={handleSubmit} noValidate>
            <Alert type="error">{formError}</Alert>

            <FormField
              label="Store name"
              name="name"
              value={store.name}
              onChange={setStoreField}
              onBlur={blurStore}
              error={errors.name}
              hint={`${LIMITS.NAME_MIN}–${LIMITS.NAME_MAX} characters`}
              maxLength={LIMITS.NAME_MAX}
              showCount
              required
            />
            <FormField
              label="Store email"
              name="email"
              type="email"
              value={store.email}
              onChange={setStoreField}
              onBlur={blurStore}
              error={errors.email}
              required
            />
            <FormField
              label="Store address"
              name="address"
              as="textarea"
              value={store.address}
              onChange={setStoreField}
              onBlur={blurStore}
              error={errors.address}
              maxLength={LIMITS.ADDRESS_MAX}
              showCount
              required
            />

            <div className="field">
              <span className="field__label">
                Store owner<span className="req">*</span>
              </span>
              <div className="stack" style={{ gap: 10 }}>
                <label className={`radio-card ${mode === 'existing' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="mode"
                    value="existing"
                    checked={mode === 'existing'}
                    onChange={() => setMode('existing')}
                  />
                  <div>
                    <div className="radio-card__title">Assign an existing store owner</div>
                    <div className="radio-card__desc">
                      Store-owner accounts that don't manage a store yet.
                    </div>
                  </div>
                </label>
                <label className={`radio-card ${mode === 'new' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="mode"
                    value="new"
                    checked={mode === 'new'}
                    onChange={() => setMode('new')}
                  />
                  <div>
                    <div className="radio-card__title">Create a new store-owner account</div>
                    <div className="radio-card__desc">
                      The owner account and the store are created together.
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {mode === 'existing' ? (
              <div className="subform">
                <FormField
                  label="Owner"
                  name="ownerId"
                  as="select"
                  value={ownerId}
                  onChange={(e) => {
                    setOwnerId(e.target.value);
                    clearError('ownerId');
                  }}
                  error={errors.ownerId}
                  hint={
                    owners.loading
                      ? 'Loading owners…'
                      : availableOwners.length === 0
                        ? 'No unassigned store owners. Create a new owner below instead.'
                        : `${availableOwners.length} available`
                  }
                  required
                >
                  <option value="">Select an owner…</option>
                  {availableOwners.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.name} — {candidate.email}
                    </option>
                  ))}
                </FormField>
              </div>
            ) : (
              <div className="subform stack">
                <FormField
                  label="Owner full name"
                  name="name"
                  value={owner.name}
                  onChange={setOwnerField}
                  onBlur={blurOwner}
                  error={errors['owner.name']}
                  hint={`${LIMITS.NAME_MIN}–${LIMITS.NAME_MAX} characters`}
                  maxLength={LIMITS.NAME_MAX}
                  showCount
                  required
                />
                <div className="form-grid">
                  <FormField
                    label="Owner email"
                    name="email"
                    type="email"
                    value={owner.email}
                    onChange={setOwnerField}
                    onBlur={blurOwner}
                    error={errors['owner.email']}
                    required
                  />
                  <PasswordField
                    label="Owner password"
                    name="password"
                    value={owner.password}
                    onChange={setOwnerField}
                    onBlur={blurOwner}
                    error={errors['owner.password']}
                    autoComplete="new-password"
                    showRules
                    required
                  />
                </div>
                <FormField
                  label="Owner address"
                  name="address"
                  as="textarea"
                  value={owner.address}
                  onChange={setOwnerField}
                  onBlur={blurOwner}
                  error={errors['owner.address']}
                  maxLength={LIMITS.ADDRESS_MAX}
                  showCount
                  required
                />
              </div>
            )}

            <div className="form-actions">
              <Button variant="secondary" onClick={() => navigate('/admin/stores')}>
                Cancel
              </Button>
              <Button type="submit" loading={submitting}>
                Create store
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
