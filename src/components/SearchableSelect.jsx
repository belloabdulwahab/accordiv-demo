import { useEffect, useId, useRef, useState } from 'react';
import { normalizeIdentity } from '../services/identityRules.js';

export default function SearchableSelect({ label, name, value, onChange, options, error, hint, required = false, emptyOption, disabled = false }) {
  const uid = useId(), inputId = `field-${name}`, listId = `choices-${uid}`;
  const [open, setOpen] = useState(false), [query, setQuery] = useState(''), [active, setActive] = useState(0);
  const input = useRef(null), list = useRef(null);
  const choices = emptyOption ? [{ value: '', label: emptyOption, secondary: '', search: emptyOption }, ...options] : options;
  const selected = choices.find(option => option.value === value);
  const matches = choices.filter(option => normalizeIdentity(option.search || option.label).includes(normalizeIdentity(query)));
  // The input keeps keyboard focus; aria-activedescendant identifies the highlighted choice.
  const current = Math.min(active, matches.length - 1);
  useEffect(() => {
    if (open && current >= 0) list.current?.children[current]?.scrollIntoView({ block: 'nearest' });
  }, [open, current, query]);
  function choose(option) {
    onChange({ target: { name, value: option.value } }); setOpen(false); setQuery(''); input.current?.focus();
  }
  function show() { setQuery(''); setActive(0); setOpen(true); }
  function keyDown(event) {
    if (event.key === 'Escape' && open) { event.preventDefault(); event.stopPropagation(); setOpen(false); setQuery(''); }
    else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) show();
      else setActive(previous => Math.max(0, Math.min(matches.length - 1, previous + (event.key === 'ArrowDown' ? 1 : -1))));
    } else if (open && ['Home', 'End'].includes(event.key)) {
      event.preventDefault(); setActive(event.key === 'Home' ? 0 : matches.length - 1);
    } else if (event.key === 'Enter') {
      event.preventDefault(); if (!open) show(); else if (matches[current]) choose(matches[current]);
    } else if (event.key === 'Tab') { setOpen(false); setQuery(''); }
  }
  const describedBy = [hint && `${inputId}-hint`, error && `${inputId}-error`].filter(Boolean).join(' ') || undefined;
  return <div className="form-field searchable-select">
    <label htmlFor={inputId}>{label}{required && <span className="required-mark"> *</span>}</label>
    {hint && <p className="field-hint" id={`${inputId}-hint`}>{hint}</p>}
    <input type="hidden" name={name} value={value} />
    <input ref={input} id={inputId} role="combobox" type="text" autoComplete="off"
      aria-autocomplete="list" aria-expanded={open} aria-controls={listId} aria-required={required}
      aria-invalid={Boolean(error)} aria-describedby={describedBy}
      aria-activedescendant={open && matches[current] ? `${listId}-${current}` : undefined}
      disabled={disabled} value={open ? query : selected?.label || ''} maxLength={254}
      placeholder={`Search ${label.toLowerCase()}`} onFocus={show} onClick={() => { if (!open) show(); }}
      onChange={event => { setQuery(event.target.value); setActive(0); setOpen(true); }} onKeyDown={keyDown}
      onBlur={() => { setOpen(false); setQuery(''); }} />
    {open && <div className="selector-popup">
      <ul ref={list} id={listId} role="listbox" aria-label={`${label} choices`}>
        {matches.map((option, index) => <li key={option.value} id={`${listId}-${index}`} role="option" data-value={option.value}
          aria-selected={option.value === value} className={index === current ? 'selector-active' : ''}
          onMouseDown={event => event.preventDefault()} onMouseMove={() => setActive(index)} onClick={() => choose(option)}>
          <strong>{option.label}</strong>{option.secondary && <span>{option.secondary}</span>}
        </li>)}
      </ul>
      {!matches.length && <p role="status">No matching {label.toLowerCase()} choices.</p>}
    </div>}
    {error && <p id={`${inputId}-error`} className="field-error">{error}</p>}
  </div>;
}
