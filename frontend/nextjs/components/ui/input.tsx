import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
}

/**
 * Clucky input with optional label, helper text and error message.
 * Associates label with input via htmlFor and surfaces invalid state
 * through aria-invalid + a visible error description.
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, helperText, error, id, ...props }, ref) => {
    const autoId = React.useId();
    const inputId = id ?? autoId;
    const helperId = `${inputId}-helper`;
    const describedBy = error || helperText ? helperId : undefined;

    return (
      <div className="grid gap-2">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-bold text-[#16100D] font-['Quicksand',sans-serif]"
          >
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          aria-invalid={!!error || undefined}
          aria-describedby={describedBy}
          className={cn(
            "h-[52px] w-full rounded-2xl border border-[#E8DED1] bg-[#FFFAF3] px-4 text-base text-[#16100D] placeholder:text-[#B8AA9B] transition-colors outline-none",
            'focus-visible:border-[#C9A227] focus-visible:ring-4 focus-visible:ring-[#C9A227]/20',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'aria-invalid:border-[#B42318] aria-invalid:ring-4 aria-invalid:ring-[#B42318]/15',
            className
          )}
          {...props}
        />
        {(error || helperText) && (
          <p
            id={helperId}
            role={error ? 'alert' : undefined}
            className={cn('text-xs font-medium', error ? 'text-[#B42318]' : 'text-[#75675E]')}
          >
            {error ?? helperText}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';

export { Input };

