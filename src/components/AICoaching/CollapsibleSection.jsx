import { useState, useRef, useEffect } from 'react';

/**
 * Reusable collapsible section with animated expand/collapse.
 * Used across all AI coaching panels for chunked output display.
 *
 * @param {string} title - Section header text
 * @param {string} [icon] - Optional emoji icon before title
 * @param {boolean} [defaultOpen=false] - Whether section starts expanded
 * @param {string} [className] - Additional CSS class for the wrapper
 * @param {React.ReactNode} children - Content to show/hide
 */
export default function CollapsibleSection({ title, icon, defaultOpen = false, className = '', children }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const contentRef = useRef(null);
  const [maxHeight, setMaxHeight] = useState(defaultOpen ? 'none' : '0px');

  useEffect(() => {
    if (isOpen) {
      const el = contentRef.current;
      if (el) {
        setMaxHeight(`${el.scrollHeight}px`);
        // After transition, set to 'none' so dynamic content isn't clipped
        const timer = setTimeout(() => setMaxHeight('none'), 350);
        return () => clearTimeout(timer);
      }
    } else {
      // Temporarily set to measured height so transition works from a value
      const el = contentRef.current;
      if (el) {
        setMaxHeight(`${el.scrollHeight}px`);
        // Force reflow, then collapse
        requestAnimationFrame(() => {
          requestAnimationFrame(() => setMaxHeight('0px'));
        });
      }
    }
  }, [isOpen]);

  const toggle = () => setIsOpen((prev) => !prev);

  return (
    <div className={`collapsible-section ${isOpen ? 'collapsible-section--open' : ''} ${className}`}>
      <button
        className="collapsible-header"
        onClick={toggle}
        aria-expanded={isOpen}
        type="button"
      >
        <span className="collapsible-header__title">
          {icon && <span className="collapsible-header__icon">{icon}</span>}
          {title}
        </span>
        <span className={`collapsible-header__chevron ${isOpen ? 'collapsible-header__chevron--open' : ''}`}>
          &#9662;
        </span>
      </button>
      <div
        className="collapsible-content"
        ref={contentRef}
        style={{ maxHeight, overflow: maxHeight === 'none' ? 'visible' : 'hidden' }}
      >
        <div className="collapsible-content__inner">
          {children}
        </div>
      </div>
    </div>
  );
}
