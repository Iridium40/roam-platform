import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const roamFormFieldVariants = cva("flex flex-col gap-2", {
  variants: {
    variant: {
      default: "",
      inline: "flex-row items-center gap-4",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

const roamInputVariants = cva(
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "",
        error: "border-destructive focus-visible:ring-destructive",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface ROAMFormFieldProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof roamFormFieldVariants> {
  label?: string;
  required?: boolean;
  helpText?: string;
  errorText?: string;
  children?: React.ReactNode;
}

export interface ROAMInputProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof roamInputVariants> {}

const ROAMFormField = React.forwardRef<HTMLDivElement, ROAMFormFieldProps>(
  (
    {
      className,
      variant,
      label,
      required,
      helpText,
      errorText,
      children,
      ...props
    },
    ref,
  ) => (
    <div
      ref={ref}
      className={cn(roamFormFieldVariants({ variant, className }))}
      {...props}
    >
      {label && (
        <label className="text-sm font-medium text-foreground">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </label>
      )}
      {children}
      {helpText && !errorText && (
        <span className="text-xs text-muted-foreground">{helpText}</span>
      )}
      {errorText && (
        <span className="text-xs text-destructive">{errorText}</span>
      )}
    </div>
  ),
);
ROAMFormField.displayName = "ROAMFormField";

const ROAMInput = React.forwardRef<HTMLInputElement, ROAMInputProps>(
  ({ className, variant, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(roamInputVariants({ variant, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
ROAMInput.displayName = "ROAMInput";

const ROAMTextarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> &
    VariantProps<typeof roamInputVariants>
>(({ className, variant, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        variant === "error" &&
          "border-destructive focus-visible:ring-destructive",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
ROAMTextarea.displayName = "ROAMTextarea";

export {
  ROAMFormField,
  ROAMInput,
  ROAMTextarea,
  roamFormFieldVariants,
  roamInputVariants,
};
