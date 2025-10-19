import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import ChatBot from "./ChatBot";

export default function FloatingChatButton() {
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <>
      {/* Floating Chat Button - only show when chat is closed */}
      {!isChatOpen && (
        <div className="fixed bottom-6 right-6 z-50" style={{ zIndex: 9999 }}>
          {/* Main button - reduced size by 20% */}
          <Button
            onClick={() => setIsChatOpen(true)}
            className="relative w-12 h-12 rounded-full bg-transparent hover:bg-roam-blue/10 text-roam-blue shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110"
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
      )}

      {/* Chat Bot Modal */}
      <ChatBot 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)} 
      />
    </>
  );
}
