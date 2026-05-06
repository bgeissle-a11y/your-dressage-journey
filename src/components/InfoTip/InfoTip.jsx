import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './InfoTip.css';

const HOVER_OPEN_DELAY_MS = 200;
const VIEWPORT_MARGIN = 8;
const PANEL_GAP = 8;

function isHoverCapable() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

export default function InfoTip({
  content,
  variant = 'default',
  voiceColor,
  iconSize = 14,
  ariaLabel,
  triggerClassName = '',
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ left: 0, top: 0, side: 'top' });
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const openTimerRef = useRef(null);
  const tipId = useId();

  const clearOpenTimer = () => {
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
  };

  const close = useCallback(() => {
    clearOpenTimer();
    setOpen(false);
  }, []);

  const openWithDelay = useCallback(() => {
    clearOpenTimer();
    openTimerRef.current = setTimeout(() => setOpen(true), HOVER_OPEN_DELAY_MS);
  }, []);

  const toggle = useCallback(() => {
    clearOpenTimer();
    setOpen((v) => !v);
  }, []);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current || !panelRef.current) return;
    const trigger = triggerRef.current.getBoundingClientRect();
    const panel = panelRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const preferAbove = isHoverCapable();
    const fitsAbove = trigger.top - panel.height - PANEL_GAP - VIEWPORT_MARGIN >= 0;
    const fitsBelow = trigger.bottom + panel.height + PANEL_GAP + VIEWPORT_MARGIN <= vh;
    let side;
    if (preferAbove) side = fitsAbove ? 'top' : (fitsBelow ? 'bottom' : 'top');
    else side = fitsBelow ? 'bottom' : (fitsAbove ? 'top' : 'bottom');

    const top = side === 'top'
      ? trigger.top - panel.height - PANEL_GAP
      : trigger.bottom + PANEL_GAP;

    let left = trigger.left + trigger.width / 2 - panel.width / 2;
    left = Math.max(VIEWPORT_MARGIN, Math.min(left, vw - panel.width - VIEWPORT_MARGIN));

    setCoords({ left, top, side });
  }, []);

  useLayoutEffect(() => {
    if (!open) return undefined;
    updatePosition();
    const onScroll = () => updatePosition();
    const onResize = () => updatePosition();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return undefined;
    const handlePointerDown = (e) => {
      if (triggerRef.current && triggerRef.current.contains(e.target)) return;
      if (panelRef.current && panelRef.current.contains(e.target)) return;
      close();
    };
    const handleKey = (e) => {
      if (e.key === 'Escape') {
        close();
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open, close]);

  useEffect(() => () => clearOpenTimer(), []);

  const handleMouseEnter = () => {
    if (isHoverCapable()) openWithDelay();
  };
  const handleMouseLeave = () => {
    if (isHoverCapable()) close();
  };
  const handleClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    toggle();
  };
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggle();
    }
  };
  const handleFocus = () => {
    if (isHoverCapable()) openWithDelay();
  };
  const handleBlur = () => {
    if (isHoverCapable()) close();
  };

  const variantClass = variant === 'voice' ? 'info-tip__panel--voice' : '';
  const sideClass = `info-tip__panel--${coords.side}`;
  const panelStyle = {
    left: `${coords.left}px`,
    top: `${coords.top}px`,
    ...(variant === 'voice' && voiceColor ? { borderLeftColor: voiceColor } : {}),
  };

  const panel = open && (
    <div
      ref={panelRef}
      id={tipId}
      role="tooltip"
      className={`info-tip__panel ${variantClass} ${sideClass}`.trim()}
      style={panelStyle}
    >
      {content}
    </div>
  );

  return (
    <span className={`info-tip ${triggerClassName}`.trim()}>
      <button
        type="button"
        ref={triggerRef}
        className="info-tip__trigger"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-describedby={open ? tipId : undefined}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        style={{ width: iconSize + 4, height: iconSize + 4 }}
      >
        <svg
          viewBox="0 0 16 16"
          width={iconSize}
          height={iconSize}
          aria-hidden="true"
          focusable="false"
        >
          <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <circle cx="8" cy="4.6" r="0.85" fill="currentColor" />
          <rect x="7.15" y="6.7" width="1.7" height="5.0" rx="0.55" fill="currentColor" />
        </svg>
      </button>
      {panel && createPortal(panel, document.body)}
    </span>
  );
}
