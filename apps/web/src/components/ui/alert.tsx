import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/*
 * 27.1.b – Dark-mode banner palette:
 *   Success → bg #494C4F, text #22E043
 *   Warning → bg #494C4F, text #FBFB47
 *   Info    → bg #494C4F, text #60A5FA
 *   Danger  → bg #01060B, text #FF3E3E
 * Light-mode classes unchanged.
 */

const alertVariants = cva(
  'relative w-full rounded-lg border p-4 text-sm [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg+div]:translate-y-[-3px] [&:has(svg)]:pl-11',
  {
    variants: {
      variant: {
        default:
          'border-border bg-card text-foreground',
        destructive:
          'border-danger-light bg-danger-light text-danger dark:border-[#FF3E3E]/40 dark:bg-[#01060B] dark:text-[#FF3E3E]',
        success:
          'border-primary-light bg-primary-light text-primary dark:border-[#22E043]/40 dark:bg-[#494C4F] dark:text-[#22E043]',
        warning:
          'border-warning-light bg-warning-light text-warning dark:border-[#FBFB47]/40 dark:bg-[#494C4F] dark:text-[#FBFB47]',
        info:
          'border-info-light bg-info-light text-info dark:border-[#60A5FA]/40 dark:bg-[#494C4F] dark:text-[#60A5FA]',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div ref={ref} role="alert" className={cn(alertVariants({ variant }), className)} {...props} />
));
Alert.displayName = 'Alert';

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5 ref={ref} className={cn('mb-1 font-medium leading-none tracking-tight', className)} {...props} />
));
AlertTitle.displayName = 'AlertTitle';

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('text-sm opacity-90 [&_p]:leading-relaxed', className)} {...props} />
));
AlertDescription.displayName = 'AlertDescription';

export { Alert, AlertTitle, AlertDescription };
