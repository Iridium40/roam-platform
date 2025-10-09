import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MobileActionButtonsProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Mobile-friendly action button container
 * - Stacks buttons vertically on mobile
 * - Horizontal on desktop
 * - Full-width buttons on mobile for better touch targets
 */
export function MobileActionButtons({
  children,
  className,
}: MobileActionButtonsProps) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-4",
        className,
      )}
    >
      {children}
    </div>
  );
}

interface ActionButtonProps
  extends React.ComponentPropsWithoutRef<typeof Button> {
  children: React.ReactNode;
}

/**
 * Mobile-friendly action button
 * - Full width on mobile
 * - Auto width on desktop
 */
export function ActionButton({ children, className, ...props }: ActionButtonProps) {
  return (
    <Button
      className={cn("w-full sm:w-auto", className)}
      {...props}
    >
      {children}
    </Button>
  );
}

export default MobileActionButtons;
