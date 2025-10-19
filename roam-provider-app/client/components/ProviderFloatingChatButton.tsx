import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import ProviderChatBot from "./ProviderChatBot";

export default function ProviderFloatingChatButton() {
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <>
      {/* Floating Chat Button */}
      <div className="fixed bottom-6 right-6 z-40">
        {/* Pulsing ring effect */}
        <div className="absolute inset-0 rounded-full bg-roam-blue animate-ping opacity-75"></div>
        
        {/* Main button */}
        <Button
          onClick={() => setIsChatOpen(true)}
          className="relative w-14 h-14 rounded-full bg-roam-blue hover:bg-roam-blue/90 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 animate-pulse"
          size="icon"
        >
          <MessageCircle className="w-6 h-6" />
        </Button>
      </div>

      {/* Provider Chat Bot Modal */}
      <ProviderChatBot 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)} 
      />
    </>
  );
}
