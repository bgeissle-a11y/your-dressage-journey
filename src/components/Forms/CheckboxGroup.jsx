import './Forms.css';

export default function CheckboxGroup({ name, options, values = [], onChange, disabled }) {
  function handleChange(optionValue) {
    const updated = values.includes(optionValue)
      ? values.filter(v => v !== optionValue)
      : [...values, optionValue];
    onChange(updated);
  }

  return (
    <div className="checkbox-group">
      {options.map(option => (
        <label
          key={option.value}
          className={`checkbox-option ${values.includes(option.value) ? 'selected' : ''}`}
        >
          <input
            type="checkbox"
            name={name}
            value={option.value}
            checked={values.includes(option.value)}
            onChange={() => handleChange(option.value)}
            disabled={disabled}
          />
          {option.label}
        </label>
      ))}
    </div>
  );
}
