import { AdminLayout } from "@/components/layout/admin-layout";
import {
  ROAMCard,
  ROAMCardHeader,
  ROAMCardTitle,
  ROAMCardContent,
} from "@/components/ui/roam-card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Construction } from "lucide-react";
import { Link } from "react-router-dom";

interface AdminPlaceholderProps {
  title: string;
  description?: string;
}

export default function AdminPlaceholder({
  title,
  description,
}: AdminPlaceholderProps) {
  return (
    <AdminLayout title={title}>
      <div className="space-y-6">
        <ROAMCard className="text-center py-12">
          <ROAMCardContent>
            <Construction className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <ROAMCardTitle className="text-2xl mb-4">
              {title} Page
            </ROAMCardTitle>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              {description ||
                `The ${title} page is coming soon. This section will contain management tools and data for ${title.toLowerCase()}.`}
            </p>
            <div className="space-y-4">
              <Link to="/admin">
                <Button variant="outline" className="flex items-center gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Back to Dashboard
                </Button>
              </Link>
              <p className="text-sm text-muted-foreground">
                Continue prompting to have this page built out with full
                functionality.
              </p>
            </div>
          </ROAMCardContent>
        </ROAMCard>
      </div>
    </AdminLayout>
  );
}
