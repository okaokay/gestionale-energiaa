import { useEffect, useRef, useState } from 'react';

interface InlineEditableProps {
  value?: string | number | null;
  placeholder?: string;
  onSave: (newValue: string) => Promise<void> | void;
  className?: string;
  multiline?: boolean;
  maxLength?: number;
  disabled?: boolean;
}

export default function InlineEditable({
  value,
  placeholder = '',
  onSave,
  className = '',
  multiline = false,
  maxLength,
  disabled = false,
}: InlineEditableProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const [initial, setInitial] = useState<string>(value == null ? '' : String(value));

  useEffect(() => {
    const val = value == null ? '' : String(value);
    setInitial(val);
    if (ref.current) {
      ref.current.textContent = val || placeholder;
    }
  }, [value, placeholder]);

  const handleBlur = async () => {
    if (!ref.current) return;
    let text = (ref.current.textContent || '').trim();
    if (maxLength) text = text.slice(0, maxLength);
    if (text === initial) return;
    setSaving(true);
    try {
      await onSave(text);
      setInitial(text);
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!multiline && e.key === 'Enter') {
      e.preventDefault();
      (e.target as HTMLDivElement).blur();
    }
  };

  return (
    <div
      ref={ref}
      contentEditable={!disabled}
      suppressContentEditableWarning
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className={`${className} ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-text'} ${saving ? 'animate-pulse' : ''}`}
      aria-label="inline-editable"
      title={disabled ? 'Modifica disabilitata' : 'Clicca per modificare'}
    >
      {initial || placeholder}
    </div>
  );
}