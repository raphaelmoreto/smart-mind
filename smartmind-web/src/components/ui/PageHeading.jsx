export default function PageHeading({ eyebrow, title, description, action }) {
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