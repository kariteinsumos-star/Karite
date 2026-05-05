import { KeyboardEvent, useEffect, useState } from 'react';

type EditableCellProps = {
  value: string | number | null | undefined;
  canEdit?: boolean;
  type?: 'text' | 'number';
  step?: string;
  min?: string;
  formatter?: (value: any) => string;
  onSave: (newValue: string) => Promise<void>;
};

export function EditableCell({
  value,
  canEdit = true,
  type = 'text',
  step = '0.001',
  min = '0',
  formatter,
  onSave
}: EditableCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value ?? ''));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(String(value ?? ''));
  }, [value]);

  const displayValue = formatter ? formatter(value) : String(value ?? '');

  const save = async () => {
    if (!canEdit) return;

    const original = String(value ?? '');

    if (draft === original) {
      setEditing(false);
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await onSave(draft);
      setEditing(false);
    } catch (err: any) {
      setError(err?.message ?? 'No se pudo guardar el cambio.');
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    setDraft(String(value ?? ''));
    setEditing(false);
    setError(null);
  };

  const handleKeyDown = async (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      await save();
    }

    if (e.key === 'Escape') {
      cancel();
    }
  };

  if (!canEdit) {
    return <span>{displayValue}</span>;
  }

  if (!editing) {
    return (
      <button
        type="button"
        className="editable-cell"
        title="Haz clic para editar"
        onClick={() => setEditing(true)}
      >
        {displayValue}
      </button>
    );
  }

  return (
    <div className="editable-cell-wrap">
      <input
        className="editable-cell-input"
        type={type}
        value={draft}
        min={type === 'number' ? min : undefined}
        step={type === 'number' ? step : undefined}
        autoFocus
        disabled={saving}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => void save()}
      />

      {saving && <span className="editable-cell-saving">Guardando...</span>}
      {error && <span className="editable-cell-error">{error}</span>}
    </div>
  );
}
