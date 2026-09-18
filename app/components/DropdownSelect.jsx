'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

function normalizeOption(option) {
  if (typeof option === 'string') {
    return { value: option, label: option || 'Select' };
  }

  return {
    value: option.value,
    label: option.label ?? option.value ?? 'Select'
  };
}

export default function DropdownSelect({
  value = '',
  options = [],
  onChange,
  onBlur,
  placeholder = 'Select',
  ariaLabel,
  disabled = false,
  className = ''
}) {
  const id = useId();
  const wrapperRef = useRef(null);
  const buttonRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [internalValue, setInternalValue] = useState(value || '');
  const currentValue = onChange ? value || '' : internalValue;

  const normalizedOptions = useMemo(() => options.map(normalizeOption), [options]);
  const selectedIndex = normalizedOptions.findIndex((option) => option.value === currentValue);
  const selectedOption = selectedIndex >= 0 ? normalizedOptions[selectedIndex] : null;

  useEffect(() => {
    if (onChange) return;
    setInternalValue(value || '');
  }, [onChange, value]);

  useEffect(() => {
    if (!isOpen) return undefined;

    function handlePointerDown(event) {
      if (!wrapperRef.current?.contains(event.target)) {
        setIsOpen(false);
        onBlur?.();
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isOpen, onBlur]);

  function openMenu() {
    if (disabled) return;
    const nextIndex = selectedIndex >= 0 ? selectedIndex : 0;
    setActiveIndex(nextIndex);
    setIsOpen(true);
  }

  function selectOption(option) {
    if (!onChange) {
      setInternalValue(option.value);
    } else {
      onChange(option.value);
    }
    setIsOpen(false);
    onBlur?.();
    buttonRef.current?.focus();
  }

  function handleKeyDown(event) {
    if (disabled) return;

    if (!isOpen && ['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
      event.preventDefault();
      openMenu();
      return;
    }

    if (!isOpen) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      setIsOpen(false);
      buttonRef.current?.focus();
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (normalizedOptions.length === 0) return;
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      setActiveIndex((current) => (current + direction + normalizedOptions.length) % normalizedOptions.length);
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const option = normalizedOptions[activeIndex];
      if (option) selectOption(option);
    }
  }

  return (
    <div className={`dropdown-select ${className}`} ref={wrapperRef}>
      <button
        aria-controls={`${id}-menu`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        className="dropdown-select-trigger"
        disabled={disabled}
        onBlur={(event) => {
          if (!event.currentTarget.parentElement?.contains(event.relatedTarget)) onBlur?.();
        }}
        onClick={() => (isOpen ? setIsOpen(false) : openMenu())}
        onKeyDown={handleKeyDown}
        ref={buttonRef}
        type="button"
      >
        <span className={selectedOption ? '' : 'dropdown-select-placeholder'}>
          {selectedOption?.label || placeholder}
        </span>
        <ChevronDown aria-hidden="true" size={16} />
      </button>

      {isOpen && (
        <div className="dropdown-select-menu" id={`${id}-menu`} role="listbox" tabIndex={-1}>
          {normalizedOptions.map((option, index) => {
            const isSelected = option.value === currentValue;
            return (
              <button
                aria-selected={isSelected}
                className={`dropdown-select-option ${index === activeIndex ? 'active' : ''} ${isSelected ? 'selected' : ''}`}
                key={`${option.value}-${option.label}`}
                onClick={() => selectOption(option)}
                onMouseEnter={() => setActiveIndex(index)}
                role="option"
                type="button"
              >
                <span>{option.label}</span>
                {isSelected && <Check aria-hidden="true" size={15} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
