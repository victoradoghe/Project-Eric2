import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

export function TextField({
  id,
  label,
  value,
  onChange,
  onBlur,
  onKeyDown,
  placeholder,
  type = 'text',
  hint,
  className,
}) {
  return (
    <div className={className}>
      <Label htmlFor={id} className="dm-label">
        {label}
      </Label>
      <Input
        id={id}
        type={type}
        value={value ?? ''}
        placeholder={placeholder}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        onChange={(event) => onChange(event.target.value)}
      />
      {hint ? <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function SelectField({ id, label, value, onChange, options, emptyLabel = 'Any', className }) {
  return (
    <div className={className}>
      <Label htmlFor={id} className="dm-label">
        {label}
      </Label>
      <select
        id={id}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
        className="dm-focus h-10 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-sm"
      >
        <option value="">{emptyLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function SwitchField({ id, label, checked, onChange, className }) {
  return (
    <div className={cn('flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5', className)}>
      <Label htmlFor={id} className="cursor-pointer text-sm font-medium">
        {label}
      </Label>
      <Switch id={id} checked={Boolean(checked)} onCheckedChange={onChange} />
    </div>
  );
}

export function CheckboxField({ id, label, checked, onChange, className }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <Checkbox id={id} checked={Boolean(checked)} onCheckedChange={(value) => onChange(Boolean(value))} />
      <Label htmlFor={id} className="cursor-pointer text-sm font-normal">
        {label}
      </Label>
    </div>
  );
}