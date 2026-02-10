import './Forms.css';

export default function FormField({ label, optional, error, helpText, children }) {
  return (
    <div className="form-field">
      {label && (
        <label>
          {label}
          {optional && <span className="label-optional"> (optional)</span>}
        </label>
      )}
      {children}
      {error && <div className="field-error">{error}</div>}
      {helpText && !error && <div className="field-help">{helpText}</div>}
    </div>
  );
}
