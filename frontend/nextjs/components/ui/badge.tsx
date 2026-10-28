import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border font-['Quicksand',sans-serif] font-semibold leading-[1.4] transition-colors",
  {
    variants: {
      variant: {
        default: 'border-[#E8E2D9] bg-[#F5EDE0] text-[#6B6259]',
        success: 'border-[#A7F3D0] bg-[#EAF6EE] text-[#1E7A46]',
        warning: 'border-[#FDE68A] bg-[#FEF3C7] text-[#946C00]',
        danger: 'border-[#FECDCA] bg-[#FEE4E2] text-[#B42318]',
        info: 'border-[#BAE6FD] bg-[#E0F2FE] text-[#22577A]',
        wine: 'border-[#8F1216] bg-[#8F1216] text-white',
        gold: 'border-[#FDE047] bg-[#FEF9C3] text-[#946C00]',
      },
      size: {
        sm: 'px-2 py-0.5 text-[11px]',
        md: 'px-3 py-1 text-xs',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  /** Render a leading status dot for additional non-color affordance. */
  dot?: boolean;
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, size, dot = true, children, ...props }, ref) => (
    <span ref={ref} className={cn(badgeVariants({ variant, size }), className)} {...props}>
      {dot && (
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-80"
        />
      )}
      <span>{children}</span>
    </span>
  )
);
Badge.displayName = 'Badge';

export { Badge, badgeVariants };

