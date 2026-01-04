"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Paperclip, X } from "lucide-react"; 
import ReactMarkdown from "react-markdown"; 

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null); 
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch("http://127.0.0.1:8000/history");
        const data = await res.json();
        const formatted = data.map((msg: any) => ({
          role: msg.role === "model" ? "ai" : "user",
          content: msg.parts[0].text
        }));
        setMessages(formatted as any);
      } catch (err) {
        console.error("Failed to load history:", err);
      }
    };
    fetchHistory();
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSend = async () => {
    if (!input.trim() && !selectedImage) return;

    // Add User Message
    const displayContent = selectedImage 
      ? `![Image](${selectedImage})\n\n${input}` 
      : input;
      
    const userMessage = { role: "user", content: displayContent };
    setMessages((prev) => [...prev, userMessage] as any);
    
    const currentInput = input;
    const currentImage = selectedImage;
    
    setInput("");
    setSelectedImage(null);
    setIsLoading(true);

    try {
      const response = await fetch("http://127.0.0.1:8000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            message: currentInput,
            image: currentImage 
        }),
      });

      if (!response.ok) throw new Error("Network error");
      const data = await response.json();

      const aiMessage = { role: "ai", content: data.reply };
      setMessages((prev) => [...prev, aiMessage] as any);

    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: "ai", content: "⚠️ Error: Could not connect to brain." }
      ] as any);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center bg-zinc-950 p-4">
      <h1 className="text-3xl font-bold text-white mb-8 mt-4">Robin's Vision AI</h1>
      
      <div className="flex-1 w-full max-w-2xl flex flex-col gap-4 overflow-y-auto mb-4 p-4 rounded-lg bg-zinc-900/50">
        {messages.map((msg: any, index) => (
          <div key={index} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl p-4 ${
                msg.role === "user" ? "bg-blue-600 text-white" : "bg-zinc-800 text-zinc-100"
              }`}>
              <ReactMarkdown 
                components={{
                    // FIX IS HERE: We check if props.src exists before rendering
                    img: ({node, ...props}) => props.src ? <img className="max-w-full rounded-lg mb-2" {...props} /> : null,
                    code: ({node, ...props}) => <code className="bg-black/30 rounded px-1" {...props} />
                }}
              >
                {msg.content}
              </ReactMarkdown>
            </div>
          </div>
        ))}
        {isLoading && <div className="text-zinc-500 text-sm animate-pulse">Analyzing...</div>}
      </div>

      <div className="w-full max-w-2xl flex flex-col gap-2">
        {selectedImage && (
            <div className="flex items-center gap-2 bg-zinc-800 p-2 rounded-lg w-fit">
                <span className="text-xs text-zinc-400">Image attached</span>
                <button onClick={() => setSelectedImage(null)}><X className="w-4 h-4 text-white"/></button>
            </div>
        )}

        <div className="flex gap-2">
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileSelect} 
                accept="image/*" 
                className="hidden" 
            />
            
            <Button 
                variant="outline" 
                size="icon"
                className="bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white"
                onClick={() => fileInputRef.current?.click()}
            >
                <Paperclip className="w-5 h-5" />
            </Button>

            <Input 
              value={input}
              onChange={(e) => setInput(e.target.value)} 
              placeholder="Describe this image..." 
              className="bg-zinc-900 text-white border-zinc-700"
              onKeyDown={(e) => e.key === "Enter" && handleSend()} 
            />
            <Button onClick={handleSend} disabled={isLoading || (!input && !selectedImage)}>
                Send
            </Button>
        </div>
      </div>
    </main>
  );
}