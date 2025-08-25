import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, Download, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

interface QRCodeDisplayProps {
  qrCodeUrl: string;
  secret: string;
  issuer?: string;
  accountName?: string;
  size?: number;
}

const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  qrCodeUrl,
  secret,
  issuer = 'ROAM Platform',
  accountName = 'Your Account',
  size = 200
}) => {
  const [showSecret, setShowSecret] = useState(false);

  const copySecret = async () => {
    try {
      await navigator.clipboard.writeText(secret);
      toast.success('Secret copied to clipboard');
    } catch (err) {
      toast.error('Failed to copy secret');
    }
  };

  const downloadQRCode = () => {
    try {
      const link = document.createElement('a');
      link.href = qrCodeUrl;
      link.download = `${issuer.toLowerCase().replace(/\s+/g, '-')}-mfa-qr-code.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('QR code downloaded');
    } catch (err) {
      toast.error('Failed to download QR code');
    }
  };

  const formatSecret = (secret: string) => {
    // Format secret in groups of 4 characters for better readability
    return secret.match(/.{1,4}/g)?.join(' ') || secret;
  };

  return (
    <div className="space-y-4">
      {/* QR Code Display */}
      <Card>
        <CardContent className="flex flex-col items-center p-6">
          <div className="mb-4">
            <img
              src={qrCodeUrl}
              alt={`QR Code for ${issuer} MFA setup`}
              style={{ width: size, height: size }}
              className="border rounded-lg shadow-sm"
            />
          </div>
          <div className="text-center space-y-2">
            <h3 className="font-medium">Scan with your authenticator app</h3>
            <p className="text-sm text-muted-foreground">
              Use Google Authenticator, Authy, or any TOTP-compatible app
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={downloadQRCode}
              className="mt-2"
            >
              <Download className="h-4 w-4 mr-2" />
              Download QR Code
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Manual Entry Option */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">Manual Entry</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSecret(!showSecret)}
              >
                {showSecret ? (
                  <>
                    <EyeOff className="h-4 w-4 mr-2" />
                    Hide
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    Show Secret
                  </>
                )}
              </Button>
            </div>
            
            <p className="text-xs text-muted-foreground">
              If you can't scan the QR code, enter this information manually:
            </p>

            <div className="space-y-2 text-xs">
              <div className="grid grid-cols-3 gap-2">
                <span className="font-medium">Account:</span>
                <span className="col-span-2 font-mono">{accountName}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <span className="font-medium">Issuer:</span>
                <span className="col-span-2 font-mono">{issuer}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <span className="font-medium">Type:</span>
                <span className="col-span-2 font-mono">Time-based</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <span className="font-medium">Algorithm:</span>
                <span className="col-span-2 font-mono">SHA1</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <span className="font-medium">Digits:</span>
                <span className="col-span-2 font-mono">6</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <span className="font-medium">Period:</span>
                <span className="col-span-2 font-mono">30 seconds</span>
              </div>
            </div>

            {showSecret && (
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <span className="font-medium">Secret:</span>
                  <div className="col-span-2 space-y-1">
                    <code className="font-mono text-xs break-all bg-muted p-1 rounded">
                      {formatSecret(secret)}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copySecret}
                      className="h-6 text-xs"
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copy
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <h4 className="font-medium text-sm mb-2">Setup Instructions:</h4>
          <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Install an authenticator app on your phone if you haven't already</li>
            <li>Scan the QR code or enter the secret manually</li>
            <li>Enter the 6-digit code from your app to verify the setup</li>
            <li>Save your backup codes in a secure location</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
};

export default QRCodeDisplay;
