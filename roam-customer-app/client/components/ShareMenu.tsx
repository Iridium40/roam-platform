import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Share2,
  QrCode,
  Mail,
  MessageCircle,
  Copy,
  Facebook,
  Instagram,
} from "lucide-react";

const SHARE_URL = "https://providers.roamyourbestlife.com";
const SHARE_TEXT = "Join ROAM Provider Portal";

export default function ShareMenu() {
  const [open, setOpen] = useState(false);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(SHARE_URL);
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Could not copy link");
    }
  };

  const webShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: SHARE_TEXT,
          text: SHARE_TEXT,
          url: SHARE_URL,
        });
      } catch {}
    } else {
      copyLink();
    }
  };

  const openWindow = (url: string) =>
    window.open(url, "_blank", "noopener,noreferrer");

  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(SHARE_URL)}`;

  const smsUrl = `sms:?&body=${encodeURIComponent(`${SHARE_TEXT} ${SHARE_URL}`)}`;
  const emailUrl = `mailto:?subject=${encodeURIComponent(SHARE_TEXT)}&body=${encodeURIComponent(SHARE_URL)}`;

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        aria-label="Share"
        className="border-2 border-[#f88221] text-[#f88221] hover:bg-[#f88221]/10 focus-visible:ring-[#f88221]"
        onClick={() => setOpen(true)}
      >
        <Share2 className="h-5 w-5" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Share ROAM</DialogTitle>
          </DialogHeader>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={copyLink}
              variant="outline"
              className="rounded-full border-2 px-4"
            >
              <Copy className="mr-2 h-4 w-4" /> Copy link
            </Button>
            <Button
              onClick={() => openWindow("https://www.facebook.com/roamtheapp/")}
              className="rounded-full bg-[#1877f2] text-white hover:bg-[#1877f2]/90"
            >
              <Facebook className="mr-2 h-4 w-4" /> Facebook
            </Button>
            <Button
              onClick={() =>
                openWindow("https://www.instagram.com/roamyourbestlife/")
              }
              className="rounded-full bg-gradient-to-tr from-[#f09433] via-[#e6683c] to-[#bc1888] text-white hover:opacity-90"
            >
              <Instagram className="mr-2 h-4 w-4" /> Instagram
            </Button>
            <Button
              onClick={() => openWindow(emailUrl)}
              variant="outline"
              className="rounded-full"
            >
              <Mail className="mr-2 h-4 w-4" /> Email
            </Button>
            <Button
              onClick={() => openWindow(smsUrl)}
              variant="outline"
              className="rounded-full"
            >
              <MessageCircle className="mr-2 h-4 w-4" /> SMS
            </Button>
          </div>

          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <QrCode className="h-4 w-4" />
            <span>Scan QR to visit {new URL(SHARE_URL).host}</span>
          </div>

          <div className="mt-3 flex justify-center">
            <img
              src={qrSrc}
              alt="ROAM provider portal QR"
              className="h-64 w-64 rounded-lg border bg-white p-3"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
