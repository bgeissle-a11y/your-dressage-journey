import './Forms.css';

export default function FormSection({ title, description, children }) {
  return (
    <div className="form-section">
      {(title || description) && (
        <div className="form-section-header">
          {title && <h2 className="form-section-title">{title}</h2>}
          {description && <p className="form-section-description">{description}</p>}
        </div>
      )}
      {children}
    </div>
  );
}
