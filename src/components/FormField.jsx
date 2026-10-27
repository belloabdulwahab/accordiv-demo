export default function FormField({
  label,
  name,
  error,
  hint,
  as: Component = 'input',
  children,
  ...props
}) {
  const id = `field-${name}`;
  const describedBy =
    [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined;
  return (
    <div className="form-field">
      <label htmlFor={id}>
        {label}
        {props.required && <span className="required-mark"> *</span>}
      </label>
      {hint && (
        <p id={`${id}-hint`} className="field-hint">
          {hint}
        </p>
      )}
      <Component
        id={id}
        name={name}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        {...props}
      >
        {children}
      </Component>
      {error && (
        <p id={`${id}-error`} className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}
