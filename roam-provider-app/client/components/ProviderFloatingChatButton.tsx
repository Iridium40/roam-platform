import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import ProviderChatBot from "./ProviderChatBot";

export default function ProviderFloatingChatButton() {
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <>
      {/* Floating Chat Button */}
      <div className="fixed bottom-6 right-6 z-40">
        {/* Slower pulsing ring effect - larger ring */}
        <div className="absolute -inset-2 rounded-full bg-roam-blue opacity-75" 
             style={{
               animation: 'ping 3s cubic-bezier(0, 0, 0.2, 1) infinite'
             }}></div>
        
        {/* Main button with slower pulse - reduced size by 20% */}
        <Button
          onClick={() => setIsChatOpen(true)}
          className="relative w-12 h-12 rounded-full bg-transparent hover:bg-roam-blue/10 text-roam-blue shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110"
          style={{
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
          }}
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

      {/* Provider Chat Bot Modal */}
      <ProviderChatBot 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)} 
      />
    </>
  );
}
