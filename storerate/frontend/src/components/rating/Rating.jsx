import { useId, useState } from 'react';
import { formatRating, pluralize } from '../../utils/format.js';

const CAPTIONS = { 1: 'Poor', 2: 'Fair', 3: 'Good', 4: 'Very good', 5: 'Excellent' };

/** Compact "★ 4.3 (12 ratings)" display, or a muted "No ratings yet". */
export function RatingDisplay({ value, count, showCount = true, emptyLabel = 'No ratings yet' }) {
  const formatted = formatRating(value);
  if (formatted === null) {
    return <span className="text-faint">{emptyLabel}</span>;
  }
  return (
    <span className="rating-display" title={`${formatted} out of 5`}>
      <span className="rating-display__star" aria-hidden="true">
        ★
      </span>
      <span className="rating-display__value">{formatted}</span>
      {showCount && count !== undefined && (
        <span className="rating-display__count">({pluralize(count, 'rating')})</span>
      )}
    </span>
  );
}

/** Five static stars with `value` filled. */
export function Stars({ value, size }) {
  return (
    <span
      className="stars"
      role="img"
      aria-label={`${value} out of 5 stars`}
      style={size ? { fontSize: size } : undefined}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={`stars__star ${n <= value ? 'filled' : ''}`} aria-hidden="true">
          ★
        </span>
      ))}
    </span>
  );
}

/**
 * Interactive star picker implemented as a radio group:
 * mouse hover previews, click selects, arrow keys work natively.
 */
export function StarInput({ value, onChange, name = 'rating', disabled }) {
  const id = useId();
  const [hovered, setHovered] = useState(0);
  const shown = hovered || value || 0;

  return (
    <div>
      <fieldset
        className="star-input"
        aria-label="Choose a rating from 1 to 5"
        onMouseLeave={() => setHovered(0)}
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <label
            key={n}
            className={`star-input__option ${n <= shown ? 'filled' : ''}`}
            onMouseEnter={() => !disabled && setHovered(n)}
            title={`${n} - ${CAPTIONS[n]}`}
          >
            <input
              type="radio"
              name={`${name}-${id}`}
              value={n}
              checked={value === n}
              onChange={() => onChange(n)}
              disabled={disabled}
              aria-label={`${n} star${n > 1 ? 's' : ''} - ${CAPTIONS[n]}`}
            />
            ★
          </label>
        ))}
      </fieldset>
      <div className="star-input__caption" aria-live="polite">
        {shown ? `${shown}/5 · ${CAPTIONS[shown]}` : 'Select a rating'}
      </div>
    </div>
  );
}
