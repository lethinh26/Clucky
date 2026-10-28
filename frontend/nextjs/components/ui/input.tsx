"use client";

import * as React from "react";
import { Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
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
  (
    { className, label, helperText, error, id, type = "text", ...props },
    ref,
  ) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const isPassword = type === "password";
    const Icon = isPassword ? LockKeyhole : type === "email" ? Mail : null;
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
        <div className="relative">
          {Icon && (
            <Icon
              size={17}
              aria-hidden="true"
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#99877A]"
            />
          )}
          <input
            id={inputId}
            type={isPassword && showPassword ? "text" : type}
            ref={ref}
            aria-invalid={!!error || undefined}
            aria-describedby={describedBy}
            className={cn(
              "h-[52px] w-full rounded-2xl border border-[#E8DED1] bg-[#FFFAF3] px-4 text-base text-[#16100D] placeholder:text-[#B8AA9B] transition-colors outline-none",
              "focus-visible:border-[#C9A227] focus-visible:ring-4 focus-visible:ring-[#C9A227]/20",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "aria-invalid:border-[#B42318] aria-invalid:ring-4 aria-invalid:ring-[#B42318]/15",
              Icon && "pl-11",
              isPassword && "pr-12",
              className,
            )}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              aria-pressed={showPassword}
              disabled={props.disabled}
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-1 top-1 flex h-[44px] w-10 items-center justify-center rounded-xl text-[#75675E] hover:text-[#8F1216]"
            >
              {showPassword ? (
                <EyeOff size={17} aria-hidden="true" />
              ) : (
                <Eye size={17} aria-hidden="true" />
              )}
            </button>
          )}
        </div>
        {(error || helperText) && (
          <p
            id={helperId}
            role={error ? "alert" : undefined}
            className={cn(
              "text-xs font-medium",
              error ? "text-[#B42318]" : "text-[#75675E]",
            )}
          >
            {error ?? helperText}
          </p>
        )}
      </div>
    );
  },
);
Input.displayName = "Input";

export { Input };
