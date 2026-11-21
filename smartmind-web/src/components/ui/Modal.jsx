import { useEffect } from "react";

export default function Modal({ title, description, onClose, children, role = "dialog" }) {
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
        role={role}
        aria-modal="true"
        aria-labelledby="energy-modal-title"
        aria-describedby={description ? "energy-modal-description" : undefined}
      >
        <header className="energy-modal-heading">
          <div>
            <h2 id="energy-modal-title">{title}</h2>
            <p id="energy-modal-description">{description}</p>
          </div>
          <button className="energy-close" type="button" onClick={onClose} aria-label="Fechar">
            ×
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}