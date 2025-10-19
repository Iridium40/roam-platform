import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import ChatBot from "./ChatBot";

export default function FloatingChatButton() {
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <>
      {/* Floating Chat Button */}
      <div className="fixed bottom-6 right-6 z-40">
        {/* Slower pulsing ring effect */}
        <div className="absolute inset-0 rounded-full bg-roam-blue opacity-75" 
             style={{
               animation: 'ping 3s cubic-bezier(0, 0, 0.2, 1) infinite'
             }}></div>
        
        {/* Main button with slower pulse */}
        <Button
          onClick={() => setIsChatOpen(true)}
          className="relative w-14 h-14 rounded-full bg-roam-blue hover:bg-roam-blue/90 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110"
          style={{
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
          }}
          size="icon"
        >
          {/* Custom chat icon */}
          <img 
            src="/chat-icon.svg" 
            alt="Chat" 
            className="w-6 h-6" 
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
