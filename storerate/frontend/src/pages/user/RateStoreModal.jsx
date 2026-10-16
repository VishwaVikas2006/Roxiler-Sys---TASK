import { useState } from 'react';
import { storesApi } from '../../api/stores.api.js';
import { Modal, Button, Alert } from '../../components/ui/index.jsx';
import { StarInput, RatingDisplay } from '../../components/rating/Rating.jsx';

/** Submit a new rating or modify an existing one for a single store. */
export function RateStoreModal({ store, onClose, onSaved }) {
  const isEdit = Boolean(store.myRating);
  const [value, setValue] = useState(store.myRating ?? 0);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!value) {
      setError('Please choose a rating between 1 and 5 stars.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const result = await storesApi.rate(store.id, value);
      onSaved(store.id, result, !isEdit);
    } catch (err) {
      setError(err.fieldErrors?.rating ?? err.message);
      setSaving(false);
    }
  };

  return (
    <Modal
      title={isEdit ? 'Update your rating' : 'Rate this store'}
      onClose={saving ? undefined : onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="rate-form"
            loading={saving}
            disabled={!value || (isEdit && value === store.myRating)}
          >
            {isEdit ? 'Update rating' : 'Submit rating'}
          </Button>
        </>
      }
    >
      <form id="rate-form" onSubmit={handleSubmit} className="stack">
        <div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{store.name}</div>
          <div className="text-muted text-sm">{store.address}</div>
          <div className="mt-1">
            <RatingDisplay value={store.averageRating} count={store.ratingCount} />
          </div>
        </div>
        <Alert type="error">{error}</Alert>
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <p className="text-muted text-sm" style={{ marginBottom: 10 }}>
            How was your experience?
          </p>
          <StarInput value={value} onChange={setValue} disabled={saving} />
          {isEdit && <p className="text-faint text-sm mt-1">Your current rating is {store.myRating}/5.</p>}
        </div>
      </form>
    </Modal>
  );
}
