import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const roamBadgeVariants = cva(
  "inline-flex items-center rounded-full text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        secondary: "bg-secondary text-secondary-foreground",
        success: "bg-roam-success text-white",
        warning: "bg-roam-warning text-foreground",
        danger: "bg-destructive text-destructive-foreground",
        neutral: "bg-muted text-muted-foreground",
        outline: "border border-border bg-transparent text-foreground",
      },
      size: {
        sm: "px-2 py-0.5 text-xs",
        md: "px-3 py-1 text-xs",
        lg: "px-4 py-1.5 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  },
);

export interface ROAMBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof roamBadgeVariants> {}

function ROAMBadge({ className, variant, size, ...props }: ROAMBadgeProps) {
  return (
    <div
      className={cn(roamBadgeVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { ROAMBadge, roamBadgeVariants };
