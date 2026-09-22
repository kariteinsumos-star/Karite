import {
  KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';

export interface SearchableOption {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SearchableOption[];
  placeholder?: string;
  disabled?: boolean;
  /** Texto que se muestra cuando no hay resultados */
  emptyLabel?: string;
}

/**
 * Buscador con lista desplegable (combobox).
 * Reemplaza un <select> tradicional cuando la lista de opciones es larga:
 * el usuario escribe y la lista se filtra en tiempo real.
 */
export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = 'Buscar...',
  disabled,
  emptyLabel = 'Sin resultados'
}: SearchableSelectProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedLabel = useMemo(
    () => options.find((o) => o.value === value)?.label ?? '',
    [options, value]
  );

  // Sincroniza el texto visible cuando el valor seleccionado cambia desde
  // afuera (por ejemplo, al presionar "Editar" en una fila de la tabla).
  useEffect(() => {
    if (!open) {
      setQuery(selectedLabel);
    }
  }, [selectedLabel, open]);

  // Cierra la lista al hacer clic fuera del componente.
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setQuery(selectedLabel);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedLabel]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || q === selectedLabel.toLowerCase()) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [query, options, selectedLabel]);

  const handleSelect = (opt: SearchableOption) => {
    onChange(opt.value);
    setQuery(opt.label);
    setOpen(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!open) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const opt = filtered[highlighted];
      if (opt) handleSelect(opt);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setQuery(selectedLabel);
    }
  };

  return (
    <div className="searchable-select" ref={containerRef}>
      <input
        type="text"
        value={open ? query : selectedLabel}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        onChange={(e) => {
          setQuery(e.target.value);
          setHighlighted(0);
          if (e.target.value === '') onChange('');
        }}
        onFocus={() => {
          setOpen(true);
          setQuery('');
        }}
        onKeyDown={handleKeyDown}
      />

      {open && !disabled && (
        <ul className="searchable-select-list">
          {filtered.length === 0 && (
            <li className="searchable-select-empty">{emptyLabel}</li>
          )}

          {filtered.map((opt, idx) => (
            <li
              key={opt.value}
              className={idx === highlighted ? 'active' : ''}
              // onMouseDown (en vez de onClick) para que dispare antes del
              // onBlur/click-outside del input y no se cierre la lista primero.
              onMouseDown={() => handleSelect(opt)}
              onMouseEnter={() => setHighlighted(idx)}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
