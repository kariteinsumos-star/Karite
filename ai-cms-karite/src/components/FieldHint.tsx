type FieldHintProps = {
  children: string;
  type?: 'info' | 'warning' | 'danger';
};

export function FieldHint({ children, type = 'info' }: FieldHintProps) {
  return (
    <small className={`field-hint field-hint-${type}`}>
      {children}
    </small>
  );
}