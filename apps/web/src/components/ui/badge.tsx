import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default:
          'bg-primary-light text-primary',
        secondary:
          'bg-gray-100 text-gray-700',
        destructive:
          'bg-danger-light text-danger',
        warning:
          'bg-warning-light text-warning',
        info:
          'bg-info-light text-info',
        outline:
          'border border-gray-200 text-gray-700',
        // Transaction status badges
        pending:
          'bg-warning-light text-warning',
        classified:
          'bg-primary-light text-primary',
        posted:
          'bg-gray-100 text-gray-600',
        review:
          'bg-info-light text-info',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
