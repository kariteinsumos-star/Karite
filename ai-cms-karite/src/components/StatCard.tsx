interface StatCardProps {
  label: string;
  value: string | number;
  helper?: string;
  danger?: boolean;
}

export function StatCard({ label, value, helper, danger = false }: StatCardProps) {
  return (
    <div className={`stat-card ${danger ? 'danger' : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {helper && <small>{helper}</small>}
    </div>
  );
}
