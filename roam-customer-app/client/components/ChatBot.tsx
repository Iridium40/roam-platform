import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, User, Send, MessageCircle, X, Loader2 } from "lucide-react";
import { logger } from '@/utils/logger';

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ChatBotProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChatBot({ isOpen, onClose }: ChatBotProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hi! I'm here to help answer questions about ROAM. What would you like to know?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages, isLoading]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Call the Claude AI API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(msg => ({
            role: msg.role,
            content: msg.content
          })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get response');
      }

      const data = await response.json();
      
      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.message.content,
        timestamp: new Date(data.message.timestamp),
      };
      
      setMessages((prev) => [...prev, botResponse]);
    } catch (error) {
      logger.error("Error sending message:", error);
      
      // Add error message to chat
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "I'm sorry, I'm having trouble responding right now. Please try again or contact our support team at contactus@roamyourbestlife.com.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end justify-end p-4 z-[9999]">
      <Card className="w-full max-w-md h-[500px] flex flex-col overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-roam-blue text-white rounded-t-lg flex-shrink-0">
          <CardTitle className="flex items-center gap-2 text-lg">
            <img 
              src="/roam-icon.png" 
              alt="ROAM" 
              className="w-5 h-5"
              onLoad={() => console.log('ROAM icon loaded successfully')}
              onError={(e) => {
                console.error('ROAM icon failed to load:', e);
                console.error('Image src:', e.currentTarget.src);
                e.currentTarget.style.display = 'none';
              }}
            />
            ROAM Assistant
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-white hover:bg-white/20"
          >
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
          <ScrollArea ref={scrollAreaRef} className="flex-1 p-4 h-full">
            <div className="space-y-4 min-h-full">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {message.role === "assistant" && (
                    <div className="w-8 h-8 rounded-full bg-roam-blue/10 flex items-center justify-center flex-shrink-0">
                      <img 
                        src="/roam-icon.png" 
                        alt="ROAM" 
                        className="w-4 h-4"
                        onError={(e) => {
                          console.error('ROAM icon failed to load:', e);
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] p-3 rounded-lg ${
                      message.role === "user"
                        ? "bg-roam-blue text-white"
                        : "bg-gray-100 text-gray-900"
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {message.timestamp.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  {message.role === "user" && (
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-gray-600" />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 rounded-full bg-roam-blue/10 flex items-center justify-center flex-shrink-0">
                    <img 
                      src="/roam-icon.png" 
                      alt="ROAM" 
                      className="w-4 h-4"
                      onError={(e) => {
                        console.error('ROAM icon failed to load:', e);
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                  <div className="bg-gray-100 p-3 rounded-lg">
                    <Loader2 className="w-4 h-4 animate-spin text-gray-600" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
          <div className="p-4 border-t flex-shrink-0">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me anything about ROAM..."
                onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                disabled={isLoading}
              />
              <Button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                size="sm"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
