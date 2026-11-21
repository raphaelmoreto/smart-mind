export default function Toggle({ checked, onChange, label }) {
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