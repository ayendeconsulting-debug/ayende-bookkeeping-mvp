import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default:
          'bg-accent-teal-muted text-accent-teal',
        secondary:
          'bg-muted text-muted-foreground',
        destructive:
          'bg-accent-red-muted text-accent-red',
        warning:
          'bg-accent-amber-muted text-accent-amber',
        info:
          'bg-accent-blue-muted text-accent-blue',
        outline:
          'border border-border text-muted-foreground',
        // Transaction status badges
        pending:
          'bg-accent-amber-muted text-accent-amber',
        classified:
          'bg-accent-teal-muted text-accent-teal',
        posted:
          'bg-muted text-muted-foreground',
        review:
          'bg-accent-blue-muted text-accent-blue',
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
