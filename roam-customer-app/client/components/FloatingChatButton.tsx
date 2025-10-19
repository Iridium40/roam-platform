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
        
        {/* Main button with slower pulse - transparent background to show icon clearly */}
        <Button
          onClick={() => setIsChatOpen(true)}
          className="relative w-14 h-14 rounded-full bg-transparent hover:bg-roam-blue/10 text-roam-blue shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 border-2 border-roam-blue"
          style={{
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
          }}
          size="icon"
        >
          {/* Custom chat icon - larger and more prominent */}
          <img 
            src="/chat-icon.svg" 
            alt="Chat" 
            className="w-8 h-8" 
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
