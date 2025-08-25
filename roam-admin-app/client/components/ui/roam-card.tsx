import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const roamCardVariants = cva(
  "rounded-lg border bg-card text-card-foreground p-6 flex flex-col gap-4",
  {
    variants: {
      variant: {
        default: "shadow-sm border-border",
        elevated: "shadow-md border-border",
        flat: "shadow-none border-none",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface ROAMCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof roamCardVariants> {}

const ROAMCard = React.forwardRef<HTMLDivElement, ROAMCardProps>(
  ({ className, variant, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(roamCardVariants({ variant, className }))}
      {...props}
    />
  ),
);
ROAMCard.displayName = "ROAMCard";

const ROAMCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5", className)}
    {...props}
  />
));
ROAMCardHeader.displayName = "ROAMCardHeader";

const ROAMCardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className,
    )}
    {...props}
  />
));
ROAMCardTitle.displayName = "ROAMCardTitle";

const ROAMCardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
ROAMCardDescription.displayName = "ROAMCardDescription";

const ROAMCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("", className)} {...props} />
));
ROAMCardContent.displayName = "ROAMCardContent";

const ROAMCardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center pt-0", className)}
    {...props}
  />
));
ROAMCardFooter.displayName = "ROAMCardFooter";

export {
  ROAMCard,
  ROAMCardHeader,
  ROAMCardFooter,
  ROAMCardTitle,
  ROAMCardDescription,
  ROAMCardContent,
  roamCardVariants,
};
