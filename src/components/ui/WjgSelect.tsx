import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, Check, X } from 'lucide-react';

export interface WjgSelectOption {
  value: string;
  label: string;
  subtitle?: string;
  badge?: string;
  disabled?: boolean;
  group?: string;
}

export interface WjgSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: WjgSelectOption[];
  placeholder?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  disabled?: boolean;
  id?: string;
  name?: string;
  ariaLabel?: string;
  className?: string;
  style?: React.CSSProperties;
  compact?: boolean;
  emptyMessage?: string;
}

interface PopoverPosition {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
  openUpward: boolean;
}

export const WjgSelect: React.FC<WjgSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Seleccionar...',
  searchable,
  searchPlaceholder = 'Buscar opción...',
  disabled = false,
  id,
  name,
  ariaLabel,
  className = '',
  style,
  compact = false,
  emptyMessage = 'Sin coincidencias',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [pos, setPos] = useState<PopoverPosition | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const showSearch = searchable !== undefined ? searchable : options.length > 6;

  const selectedOption = useMemo(
    () => options.find((opt) => String(opt.value) === String(value)),
    [options, value]
  );

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((opt) => {
      const hay = `${opt.label} ${opt.subtitle || ''} ${opt.group || ''} ${opt.badge || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [options, query]);

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const margin = 8;

    const spaceBelow = viewportH - rect.bottom - margin;
    const spaceAbove = rect.top - margin;
    const desiredHeight = Math.min(280, Math.max(120, options.length * 46 + (showSearch ? 54 : 12)));

    const openUpward = spaceBelow < Math.min(desiredHeight, 200) && spaceAbove > spaceBelow;
    const availableSpace = openUpward ? spaceAbove : spaceBelow;
    const maxHeight = Math.max(140, Math.min(300, availableSpace - 8));

    const minWidth = Math.min(viewportW - margin * 2, Math.max(rect.width, 200));
    let left = rect.left;
    if (left + minWidth > viewportW - margin) {
      left = Math.max(margin, viewportW - margin - minWidth);
    }

    const top = openUpward
      ? Math.max(margin, rect.top - Math.min(maxHeight, desiredHeight) - 6)
      : rect.bottom + 6;

    setPos({
      top,
      left,
      width: minWidth,
      maxHeight,
      openUpward,
    });
  }, [options.length, showSearch]);

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();

    if (showSearch) {
      requestAnimationFrame(() => {
        searchInputRef.current?.focus();
      });
    }

    const handleOutside = (ev: MouseEvent | TouchEvent) => {
      const target = ev.target as Node | null;
      if (!target) return;
      if (triggerRef.current?.contains(target)) return;
      if (popoverRef.current?.contains(target)) return;
      setIsOpen(false);
    };

    const handleKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape' || ev.key === 'Tab') {
        setIsOpen(false);
        if (ev.key === 'Escape') triggerRef.current?.focus();
      }
    };

    const handleScrollOrResize = (ev: Event) => {
      if (ev.type === 'scroll' && popoverRef.current?.contains(ev.target as Node)) {
        return;
      }
      updatePosition();
    };

    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside, { passive: true });
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);

    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [isOpen, showSearch, updatePosition]);

  useEffect(() => {
    if (!isOpen && query) {
      setQuery('');
    }
  }, [isOpen, query]);

  const handleToggle = () => {
    if (disabled) return;
    setIsOpen((prev) => !prev);
  };

  const handleSelect = (opt: WjgSelectOption) => {
    if (opt.disabled) return;
    onChange(opt.value);
    setIsOpen(false);
  };

  // Agrupar opciones si alguna trae `group`
  const groupedItems = useMemo(() => {
    const groups: { name: string | null; items: WjgSelectOption[] }[] = [];
    const map = new Map<string | null, WjgSelectOption[]>();
    for (const opt of filteredOptions) {
      const key = opt.group || null;
      if (!map.has(key)) {
        const list: WjgSelectOption[] = [];
        map.set(key, list);
        groups.push({ name: key, items: list });
      }
      map.get(key)!.push(opt);
    }
    return groups;
  }, [filteredOptions]);

  const popoverNode =
    isOpen && pos
      ? createPortal(
          <div
            ref={popoverRef}
            className="wjg-select-popover"
            role="listbox"
            aria-label={ariaLabel || placeholder}
            style={{
              position: 'fixed',
              top: `${pos.top}px`,
              left: `${pos.left}px`,
              width: `${pos.width}px`,
              maxHeight: `${pos.maxHeight}px`,
              zIndex: 100000,
            }}
          >
            {showSearch && (
              <div className="wjg-select-search-wrap">
                <Search size={14} className="wjg-select-search-icon" />
                <input
                  ref={searchInputRef}
                  type="text"
                  className="wjg-select-search-input"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  aria-label={searchPlaceholder}
                />
                {query && (
                  <button
                    type="button"
                    className="wjg-select-search-clear"
                    onClick={() => setQuery('')}
                    aria-label="Limpiar búsqueda"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            )}

            <div className="wjg-select-list">
              {filteredOptions.length === 0 ? (
                <div className="wjg-select-empty">{emptyMessage}</div>
              ) : (
                groupedItems.map((grp, gIdx) => (
                  <React.Fragment key={grp.name ?? `grp-${gIdx}`}>
                    {grp.name && <div className="wjg-select-group-label">{grp.name}</div>}
                    {grp.items.map((opt) => {
                      const isSelected = String(opt.value) === String(value);
                      return (
                        <button
                          key={`${opt.value}-${opt.label}`}
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          disabled={opt.disabled}
                          className={`wjg-select-option${isSelected ? ' is-selected' : ''}${opt.disabled ? ' is-disabled' : ''}`}
                          onClick={() => handleSelect(opt)}
                        >
                          <div className="wjg-select-option-body">
                            <span className="wjg-select-option-label">{opt.label}</span>
                            {opt.subtitle && (
                              <span className="wjg-select-option-subtitle">{opt.subtitle}</span>
                            )}
                          </div>
                          <div className="wjg-select-option-right">
                            {opt.badge && <span className="wjg-select-option-badge">{opt.badge}</span>}
                            {isSelected && <Check size={14} color="#38bdf8" style={{ flexShrink: 0 }} />}
                          </div>
                        </button>
                      );
                    })}
                  </React.Fragment>
                ))
              )}
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <button
        ref={triggerRef}
        id={id}
        name={name}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        onClick={handleToggle}
        className={`wjg-select-trigger${compact ? ' is-compact' : ''}${isOpen ? ' is-open' : ''}${className ? ` ${className}` : ''}`}
        style={style}
      >
        <span className={`wjg-select-trigger-text${!selectedOption ? ' is-placeholder' : ''}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          size={15}
          className="wjg-select-chevron"
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </button>
      {popoverNode}
    </>
  );
};
