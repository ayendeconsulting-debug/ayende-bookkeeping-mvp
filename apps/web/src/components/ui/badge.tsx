import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default:
          'bg-primary-light text-primary dark:bg-primary/20 dark:text-primary',
        secondary:
          'bg-muted text-muted-foreground',
        destructive:
          'bg-danger-light text-danger dark:bg-destructive/20 dark:text-destructive-foreground',
        warning:
          'bg-warning-light text-warning dark:bg-warning/20 dark:text-warning',
        info:
          'bg-info-light text-info dark:bg-info/20 dark:text-info',
        outline:
          'border border-border text-muted-foreground',
        // Transaction status badges
        pending:
          'bg-warning-light text-warning dark:bg-warning/20 dark:text-warning',
        classified:
          'bg-primary-light text-primary dark:bg-primary/20 dark:text-primary',
        posted:
          'bg-muted text-muted-foreground',
        review:
          'bg-info-light text-info dark:bg-info/20 dark:text-info',
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
