import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const roamStatCardVariants = cva(
  "bg-card rounded-lg border border-border p-6 flex flex-col gap-4",
  {
    variants: {
      variant: {
        default: "shadow-sm",
        elevated: "shadow-md",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const changeVariants = cva("flex items-center gap-1 text-xs font-medium", {
  variants: {
    type: {
      positive: "text-roam-success",
      negative: "text-destructive",
      neutral: "text-muted-foreground",
    },
  },
  defaultVariants: {
    type: "neutral",
  },
});

export interface ROAMStatCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof roamStatCardVariants> {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  changeText?: string;
  changeType?: "positive" | "negative" | "neutral";
  changeIcon?: React.ReactNode;
}

const ROAMStatCard = React.forwardRef<HTMLDivElement, ROAMStatCardProps>(
  (
    {
      className,
      variant,
      title,
      value,
      icon,
      changeText,
      changeType = "neutral",
      changeIcon,
      ...props
    },
    ref,
  ) => (
    <div
      ref={ref}
      className={cn(roamStatCardVariants({ variant, className }))}
      {...props}
    >
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        {icon && <div className="w-6 h-6 text-muted-foreground">{icon}</div>}
      </div>

      <div className="text-2xl font-bold text-foreground">{value}</div>

      {changeText && (
        <div className={cn(changeVariants({ type: changeType }))}>
          {changeIcon && <span className="text-xs">{changeIcon}</span>}
          <span>{changeText}</span>
        </div>
      )}
    </div>
  ),
);
ROAMStatCard.displayName = "ROAMStatCard";

export { ROAMStatCard, roamStatCardVariants };
