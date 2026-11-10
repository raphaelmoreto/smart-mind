import { useEffect } from "react";


export function PageHeading({ eyebrow, title, description, action }) {
  return (
    <header className="energy-heading">
      <div>
        {eyebrow && <div className="energy-eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action && <div className="energy-actions">{action}</div>}
    </header>
  );
}

export function MetricCard({ label, value, note, icon }) {
  return (
    <article className="energy-metric">
      <div className="energy-metric-label">
        <span>{label}</span>
        <span className="energy-metric-icon" aria-hidden="true">
          {icon}
        </span>
      </div>
      <strong className="energy-metric-value">{value}</strong>
      <span className="energy-metric-note">{note}</span>
    </article>
  );
}

export function FormField({ label, htmlFor, children, className = "" }) {
  return (
    <div className={"energy-field " + className}>
      <label htmlFor={htmlFor}>{label}</label>
      {children}
    </div>
  );
}

export function Toggle({ checked, onChange, label }) {
  return (
    <button
      className="energy-toggle"
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
    >
      <span />
    </button>
  );
}

export function Modal({ title, description, onClose, children }) {
  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="energy-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="energy-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="energy-modal-title"
      >
        <header className="energy-modal-heading">
          <div>
            <h2 id="energy-modal-title">{title}</h2>
            <p>{description}</p>
          </div>
          <button
            className="energy-close"
            type="button"
            onClick={onClose}
            aria-label="Fechar"
          >
            ×
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
