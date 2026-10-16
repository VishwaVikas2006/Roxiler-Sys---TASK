import { useId, useState } from 'react';
import { passwordChecks } from '../../utils/validators.js';

/**
 * Labelled input/select/textarea with hint + error wiring (aria-describedby / aria-invalid).
 */
export function FormField({
  label,
  name,
  type = 'text',
  as = 'input',
  value,
  onChange,
  onBlur,
  error,
  hint,
  required,
  options,
  maxLength,
  showCount,
  children,
  ...rest
}) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [error && errorId, hint && hintId].filter(Boolean).join(' ') || undefined;

  const common = {
    id,
    name,
    value,
    onChange,
    onBlur,
    'aria-invalid': error ? 'true' : undefined,
    'aria-describedby': describedBy,
    required,
    maxLength,
    ...rest,
  };

  let control;
  if (as === 'select') {
    control = (
      <select className="select" {...common}>
        {options?.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
        {children}
      </select>
    );
  } else if (as === 'textarea') {
    control = <textarea className="textarea" {...common} />;
  } else {
    control = <input className="input" type={type} {...common} />;
  }

  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
        {required && (
          <span className="req" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {control}
      <div className="row row--between" style={{ gap: 8 }}>
        <div>
          {error ? (
            <div className="field__error" id={errorId}>
              {error}
            </div>
          ) : (
            hint && (
              <div className="field__hint" id={hintId}>
                {hint}
              </div>
            )
          )}
        </div>
        {showCount && maxLength && (
          <span className={`field__hint char-count ${value?.length > maxLength ? 'over' : ''}`}>
            {value?.length ?? 0}/{maxLength}
          </span>
        )}
      </div>
    </div>
  );
}

/** Password input with a show/hide toggle and an optional live rule checklist. */
export function PasswordField({
  label,
  name,
  value,
  onChange,
  onBlur,
  error,
  required,
  showRules,
  autoComplete,
  placeholder,
}) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const errorId = `${id}-error`;
  const rules = showRules ? passwordChecks(value) : null;

  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
        {required && (
          <span className="req" aria-hidden="true">
            *
          </span>
        )}
      </label>
      <div className="input-group">
        <input
          id={id}
          className="input"
          name={name}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          autoComplete={autoComplete}
          placeholder={placeholder}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? errorId : undefined}
          required={required}
          maxLength={16}
        />
        <button
          type="button"
          className="input-group__btn"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? 'HIDE' : 'SHOW'}
        </button>
      </div>
      {error && (
        <div className="field__error" id={errorId}>
          {error}
        </div>
      )}
      {rules && (
        <ul className="password-rules" aria-label="Password requirements">
          {rules.map((rule) => (
            <li key={rule.id} className={rule.ok ? 'ok' : ''}>
              {rule.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
