import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import ProviderChatBot from "./ProviderChatBot";

export default function ProviderFloatingChatButton() {
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <>
      {/* Floating Chat Button - only show when chat is closed */}
      {!isChatOpen && (
        <div className="fixed bottom-6 right-6 z-40">
          {/* Main button - reduced size by 20% */}
                 <Button
                   onClick={() => setIsChatOpen(true)}
                   className="relative w-12 h-12 rounded-full bg-transparent hover:bg-roam-blue/10 text-roam-blue shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110"
                   size="icon"
                 >
            {/* Custom chat icon - reduced size by 20% */}
            <img 
              src="/chat-icon.svg" 
              alt="Chat" 
              className="w-10 h-10" 
            />
          </Button>
        </div>
      )}

      {/* Provider Chat Bot Modal */}
      <ProviderChatBot 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)} 
      />
    </>
  );
}
