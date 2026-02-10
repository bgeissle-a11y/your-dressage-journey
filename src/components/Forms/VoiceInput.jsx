import { useState, useRef, useCallback } from 'react';

/**
 * VoiceInput - Microphone button that appends speech-to-text to a textarea.
 *
 * Props:
 *   textareaRef  - React ref to the target textarea element
 *   onTranscript - callback(newText) called with the full updated textarea value
 *   disabled     - disable the button
 */
export default function VoiceInput({ textareaRef, onTranscript, disabled }) {
  const [recording, setRecording] = useState(false);
  const [available, setAvailable] = useState(
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
  );
  const recognitionRef = useRef(null);

  const startRecording = useCallback(() => {
    if (!available || disabled) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          transcript += event.results[i][0].transcript;
        }
      }

      if (transcript && textareaRef?.current) {
        const current = textareaRef.current.value;
        const separator = current && !current.endsWith(' ') ? ' ' : '';
        const newValue = current + separator + transcript.trim();
        textareaRef.current.value = newValue;

        // Trigger React's onChange
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLTextAreaElement.prototype, 'value'
        ).set;
        nativeInputValueSetter.call(textareaRef.current, newValue);
        textareaRef.current.dispatchEvent(new Event('input', { bubbles: true }));

        if (onTranscript) onTranscript(newValue);
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        setAvailable(false);
      }
      setRecording(false);
    };

    recognition.onend = () => {
      setRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setRecording(true);
  }, [available, disabled, textareaRef, onTranscript]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setRecording(false);
  }, []);

  if (!available) return null;

  return (
    <button
      type="button"
      className={`voice-btn ${recording ? 'recording' : ''}`}
      onClick={recording ? stopRecording : startRecording}
      disabled={disabled}
      title={recording ? 'Stop recording' : 'Start voice input'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 12px',
        background: recording ? '#D0021B' : 'white',
        color: recording ? 'white' : '#3A3A3A',
        border: `1.5px solid ${recording ? '#D0021B' : '#E0D5C7'}`,
        borderRadius: '6px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: '0.85rem',
        fontFamily: "'Work Sans', sans-serif",
        marginTop: '6px',
        transition: 'all 0.2s ease',
        animation: recording ? 'voicePulse 1.5s infinite' : 'none',
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="23" />
        <line x1="8" y1="23" x2="16" y2="23" />
      </svg>
      {recording ? 'Stop' : 'Voice'}
    </button>
  );
}
