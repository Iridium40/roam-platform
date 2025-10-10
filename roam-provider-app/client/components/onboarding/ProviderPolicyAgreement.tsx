import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { PROVIDER_POLICY_CONTENT } from '@/lib/legal/provider-policy-content';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Download,
  ChevronDown,
  ChevronUp,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProviderPolicyAgreementProps {
  userId: string; // Pass user ID from parent component
  onAccept: () => void;
  onDecline?: () => void;
}

export function ProviderPolicyAgreement({ 
  userId,
  onAccept, 
  onDecline 
}: ProviderPolicyAgreementProps) {
  const [hasReadPolicy, setHasReadPolicy] = useState(false);
  const [agreesToTerms, setAgreesToTerms] = useState(false);
  const [agreesToConduct, setAgreesToConduct] = useState(false);
  const [agreesToPayments, setAgreesToPayments] = useState(false);
  const [agreesToIndependentContractor, setAgreesToIndependentContractor] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>(['acceptance']);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const target = event.target as HTMLDivElement;
    const scrollPercentage = (target.scrollTop / (target.scrollHeight - target.clientHeight)) * 100;
    setScrollProgress(Math.min(scrollPercentage, 100));
    
    // Mark as read when scrolled to 95%
    if (scrollPercentage > 95) {
      setHasReadPolicy(true);
    }
  };

  const allCheckboxesAgreed = agreesToTerms && agreesToConduct && agreesToPayments && agreesToIndependentContractor;

  const handleAcceptPolicy = async () => {
    if (!allCheckboxesAgreed || !hasReadPolicy || !userId) return;

    setIsSubmitting(true);
    setError(null);
    
    try {
      // Get user's IP address
      let ipAddress = null;
      try {
        const ipResponse = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipResponse.json();
        ipAddress = ipData.ip;
      } catch (e) {
        console.warn('Could not fetch IP address:', e);
      }

      // Record the policy acceptance using @ts-ignore to bypass type issues
      // @ts-ignore - Table type not yet generated
      const { error: insertError } = await supabase
        .from('policy_acceptances')
        .insert({
          user_id: userId,
          document_type: 'provider_policy',
          document_version: PROVIDER_POLICY_CONTENT.version,
          acceptance_method: 'checkbox',
          ip_address: ipAddress,
          user_agent: navigator.userAgent,
          accepted_at: new Date().toISOString()
        });

      if (insertError) {
        console.error('Error recording policy acceptance:', insertError);
        throw insertError;
      }

      // Call the onAccept callback to proceed with onboarding
      onAccept();
    } catch (err) {
      console.error('Error accepting policy:', err);
      setError('There was an error processing your acceptance. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const downloadPDF = () => {
    // Create formatted text content
    let content = `ROAM PROVIDER SERVICES AGREEMENT\n\n`;
    content += `Version: ${PROVIDER_POLICY_CONTENT.version}\n`;
    content += `Effective Date: ${PROVIDER_POLICY_CONTENT.effectiveDate}\n\n`;
    content += `${'='.repeat(80)}\n\n`;
    
    PROVIDER_POLICY_CONTENT.sections.forEach(section => {
      content += `\n${section.title}\n`;
      content += `${'-'.repeat(80)}\n`;
      content += `${section.content}\n\n`;
    });

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ROAM-Provider-Agreement-v${PROVIDER_POLICY_CONTENT.version}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const expandAll = () => {
    setExpandedSections(PROVIDER_POLICY_CONTENT.sections.map(s => s.id));
  };

  const collapseAll = () => {
    setExpandedSections([]);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-3 px-3 sm:py-6 sm:px-4 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-4 sm:mb-6">
          <div className="flex items-center justify-center mb-3 sm:mb-4">
            <FileText className="h-10 w-10 sm:h-12 sm:w-12 text-roam-blue" />
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            Provider Services Agreement
          </h1>
          <p className="text-sm sm:text-base text-gray-600 px-2">
            Please review and accept the provider terms to continue
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 mt-3 sm:mt-4">
            <Badge variant="outline" className="text-xs sm:text-sm">
              Version {PROVIDER_POLICY_CONTENT.version}
            </Badge>
            <Badge variant="outline" className="text-xs sm:text-sm">
              Effective {PROVIDER_POLICY_CONTENT.effectiveDate}
            </Badge>
          </div>
        </div>

        {/* Reading Progress */}
        {!hasReadPolicy && (
          <div className="mb-3 sm:mb-4">
            <Alert className="border-amber-200 bg-amber-50">
              <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600" />
              <AlertDescription className="ml-2">
                <p className="text-xs sm:text-sm font-medium text-amber-900 mb-2">
                  Please scroll through and read the entire agreement
                </p>
                <div className="mt-2">
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-amber-600 transition-all duration-300"
                      style={{ width: `${scrollProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-amber-700 mt-1">
                    {Math.round(scrollProgress)}% complete
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Policy Content */}
        <Card className="mb-4 sm:mb-6">
          <CardHeader className="border-b bg-gray-50 p-3 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
              <CardTitle className="text-base sm:text-lg">Agreement Terms</CardTitle>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={expandAll}
                  className="text-xs h-8"
                >
                  Expand All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={collapseAll}
                  className="text-xs h-8"
                >
                  Collapse All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadPDF}
                  className="text-xs h-8"
                >
                  <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  Download
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea 
              className="h-[400px] sm:h-[500px] p-3 sm:p-6"
              onScrollCapture={handleScroll}
            >
              <div className="space-y-4 sm:space-y-6">
                {PROVIDER_POLICY_CONTENT.sections.map((section) => (
                  <div key={section.id} className="border-b pb-4 sm:pb-6 last:border-b-0">
                    <button
                      onClick={() => toggleSection(section.id)}
                      className="w-full flex items-center justify-between text-left group"
                    >
                      <h3 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 group-hover:text-roam-blue transition-colors pr-2">
                        {section.title}
                      </h3>
                      {expandedSections.includes(section.id) ? (
                        <ChevronUp className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 flex-shrink-0" />
                      ) : (
                        <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 flex-shrink-0" />
                      )}
                    </button>
                    
                    {expandedSections.includes(section.id) && (
                      <div className="mt-3 sm:mt-4 text-xs sm:text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                        {section.content}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Key Acknowledgments */}
        <Card className="mb-4 sm:mb-6">
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-roam-blue" />
              Required Acknowledgments
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Please confirm you understand these key terms
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-6 pt-0">
            {/* Terms Acceptance */}
            <div className="flex items-start space-x-2 sm:space-x-3 p-3 sm:p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <Checkbox
                id="terms"
                checked={agreesToTerms}
                onCheckedChange={(checked) => setAgreesToTerms(checked as boolean)}
                disabled={!hasReadPolicy}
                className="mt-0.5 sm:mt-1"
              />
              <label
                htmlFor="terms"
                className={cn(
                  "text-xs sm:text-sm leading-relaxed cursor-pointer flex-1",
                  !hasReadPolicy && "text-gray-400"
                )}
              >
                <span className="font-medium text-gray-900">Agreement to All Terms:</span> I have read, understood, and agree to be bound by all terms and conditions in this Provider Services Agreement, including all policies referenced herein.
              </label>
            </div>

            {/* Independent Contractor */}
            <div className="flex items-start space-x-2 sm:space-x-3 p-3 sm:p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <Checkbox
                id="contractor"
                checked={agreesToIndependentContractor}
                onCheckedChange={(checked) => setAgreesToIndependentContractor(checked as boolean)}
                disabled={!hasReadPolicy}
                className="mt-0.5 sm:mt-1"
              />
              <label
                htmlFor="contractor"
                className={cn(
                  "text-xs sm:text-sm leading-relaxed cursor-pointer flex-1",
                  !hasReadPolicy && "text-gray-400"
                )}
              >
                <span className="font-medium text-gray-900">Independent Contractor Status:</span> I understand I am an independent contractor, not an employee of ROAM, and am responsible for my own taxes, insurance, licenses, and business expenses.
              </label>
            </div>

            {/* Commission and Payments */}
            <div className="flex items-start space-x-2 sm:space-x-3 p-3 sm:p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <Checkbox
                id="payments"
                checked={agreesToPayments}
                onCheckedChange={(checked) => setAgreesToPayments(checked as boolean)}
                disabled={!hasReadPolicy}
                className="mt-0.5 sm:mt-1"
              />
              <label
                htmlFor="payments"
                className={cn(
                  "text-xs sm:text-sm leading-relaxed cursor-pointer flex-1",
                  !hasReadPolicy && "text-gray-400"
                )}
              >
                <span className="font-medium text-gray-900">Commission & Payment Terms:</span> I understand ROAM charges a 12% platform commission on each completed booking, and I will receive 88% of the service price minus Stripe processing fees.
              </label>
            </div>

            {/* Professional Conduct */}
            <div className="flex items-start space-x-2 sm:space-x-3 p-3 sm:p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <Checkbox
                id="conduct"
                checked={agreesToConduct}
                onCheckedChange={(checked) => setAgreesToConduct(checked as boolean)}
                disabled={!hasReadPolicy}
                className="mt-0.5 sm:mt-1"
              />
              <label
                htmlFor="conduct"
                className={cn(
                  "text-xs sm:text-sm leading-relaxed cursor-pointer flex-1",
                  !hasReadPolicy && "text-gray-400"
                )}
              >
                <span className="font-medium text-gray-900">Professional Standards & Conduct:</span> I agree to maintain professional standards, provide quality services, adhere to the code of conduct, and understand that off-platform transactions are prohibited.
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 justify-center">
          {onDecline && (
            <Button
              variant="outline"
              onClick={onDecline}
              disabled={isSubmitting}
              className="w-full sm:w-40 h-11 sm:h-12"
            >
              Decline
            </Button>
          )}
          <Button
            onClick={handleAcceptPolicy}
            disabled={!allCheckboxesAgreed || !hasReadPolicy || isSubmitting}
            className="w-full sm:w-40 h-11 sm:h-12 bg-roam-blue hover:bg-roam-blue/90"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Accept & Continue
              </>
            )}
          </Button>
        </div>

        {/* Help Text */}
        <p className="text-center text-xs sm:text-sm text-gray-500 mt-4 sm:mt-6 px-4">
          Questions about this agreement?{' '}
          <a href="mailto:legal@roamwellness.com" className="text-roam-blue hover:underline">
            Contact our legal team
          </a>
        </p>
      </div>
    </div>
  );
}
