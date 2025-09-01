import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Loader2,
  Shield,
  CheckCircle,
  AlertCircle,
  CreditCard,
  Building,
  User,
  ExternalLink,
  RefreshCw,
  Info,
} from "lucide-react";

interface StripeConnectSetupProps {
  userId: string;
  businessId: string;
  businessType: "sole_proprietorship" | "llc" | "corporation" | "partnership";
  businessName: string;
  userEmail: string;
  onSetupComplete: (accountData: any) => void;
  className?: string;
}

interface ConnectAccountData {
  id: string;
  status: string;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  details_submitted: boolean;
  requirements?: any;
}

export default function StripeConnectSetup({
  userId,
  businessId,
  businessType,
  businessName,
  userEmail,
  onSetupComplete,
  className = "",
}: StripeConnectSetupProps) {
  const [step, setStep] = useState<"form" | "onboarding" | "complete" | "error">("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accountData, setAccountData] = useState<ConnectAccountData | null>(null);
  const [onboardingUrl, setOnboardingUrl] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    businessType: businessType === "sole_proprietorship" ? "individual" : "company",
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    ssnLast4: "",
    companyName: businessName,
    taxId: "",
    phone: "",
    country: "US",
  });

  // Check if account already exists
  useEffect(() => {
    checkExistingAccount();
  }, [userId, businessId]);

  const checkExistingAccount = async () => {
    try {
      const response = await fetch(
        `/api/stripe/check-connect-account-status?userId=${userId}&businessId=${businessId}`
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.account) {
          setAccountData(data.account);
          
          if (data.account.charges_enabled && data.account.payouts_enabled) {
            setStep("complete");
            onSetupComplete(data.account);
          } else if (data.account.details_submitted) {
            setStep("onboarding");
            // Check if we need to create a new onboarding link
            if (data.account.requirements?.currently_due?.length > 0) {
              await createOnboardingLink(data.account.id);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error checking existing account:", error);
    }
  };

  const createOnboardingLink = async (accountId: string) => {
    try {
      const response = await fetch("/api/stripe/create-account-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId,
          refreshUrl: `${window.location.origin}/provider-onboarding/phase2/stripe-setup?refresh=true`,
          returnUrl: `${window.location.origin}/provider-onboarding/phase2/stripe-setup?success=true`,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setOnboardingUrl(data.url);
      }
    } catch (error) {
      console.error("Error creating onboarding link:", error);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/stripe/create-connect-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          businessId,
          businessName,
          businessType: formData.businessType,
          email: userEmail,
          country: formData.country,
          firstName: formData.firstName,
          lastName: formData.lastName,
          dateOfBirth: formData.dateOfBirth,
          ssnLast4: formData.ssnLast4,
          companyName: formData.companyName,
          taxId: formData.taxId,
          phone: formData.phone,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setAccountData(result.account);
        setOnboardingUrl(result.accountLink.url);
        setStep("onboarding");
      } else {
        setError(result.error || "Failed to create Stripe Connect account");
      }
    } catch (error) {
      console.error("Error creating account:", error);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOnboardingComplete = async () => {
    setLoading(true);
    try {
      // Check account status
      await checkExistingAccount();
    } catch (error) {
      console.error("Error checking account status:", error);
    } finally {
      setLoading(false);
    }
  };

  const refreshOnboarding = async () => {
    if (accountData) {
      await createOnboardingLink(accountData.id);
    }
  };

  const getStatusIcon = () => {
    if (!accountData) return <Shield className="h-8 w-8 text-blue-600" />;
    
    if (accountData.charges_enabled && accountData.payouts_enabled) {
      return <CheckCircle className="h-8 w-8 text-green-600" />;
    } else if (accountData.details_submitted) {
      return <Loader2 className="h-8 w-8 text-yellow-600 animate-spin" />;
    } else {
      return <AlertCircle className="h-8 w-8 text-red-600" />;
    }
  };

  const getStatusBadge = () => {
    if (!accountData) return <Badge variant="outline">Not Started</Badge>;
    
    if (accountData.charges_enabled && accountData.payouts_enabled) {
      return <Badge className="bg-green-600 hover:bg-green-700">Complete</Badge>;
    } else if (accountData.details_submitted) {
      return <Badge className="bg-yellow-600 hover:bg-yellow-700">Review</Badge>;
    } else {
      return <Badge variant="destructive">Incomplete</Badge>;
    }
  };

  const getProgressPercentage = () => {
    if (!accountData) return 0;
    
    if (accountData.charges_enabled && accountData.payouts_enabled) return 100;
    if (accountData.details_submitted) return 75;
    if (accountData.requirements?.currently_due?.length === 0) return 50;
    return 25;
  };

  // Render form step
  if (step === "form") {
    return (
      <Card className={`max-w-2xl mx-auto ${className}`}>
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            {getStatusIcon()}
            <CardTitle className="text-2xl">Stripe Connect Setup</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge()}
            <Progress value={getProgressPercentage()} className="flex-1" />
          </div>
          <p className="text-muted-foreground">
            Set up your Stripe Connect account to start accepting payments through the ROAM platform.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleFormSubmit} className="space-y-6">
            {/* Business Type Selection */}
            <div className="space-y-2">
              <Label htmlFor="businessType">Business Type</Label>
              <Select
                value={formData.businessType}
                onValueChange={(value) => setFormData({ ...formData, businessType: value as "individual" | "company" })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select business type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Individual / Sole Proprietor</SelectItem>
                  <SelectItem value="company">Company / Corporation / LLC</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Individual Fields */}
            {formData.businessType === "individual" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ssnLast4">SSN Last 4 Digits</Label>
                  <Input
                    id="ssnLast4"
                    value={formData.ssnLast4}
                    onChange={(e) => setFormData({ ...formData, ssnLast4: e.target.value })}
                    maxLength={4}
                    placeholder="1234"
                  />
                </div>
              </div>
            )}

            {/* Company Fields */}
            {formData.businessType === "company" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name *</Label>
                  <Input
                    id="companyName"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="taxId">Tax ID (EIN) *</Label>
                  <Input
                    id="taxId"
                    value={formData.taxId}
                    onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                    placeholder="12-3456789"
                    required
                  />
                </div>
              </div>
            )}

            {/* Common Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(555) 123-4567"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Select
                  value={formData.country}
                  onValueChange={(value) => setFormData({ ...formData, country: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="US">United States</SelectItem>
                    <SelectItem value="CA">Canada</SelectItem>
                    <SelectItem value="GB">United Kingdom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-roam-blue hover:bg-roam-blue/90"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Create Stripe Connect Account
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  // Render onboarding step
  if (step === "onboarding") {
    return (
      <Card className={`max-w-2xl mx-auto ${className}`}>
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            {getStatusIcon()}
            <CardTitle className="text-2xl">Complete Account Setup</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge()}
            <Progress value={getProgressPercentage()} className="flex-1" />
          </div>
          <p className="text-muted-foreground">
            Complete your Stripe Connect account setup to start accepting payments.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              You'll be redirected to Stripe to complete your account setup. This includes providing
              business information, bank account details, and identity verification.
            </AlertDescription>
          </Alert>

          {onboardingUrl ? (
            <div className="space-y-4">
              <Button
                onClick={() => window.open(onboardingUrl, "_blank")}
                className="w-full bg-roam-blue hover:bg-roam-blue/90"
                size="lg"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Complete Account Setup
              </Button>
              
              <Button
                onClick={refreshOnboarding}
                variant="outline"
                className="w-full"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Setup Link
              </Button>
            </div>
          ) : (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
              <p>Loading setup link...</p>
            </div>
          )}

          <div className="pt-4 border-t">
            <Button
              onClick={handleOnboardingComplete}
              disabled={loading}
              variant="outline"
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Checking Status...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  I've Completed Setup
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Render complete step
  if (step === "complete") {
    return (
      <Card className={`max-w-2xl mx-auto ${className}`}>
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            {getStatusIcon()}
            <CardTitle className="text-2xl text-green-800">Setup Complete!</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge()}
            <Progress value={100} className="flex-1" />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>Congratulations!</strong> Your Stripe Connect account is fully set up and ready
              to accept payments through the ROAM platform.
            </AlertDescription>
          </Alert>

          {accountData && (
            <div className="space-y-4">
              <h3 className="font-semibold">Account Details</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Account ID:</span>
                  <p className="text-muted-foreground font-mono">{accountData.id}</p>
                </div>
                <div>
                  <span className="font-medium">Status:</span>
                  <p className="text-muted-foreground capitalize">{accountData.status}</p>
                </div>
                <div>
                  <span className="font-medium">Payments:</span>
                  <p className="text-muted-foreground">
                    {accountData.charges_enabled ? "Enabled" : "Disabled"}
                  </p>
                </div>
                <div>
                  <span className="font-medium">Payouts:</span>
                  <p className="text-muted-foreground">
                    {accountData.payouts_enabled ? "Enabled" : "Disabled"}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="pt-4 border-t">
            <Button
              onClick={() => onSetupComplete(accountData)}
              className="w-full bg-green-600 hover:bg-green-700"
              size="lg"
            >
              Continue to Next Step
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Render error step
  return (
    <Card className={`max-w-2xl mx-auto ${className}`}>
      <CardHeader>
        <div className="flex items-center gap-3 mb-2">
          <AlertCircle className="h-8 w-8 text-red-600" />
          <CardTitle className="text-2xl text-red-800">Setup Error</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error || "An error occurred during setup. Please try again."}
          </AlertDescription>
        </Alert>

        <Button
          onClick={() => setStep("form")}
          variant="outline"
          className="w-full"
        >
          Try Again
        </Button>
      </CardContent>
    </Card>
  );
}
