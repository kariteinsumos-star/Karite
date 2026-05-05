import type * as React from 'react';
import { useMemo, useState } from 'react';

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  searchableValue?: (row: T) => string;
}

interface DataTableProps<T> {
  rows: T[];
  columns: Column<T>[];
  searchPlaceholder?: string;
  emptyText?: string;
  rightAction?: React.ReactNode;
}

export function DataTable<T>({ rows, columns, searchPlaceholder = 'Buscar...', emptyText = 'Sin registros', rightAction }: DataTableProps<T>) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      columns.some((col) => {
        const value = col.searchableValue ? col.searchableValue(row) : String(col.render(row) ?? '');
        return value.toLowerCase().includes(q);
      })
    );
  }, [columns, query, rows]);

  return (
    <div className="table-card">
      <div className="table-toolbar">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={searchPlaceholder} />
        {rightAction}
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>{columns.map((c) => <th key={c.key}>{c.header}</th>)}</tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={columns.length} className="empty-cell">{emptyText}</td></tr>
            ) : (
              filtered.map((row, i) => (
                <tr key={i}>{columns.map((c) => <td key={c.key}>{c.render(row)}</td>)}</tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
