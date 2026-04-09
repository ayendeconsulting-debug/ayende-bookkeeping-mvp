import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default:
          'bg-primary-light text-primary dark:bg-primary/20 dark:text-[#4abe94]',
        secondary:
          'bg-gray-100 text-gray-700 dark:bg-[#2a2720] dark:text-[#c8c0b0]',
        destructive:
          'bg-danger-light text-danger dark:bg-red-900/30 dark:text-red-400',
        warning:
          'bg-warning-light text-warning dark:bg-amber-900/30 dark:text-amber-400',
        info:
          'bg-info-light text-info dark:bg-blue-900/30 dark:text-blue-400',
        outline:
          'border border-gray-200 text-gray-700 dark:border-[#3a3730] dark:text-[#c8c0b0]',
        // Transaction status badges
        pending:
          'bg-warning-light text-warning dark:bg-amber-900/30 dark:text-amber-400',
        classified:
          'bg-primary-light text-primary dark:bg-primary/20 dark:text-[#4abe94]',
        posted:
          'bg-gray-100 text-gray-600 dark:bg-[#2a2720] dark:text-[#a09888]',
        review:
          'bg-info-light text-info dark:bg-blue-900/30 dark:text-blue-400',
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
