"use client";

import {
  Fragment,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { createPortal } from "react-dom";

function normalizeOption(option) {
  if (typeof option === "string") {
    return { value: option, label: option || "Select" };
  }

  return {
    value: option?.value ?? "",
    label: option?.label ?? option?.value ?? "Select",
    group: option?.group || "",
  };
}

export default function DropdownSelect({
  value = "",
  options = [],
  onChange,
  onBlur,
  placeholder = "Select",
  ariaLabel,
  disabled = false,
  className = "",
  portal = false,
  menuClassName = "",
}) {
  const id = useId();
  const wrapperRef = useRef(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const [menuPosition, setMenuPosition] = useState(null);
  const searchInputRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [placement, setPlacement] = useState("bottom");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [internalValue, setInternalValue] = useState(value || "");
  const currentValue = onChange ? value || "" : internalValue;

  const normalizedOptions = useMemo(
    () => options.map(normalizeOption),
    [options],
  );
  const selectedIndex = normalizedOptions.findIndex(
    (option) => option.value === currentValue,
  );
  const selectedOption =
    selectedIndex >= 0 ? normalizedOptions[selectedIndex] : null;

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return normalizedOptions;
    const query = searchQuery.toLowerCase().trim();
    return normalizedOptions.filter((opt) =>
      String(opt.label || opt.value)
        .toLowerCase()
        .includes(query),
    );
  }, [normalizedOptions, searchQuery]);

  useEffect(() => {
    if (onChange) return;
    setInternalValue(value || "");
  }, [onChange, value]);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
      return undefined;
    }

    searchInputRef.current?.focus({ preventScroll: true });

    function handlePointerDown(event) {
      if (
        !wrapperRef.current?.contains(event.target) &&
        !menuRef.current?.contains(event.target)
      ) {
        setIsOpen(false);
        onBlur?.();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isOpen, onBlur]);

  useLayoutEffect(() => {
    if (!isOpen) return;
    const menu = menuRef.current;
    const option = menu?.querySelectorAll('[role="option"]')[activeIndex];
    if (!option) return;
    const menuBox = menu.getBoundingClientRect(),
      optionBox = option.getBoundingClientRect();
    const top =
      (menu.querySelector(".dropdown-select-search")?.getBoundingClientRect()
        .bottom || menuBox.top) + 4;
    const bottom = menuBox.bottom - 6;
    // Scroll the options, keeping the sticky search field clear of the active item.
    if (optionBox.top < top) menu.scrollTop += optionBox.top - top;
    else if (optionBox.bottom > bottom)
      menu.scrollTop += optionBox.bottom - bottom;
  }, [isOpen, activeIndex]);

  function positionPortal() {
    const rect = buttonRef.current.getBoundingClientRect();
    const below = window.innerHeight - rect.bottom - 12,
      above = rect.top - 12;
    const bottom = below >= Math.min(180, above);
    const width = Math.min(rect.width, window.innerWidth - 16);
    const next = {
      position: "fixed",
      width,
      left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
      top: bottom ? rect.bottom + 6 : "auto",
      bottom: bottom ? "auto" : window.innerHeight - rect.top + 6,
      maxHeight: Math.max(0, Math.min(280, bottom ? below : above)),
      zIndex: 650,
    };
    setMenuPosition((previous) =>
      JSON.stringify(previous) === JSON.stringify(next) ? previous : next,
    );
  }
  useLayoutEffect(() => {
    if (!isOpen || !portal) return;
    positionPortal();
    window.addEventListener("resize", positionPortal);
    window.addEventListener("scroll", positionPortal, true);
    return () => {
      window.removeEventListener("resize", positionPortal);
      window.removeEventListener("scroll", positionPortal, true);
    };
  }, [isOpen, portal]);

  function openMenu() {
    if (disabled) return;
    if (portal) positionPortal();
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      if (spaceBelow < 250 && spaceAbove > spaceBelow) {
        setPlacement("top");
      } else {
        setPlacement("bottom");
      }
    }
    const nextIndex = selectedIndex >= 0 ? selectedIndex : 0;
    setActiveIndex(nextIndex);
    setSearchQuery("");
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
    buttonRef.current?.focus({ preventScroll: true });
  }

  function handleKeyDown(event) {
    if (disabled) return;

    if (!isOpen && ["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
      event.preventDefault();
      openMenu();
      return;
    }

    if (!isOpen) return;

    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      setIsOpen(false);
      buttonRef.current?.focus({ preventScroll: true });
      return;
    }

    if (event.key === "Tab") {
      setIsOpen(false);
      buttonRef.current?.focus({ preventScroll: true });
      return;
    }

    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      if (filteredOptions.length === 0) return;
      const direction = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((current) =>
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? filteredOptions.length - 1
            : (current + direction + filteredOptions.length) %
              filteredOptions.length,
      );
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const option = filteredOptions[activeIndex];
      if (option) selectOption(option);
    }
  }

  const menuContent = (
    <div
      ref={menuRef}
      className={`dropdown-select-menu ${portal ? "dropdown-select-menu-portal" : `dropdown-select-menu-${placement}`} ${menuClassName}`}
      id={`${id}-menu`}
      role="listbox"
      aria-label={ariaLabel || placeholder}
      tabIndex={-1}
      style={
        portal
          ? menuPosition
          : placement === "top"
            ? { top: "auto", bottom: "calc(100% + 6px)" }
            : {}
      }
    >
      <div
        className="dropdown-select-search"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dropdown-select-search-box">
          <Search className="search-icon" size={14} />
          <input
            ref={searchInputRef}
            type="text"
            aria-label={`Search ${ariaLabel || "options"}`}
            aria-controls={`${id}-menu`}
            aria-activedescendant={
              filteredOptions.length ? `${id}-option-${activeIndex}` : undefined
            }
            className="dropdown-select-search-input"
            placeholder="Search..."
            value={searchQuery}
            style={{ paddingLeft: "32px", paddingRight: "28px" }}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={handleKeyDown}
          />
          {searchQuery && (
            <button
              type="button"
              className="dropdown-select-search-clear"
              onClick={(e) => {
                e.stopPropagation();
                setSearchQuery("");
                searchInputRef.current?.focus();
              }}
              title="Clear search"
              aria-label="Clear option search"
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
            <Fragment key={`${option.value}-${option.label}`}>
              {option.group &&
                option.group !== filteredOptions[index - 1]?.group && (
                  <div className="dropdown-select-group" role="presentation">
                    {option.group}
                  </div>
                )}
              <button
                id={`${id}-option-${index}`}
                data-value={option.value}
                title={String(option.label)}
                tabIndex={-1}
                aria-selected={isSelected}
                className={`dropdown-select-option ${index === activeIndex ? "active" : ""} ${isSelected ? "selected" : ""}`}
                onClick={() => selectOption(option)}
                onMouseEnter={() => setActiveIndex(index)}
                role="option"
                type="button"
              >
                <span>{option.label}</span>
                {isSelected && <Check aria-hidden="true" size={15} />}
              </button>
            </Fragment>
          );
        })
      )}
    </div>
  );

  return (
    <div className={`dropdown-select ${className}`} ref={wrapperRef}>
      <button
        aria-controls={`${id}-menu`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        title={String(selectedOption?.label || placeholder)}
        className="dropdown-select-trigger"
        disabled={disabled}
        onBlur={(event) => {
          if (
            !wrapperRef.current?.contains(event.relatedTarget) &&
            !menuRef.current?.contains(event.relatedTarget)
          )
            onBlur?.();
        }}
        onClick={() => (isOpen ? setIsOpen(false) : openMenu())}
        onKeyDown={handleKeyDown}
        ref={buttonRef}
        type="button"
      >
        <span className={selectedOption ? "" : "dropdown-select-placeholder"}>
          {selectedOption?.label || placeholder}
        </span>
        <ChevronDown aria-hidden="true" size={16} />
      </button>

      {isOpen &&
        (portal ? createPortal(menuContent, document.body) : menuContent)}
    </div>
  );
}
