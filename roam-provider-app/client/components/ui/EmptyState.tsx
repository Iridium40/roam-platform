import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: "default" | "outline" | "secondary";
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
    variant?: "default" | "outline" | "secondary";
  };
  className?: string;
  variant?: "card" | "inline" | "minimal";
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  variant = "card",
}) => {
  if (variant === "inline") {
    return (
      <div className={cn("text-center py-8", className)}>
        {icon && <div className="mb-4">{icon}</div>}
        <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
        {description && (
          <p className="text-muted-foreground mb-4">{description}</p>
        )}
        {action && (
          <Button onClick={action.onClick} variant={action.variant || "default"}>
            {action.label}
          </Button>
        )}
      </div>
    );
  }

  if (variant === "minimal") {
    return (
      <div className={cn("text-center py-4", className)}>
        <p className="text-muted-foreground">{title}</p>
        {action && (
          <Button
            onClick={action.onClick}
            variant={action.variant || "outline"}
            size="sm"
            className="mt-2"
          >
            {action.label}
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className={cn("w-full max-w-md mx-auto", className)}>
      <CardHeader className="text-center">
        {icon && <div className="mb-4">{icon}</div>}
        <CardTitle className="text-xl">{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-center space-y-4">
        {description && (
          <p className="text-muted-foreground">{description}</p>
        )}

        <div className="flex flex-col gap-2">
          {action && (
            <Button onClick={action.onClick} variant={action.variant || "default"}>
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button onClick={secondaryAction.onClick} variant={secondaryAction.variant || "outline"}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Common empty state patterns
export const NoDataEmptyState: React.FC<{
  title?: string;
  description?: string;
  onRefresh?: () => void;
  onAddNew?: () => void;
}> = ({
  title = "No data found",
  description = "There's nothing to display here yet.",
  onRefresh,
  onAddNew,
}) => {
  return (
    <EmptyState
      title={title}
      description={description}
      action={onAddNew ? {
        label: "Add New",
        onClick: onAddNew,
      } : undefined}
      secondaryAction={onRefresh ? {
        label: "Refresh",
        onClick: onRefresh,
        variant: "outline",
      } : undefined}
    />
  );
};

export const NoResultsEmptyState: React.FC<{
  searchTerm?: string;
  onClearSearch?: () => void;
  onTryDifferent?: () => void;
}> = ({
  searchTerm,
  onClearSearch,
  onTryDifferent,
}) => {
  return (
    <EmptyState
      title={searchTerm ? `No results for "${searchTerm}"` : "No results found"}
      description="Try adjusting your search criteria or browse all items."
      action={onTryDifferent ? {
        label: "Try Different Search",
        onClick: onTryDifferent,
      } : undefined}
      secondaryAction={onClearSearch ? {
        label: "Clear Search",
        onClick: onClearSearch,
        variant: "outline",
      } : undefined}
    />
  );
};

export const LoadingEmptyState: React.FC<{
  title?: string;
  description?: string;
}> = ({
  title = "Loading...",
  description = "Please wait while we fetch your data.",
}) => {
  return (
    <EmptyState
      title={title}
      description={description}
      variant="inline"
    />
  );
};

export default EmptyState;
