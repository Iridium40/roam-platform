import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import ChatBot from "./ChatBot";

export default function FloatingChatButton() {
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <>
      {/* Floating Chat Button */}
      <div className="fixed bottom-6 right-6 z-50" style={{ zIndex: 9999 }}>
        {/* Slower pulsing ring effect */}
        <div className="absolute inset-0 rounded-full bg-roam-blue opacity-75" 
             style={{
               animation: 'ping 3s cubic-bezier(0, 0, 0.2, 1) infinite'
             }}></div>
        
        {/* Main button with slower pulse - reduced size by 20% */}
        <Button
          onClick={() => setIsChatOpen(true)}
          className="relative w-12 h-12 rounded-full bg-white hover:bg-roam-blue/10 text-roam-blue shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 border-2 border-roam-blue"
          style={{
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            zIndex: 10000
          }}
          size="icon"
        >
          {/* Custom chat icon - reduced size by 20% */}
          <img 
            src="/chat-icon.svg" 
            alt="Chat" 
            className="w-10 h-10" 
            onError={(e) => {
              console.error('Chat icon failed to load:', e);
              e.currentTarget.style.display = 'none';
            }}
          />
        </Button>
      </div>

      {/* Chat Bot Modal */}
      <ChatBot 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)} 
      />
    </>
  );
}
