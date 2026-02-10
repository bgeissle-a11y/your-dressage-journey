import './Forms.css';

export default function RadioGroup({ name, options, value, onChange, disabled }) {
  return (
    <div className="radio-group">
      {options.map(option => (
        <label
          key={option.value}
          className={`radio-option ${value === option.value ? 'selected' : ''}`}
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={onChange}
            disabled={disabled}
          />
          {option.label}
        </label>
      ))}
    </div>
  );
}
