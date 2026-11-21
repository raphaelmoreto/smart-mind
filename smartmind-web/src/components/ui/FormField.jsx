export default function FormField({ label, htmlFor, children, className = "" }) {
  return (
    <div className={"energy-field " + className}>
      <label htmlFor={htmlFor}>{label}</label>
      {children}
    </div>
  );
}