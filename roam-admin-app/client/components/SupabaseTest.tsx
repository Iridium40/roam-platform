import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import {
  ROAMCard,
  ROAMCardHeader,
  ROAMCardTitle,
  ROAMCardContent,
} from "@/components/ui/roam-card";

export function SupabaseTest() {
  const [connectionStatus, setConnectionStatus] = useState<
    "testing" | "connected" | "error"
  >("testing");
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState<string | null>(null);

  const testConnection = async () => {
    setConnectionStatus("testing");
    setError(null);

    try {
      // Test basic connection by fetching Supabase version
      const { data, error } = await supabase
        .from("pg_stat_statements")
        .select("*")
        .limit(1);

      if (error) {
        // If pg_stat_statements doesn't exist, try a simpler query
        const { data: testData, error: testError } =
          await supabase.rpc("version");

        if (testError) {
          throw new Error(`Connection failed: ${testError.message}`);
        }

        setVersion(testData || "Connected");
      }

      setConnectionStatus("connected");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setConnectionStatus("error");
    }
  };

  useEffect(() => {
    testConnection();
  }, []);

  return (
    <ROAMCard className="w-full max-w-md">
      <ROAMCardHeader>
        <ROAMCardTitle className="flex items-center gap-2">
          <div
            className={`w-3 h-3 rounded-full ${
              connectionStatus === "connected"
                ? "bg-green-500"
                : connectionStatus === "error"
                  ? "bg-red-500"
                  : "bg-yellow-500 animate-pulse"
            }`}
          />
          Supabase Connection
        </ROAMCardTitle>
      </ROAMCardHeader>
      <ROAMCardContent className="space-y-4">
        <div>
          <div className="text-sm font-medium">Status:</div>
          <div
            className={`text-sm ${
              connectionStatus === "connected"
                ? "text-green-600"
                : connectionStatus === "error"
                  ? "text-red-600"
                  : "text-yellow-600"
            }`}
          >
            {connectionStatus === "connected"
              ? "✓ Connected"
              : connectionStatus === "error"
                ? "✗ Error"
                : "⟳ Testing..."}
          </div>
        </div>

        {version && (
          <div>
            <div className="text-sm font-medium">Version:</div>
            <div className="text-sm text-muted-foreground">{version}</div>
          </div>
        )}

        {error && (
          <div>
            <div className="text-sm font-medium text-red-600">Error:</div>
            <div className="text-sm text-red-500 bg-red-50 p-2 rounded">
              {error}
            </div>
          </div>
        )}

        <div>
          <div className="text-sm font-medium">Configuration:</div>
          <div className="text-xs text-muted-foreground space-y-1">
            <div>URL: {import.meta.env.VITE_SUPABASE_URL || "Not set"}</div>
            <div>
              Anon Key:{" "}
              {import.meta.env.VITE_SUPABASE_ANON_KEY ? "✓ Set" : "✗ Not set"}
            </div>
          </div>
        </div>

        <Button
          onClick={testConnection}
          disabled={connectionStatus === "testing"}
          size="sm"
        >
          Test Connection
        </Button>
      </ROAMCardContent>
    </ROAMCard>
  );
}
