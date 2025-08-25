import { AlertTriangle, Database, Key, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ROAMCard,
  ROAMCardHeader,
  ROAMCardTitle,
  ROAMCardContent,
} from "@/components/ui/roam-card";

interface SupabaseSetupProps {
  missingVars: string[];
}

export function SupabaseSetup({ missingVars }: SupabaseSetupProps) {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
              <Database className="w-8 h-8 text-orange-600" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Supabase Configuration Required
            </h1>
            <p className="text-muted-foreground mt-2">
              Please configure your Supabase environment variables to continue
            </p>
          </div>
        </div>

        <ROAMCard className="border-orange-200">
          <ROAMCardHeader>
            <ROAMCardTitle className="flex items-center gap-2 text-orange-700">
              <AlertTriangle className="w-5 h-5" />
              Missing Environment Variables
            </ROAMCardTitle>
          </ROAMCardHeader>
          <ROAMCardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              The following environment variables are required but not
              configured:
            </p>
            <ul className="space-y-2">
              {missingVars.map((varName) => (
                <li
                  key={varName}
                  className="flex items-center gap-2 p-2 bg-orange-50 rounded-md"
                >
                  <Key className="w-4 h-4 text-orange-600" />
                  <code className="font-mono text-sm font-medium">
                    {varName}
                  </code>
                </li>
              ))}
            </ul>
          </ROAMCardContent>
        </ROAMCard>

        <ROAMCard>
          <ROAMCardHeader>
            <ROAMCardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Setup Instructions
            </ROAMCardTitle>
          </ROAMCardHeader>
          <ROAMCardContent className="space-y-6">
            <div>
              <h3 className="font-semibold text-sm mb-3">
                Option 1: Using DevServerControl Tool (Recommended)
              </h3>
              <div className="space-y-3">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Set your Supabase URL:
                  </p>
                  <div className="p-3 bg-muted rounded-md font-mono text-sm relative">
                    set_env_variable: ["VITE_SUPABASE_URL",
                    "https://your-project.supabase.co"]
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-2 h-6 px-2"
                      onClick={() =>
                        copyToClipboard(
                          'set_env_variable: ["VITE_SUPABASE_URL", "https://your-project.supabase.co"]',
                        )
                      }
                    >
                      Copy
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Set your Supabase anon key:
                  </p>
                  <div className="p-3 bg-muted rounded-md font-mono text-sm relative">
                    set_env_variable: ["VITE_SUPABASE_ANON_KEY",
                    "your-public-anon-key"]
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-2 h-6 px-2"
                      onClick={() =>
                        copyToClipboard(
                          'set_env_variable: ["VITE_SUPABASE_ANON_KEY", "your-public-anon-key"]',
                        )
                      }
                    >
                      Copy
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t">
              <h3 className="font-semibold text-sm mb-3">
                Option 2: Using .env file
              </h3>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Add these lines to your .env file:
                </p>
                <div className="p-3 bg-muted rounded-md font-mono text-sm relative">
                  {`VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key`}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-2 h-6 px-2"
                    onClick={() =>
                      copyToClipboard(
                        `VITE_SUPABASE_URL=https://your-project.supabase.co\nVITE_SUPABASE_ANON_KEY=your-public-anon-key`,
                      )
                    }
                  >
                    Copy
                  </Button>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t">
              <h3 className="font-semibold text-sm mb-3">
                Where to find your credentials:
              </h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                <li>Go to your Supabase Dashboard</li>
                <li>Select your project</li>
                <li>Navigate to Settings → API</li>
                <li>Copy the URL and anon public key</li>
              </ol>
            </div>

            <div className="pt-4 border-t text-center">
              <Button
                onClick={() => window.location.reload()}
                className="w-full"
              >
                Refresh Page After Setup
              </Button>
            </div>
          </ROAMCardContent>
        </ROAMCard>

        <div className="text-center text-xs text-muted-foreground">
          <p>
            Need help? Check the{" "}
            <code className="bg-muted px-1 py-0.5 rounded">
              SUPABASE_SETUP.md
            </code>{" "}
            file for detailed instructions.
          </p>
        </div>
      </div>
    </div>
  );
}
