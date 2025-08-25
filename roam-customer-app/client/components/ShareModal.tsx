import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Copy,
  Download,
  Share2,
  QrCode,
  Mail,
  MessageSquare,
  Facebook,
  Twitter,
  Linkedin,
  CheckCircle,
} from "lucide-react";
import QRCode from "react-qr-code";
import { logger } from '@/utils/logger';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  providerName: string;
  providerTitle: string;
  pageUrl: string;
}

export default function ShareModal({
  isOpen,
  onClose,
  providerName,
  providerTitle,
  pageUrl,
}: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState("");

  const shareText = `Check out ${providerName} - ${providerTitle} on ROAM. Book professional services directly!`;
  const shareTitle = `${providerName} - ${providerTitle}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(pageUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      logger.error("Failed to copy: ", err);
    }
  };

  const downloadQRCode = () => {
    const canvas = document.getElementById(
      "qr-code-canvas",
    ) as HTMLCanvasElement;
    if (canvas) {
      const link = document.createElement("a");
      link.download = `${providerName.replace(/\s+/g, "-")}-qr-code.png`;
      link.href = canvas.toDataURL();
      link.click();
    } else {
      // Fallback: create a new canvas with the QR code
      const qrElement = document.querySelector("#qr-code svg") as SVGElement;
      if (qrElement) {
        const svg = qrElement.outerHTML;
        const blob = new Blob([svg], { type: "image/svg+xml" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.download = `${providerName.replace(/\s+/g, "-")}-qr-code.svg`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
      }
    }
  };

  const shareViaEmail = () => {
    const subject = encodeURIComponent(shareTitle);
    const body = encodeURIComponent(`${shareText}\n\n${pageUrl}`);
    const to = emailRecipient
      ? `&to=${encodeURIComponent(emailRecipient)}`
      : "";
    window.open(`mailto:?subject=${subject}&body=${body}${to}`);
  };

  const shareViaSMS = () => {
    const text = encodeURIComponent(`${shareText} ${pageUrl}`);
    window.open(`sms:?body=${text}`);
  };

  const shareViaFacebook = () => {
    const url = encodeURIComponent(pageUrl);
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      "_blank",
    );
  };

  const shareViaTwitter = () => {
    const text = encodeURIComponent(shareText);
    const url = encodeURIComponent(pageUrl);
    window.open(
      `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      "_blank",
    );
  };

  const shareViaLinkedIn = () => {
    const url = encodeURIComponent(pageUrl);
    const title = encodeURIComponent(shareTitle);
    const summary = encodeURIComponent(shareText);
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${url}&title=${title}&summary=${summary}`,
      "_blank",
    );
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: pageUrl,
        });
      } catch (err) {
        logger.debug("Error sharing:", err);
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Share {providerName}'s Profile
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="link" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="link">Link</TabsTrigger>
            <TabsTrigger value="qr">QR Code</TabsTrigger>
            <TabsTrigger value="social">Social</TabsTrigger>
          </TabsList>

          <TabsContent value="link" className="space-y-4">
            <div className="space-y-3">
              <Label htmlFor="share-url">Share Link</Label>
              <div className="flex gap-2">
                <Input
                  id="share-url"
                  value={pageUrl}
                  readOnly
                  className="flex-1"
                />
                <Button
                  size="sm"
                  onClick={handleCopyLink}
                  className={`min-w-[80px] ${copied ? "bg-green-600 hover:bg-green-700" : "bg-roam-blue hover:bg-roam-blue/90"}`}
                >
                  {copied ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-1" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="email-recipient">Send via Email (Optional)</Label>
              <div className="flex gap-2">
                <Input
                  id="email-recipient"
                  type="email"
                  placeholder="recipient@example.com"
                  value={emailRecipient}
                  onChange={(e) => setEmailRecipient(e.target.value)}
                  className="flex-1"
                />
                <Button size="sm" onClick={shareViaEmail} variant="outline">
                  <Mail className="w-4 h-4 mr-1" />
                  Send
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex gap-2">
                <Button
                  onClick={shareViaSMS}
                  variant="outline"
                  className="flex-1"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Send SMS
                </Button>
                {navigator.share && (
                  <Button
                    onClick={handleNativeShare}
                    variant="outline"
                    className="flex-1"
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    More Options
                  </Button>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="qr" className="space-y-4">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <Card className="p-4">
                  <div id="qr-code">
                    <QRCode
                      size={200}
                      style={{
                        height: "auto",
                        maxWidth: "100%",
                        width: "100%",
                      }}
                      value={pageUrl}
                      viewBox="0 0 256 256"
                    />
                  </div>
                </Card>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold">Scan to Book</h3>
                <p className="text-sm text-gray-600">
                  Customers can scan this QR code with their phone camera to
                  instantly access {providerName}'s booking page.
                </p>
              </div>

              <div className="flex gap-2 justify-center">
                <Button onClick={downloadQRCode} variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Download QR Code
                </Button>
                <Button onClick={handleCopyLink} variant="outline">
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Link
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="social" className="space-y-4">
            <div className="space-y-3">
              <p className="text-sm text-gray-600 text-center">
                Share {providerName}'s profile on social media
              </p>

              <div className="grid grid-cols-1 gap-3">
                <Button
                  onClick={shareViaFacebook}
                  variant="outline"
                  className="justify-start bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                >
                  <Facebook className="w-4 h-4 mr-3" />
                  Share on Facebook
                </Button>

                <Button
                  onClick={shareViaTwitter}
                  variant="outline"
                  className="justify-start bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-100"
                >
                  <Twitter className="w-4 h-4 mr-3" />
                  Share on Twitter
                </Button>

                <Button
                  onClick={shareViaLinkedIn}
                  variant="outline"
                  className="justify-start bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100"
                >
                  <Linkedin className="w-4 h-4 mr-3" />
                  Share on LinkedIn
                </Button>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="text-center">
                <p className="text-xs text-gray-500 mb-3">Preview message:</p>
                <div className="bg-gray-50 p-3 rounded text-sm text-left">
                  "{shareText}"
                  <br />
                  <span className="text-blue-600">{pageUrl}</span>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
