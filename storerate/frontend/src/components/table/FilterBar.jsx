import { useDebouncedFilters } from '../../hooks/useListQuery.js';
import { Button } from '../ui/index.jsx';

/**
 * Filter inputs bound to URL query params (debounced).
 * fields: [{ key, label, type?: 'text'|'select', options?, placeholder? }]
 */
export function FilterBar({ fields, filters, setFilters, clearFilters }) {
  const [draft, setDraftField] = useDebouncedFilters(filters, setFilters);
  const hasActive = Object.values(filters).some(Boolean);

  return (
    <div className="filter-bar" role="search">
      {fields.map((field) => (
        <div className="field" key={field.key}>
          <label className="field__label" htmlFor={`filter-${field.key}`}>
            {field.label}
          </label>
          {field.type === 'select' ? (
            <select
              id={`filter-${field.key}`}
              className="select"
              value={draft[field.key] ?? ''}
              onChange={(e) => {
                setDraftField(field.key, e.target.value);
                setFilters({ ...draft, [field.key]: e.target.value }); // selects apply immediately
              }}
            >
              {field.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              id={`filter-${field.key}`}
              className="input"
              type="search"
              placeholder={field.placeholder ?? `Filter by ${field.label.toLowerCase()}`}
              value={draft[field.key] ?? ''}
              onChange={(e) => setDraftField(field.key, e.target.value)}
            />
          )}
        </div>
      ))}
      <div className="filter-bar__actions">
        <Button variant="ghost" size="sm" onClick={clearFilters} disabled={!hasActive}>
          Clear filters
        </Button>
      </div>
    </div>
  );
}
