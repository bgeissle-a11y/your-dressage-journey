import { useState, useEffect, useRef } from 'react';
import { addCoach } from '../../services/settingsService';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AddCoachForm({ userId, existingCoaches, onAdded, onCancel }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const nameRef = useRef(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const validate = () => {
    const errs = {};
    const trimName = name.trim();
    const trimEmail = email.trim();

    if (!trimName) {
      errs.name = 'Coach name is required';
    } else if (trimName.length > 60) {
      errs.name = 'Name must be 60 characters or less';
    }

    if (!trimEmail) {
      errs.email = 'Email is required';
    } else if (!EMAIL_REGEX.test(trimEmail)) {
      errs.email = 'Please enter a valid email address';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setSubmitting(true);
    const result = await addCoach(userId, {
      name: name.trim(),
      email: email.trim(),
      existingCoaches,
    });
    setSubmitting(false);

    if (result.success) {
      onAdded({
        id: result.id,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        sharingEnabled: true,
        optInDate: new Date().toISOString().slice(0, 10),
        optOutDate: null,
      });
      setName('');
      setEmail('');
      setErrors({});
    } else {
      // Duplicate email or other error
      if (result.error.includes('already in your coach list')) {
        setErrors({ email: result.error });
      } else {
        setErrors({ email: result.error });
      }
    }
  };

  return (
    <div className="add-coach-form">
      <div className="add-coach-form-title">New coach</div>
      <div className="add-coach-form-row">
        <input
          ref={nameRef}
          type="text"
          placeholder="Coach name"
          value={name}
          onChange={(e) => { setName(e.target.value); setErrors(prev => ({ ...prev, name: undefined })); }}
          className={errors.name ? 'field-error' : ''}
          autoComplete="off"
          maxLength={60}
        />
        <input
          type="email"
          placeholder="Coach email address"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setErrors(prev => ({ ...prev, email: undefined })); }}
          className={errors.email ? 'field-error' : ''}
          autoComplete="off"
          onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
        />
      </div>
      {errors.name && <div className="add-coach-field-error">{errors.name}</div>}
      {errors.email && <div className="add-coach-field-error">{errors.email}</div>}
      <div className="add-coach-form-actions">
        <button
          className="settings-btn settings-btn-primary"
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? 'Adding...' : 'Add coach'}
        </button>
        <button className="settings-btn settings-btn-ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
