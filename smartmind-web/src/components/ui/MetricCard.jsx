export default function MetricCard({ label, value, note, icon }) {
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