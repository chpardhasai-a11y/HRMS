'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';

function normalizeOption(option) {
  if (typeof option === 'string') {
    return { value: option, label: option || 'Select' };
  }

  return {
    value: option?.value ?? '',
    label: option?.label ?? option?.value ?? 'Select'
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
  const searchInputRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [placement, setPlacement] = useState('bottom');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [internalValue, setInternalValue] = useState(value || '');
  const currentValue = onChange ? value || '' : internalValue;

  const normalizedOptions = useMemo(() => options.map(normalizeOption), [options]);
  const selectedIndex = normalizedOptions.findIndex((option) => option.value === currentValue);
  const selectedOption = selectedIndex >= 0 ? normalizedOptions[selectedIndex] : null;

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return normalizedOptions;
    const query = searchQuery.toLowerCase().trim();
    return normalizedOptions.filter((opt) =>
      String(opt.label || opt.value).toLowerCase().includes(query)
    );
  }, [normalizedOptions, searchQuery]);

  useEffect(() => {
    if (onChange) return;
    setInternalValue(value || '');
  }, [onChange, value]);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      return undefined;
    }

    // Auto-focus search bar when dropdown opens
    const focusTimer = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 40);

    function handlePointerDown(event) {
      if (!wrapperRef.current?.contains(event.target)) {
        setIsOpen(false);
        onBlur?.();
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isOpen, onBlur]);

  function openMenu() {
    if (disabled) return;
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      if (spaceBelow < 250 && spaceAbove > spaceBelow) {
        setPlacement('top');
      } else {
        setPlacement('bottom');
      }
    }
    const nextIndex = selectedIndex >= 0 ? selectedIndex : 0;
    setActiveIndex(nextIndex);
    setSearchQuery('');
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
      if (filteredOptions.length === 0) return;
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      setActiveIndex((current) => (current + direction + filteredOptions.length) % filteredOptions.length);
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      const option = filteredOptions[activeIndex];
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
        <div
          className={`dropdown-select-menu dropdown-select-menu-${placement}`}
          id={`${id}-menu`}
          role="listbox"
          tabIndex={-1}
          style={placement === 'top' ? { top: 'auto', bottom: 'calc(100% + 6px)' } : {}}
        >
          <div className="dropdown-select-search" onClick={(e) => e.stopPropagation()}>
            <div className="dropdown-select-search-box">
              <Search className="search-icon" size={14} />
              <input
                ref={searchInputRef}
                type="text"
                className="dropdown-select-search-input"
                placeholder="Search..."
                value={searchQuery}
                style={{ paddingLeft: '32px', paddingRight: '28px' }}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setActiveIndex(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    setIsOpen(false);
                    buttonRef.current?.focus();
                  } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                    handleKeyDown(e);
                  } else if (e.key === 'Enter') {
                    e.preventDefault();
                    const option = filteredOptions[activeIndex];
                    if (option) selectOption(option);
                  }
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="dropdown-select-search-clear"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSearchQuery('');
                    searchInputRef.current?.focus();
                  }}
                  title="Clear search"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {filteredOptions.length === 0 ? (
            <div className="dropdown-select-empty">No matching options</div>
          ) : (
            filteredOptions.map((option, index) => {
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
            })
          )}
        </div>
      )}
    </div>
  );
}
