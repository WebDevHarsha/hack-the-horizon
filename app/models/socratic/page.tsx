"use client"

import type React from "react"
import { useState } from "react"
import { ChatSidebar } from "@/components/chat-sidebar"
import { ChatMessage } from "@/components/chat-message"
import { PlaceholdersAndVanishInput } from "@/components/ui/placeholders-and-vanish-input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Menu } from "lucide-react"
import ModelsNav from "@/components/modelsnav"

// New Gemini import
import {
  GoogleGenAI,
  createUserContent
} from "@google/genai"

interface Message {
  id: string
  content: string
  isUser: boolean
  timestamp: Date
}

interface ChatHistory {
  id: string
  title: string
  timestamp: Date
}

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [activeChatId, setActiveChatId] = useState<string>("1")
  const [inputValue, setInputValue] = useState("")
  const [chatHistory] = useState<ChatHistory[]>([
    { id: "1", title: "Getting started with AI", timestamp: new Date(2024, 0, 15) },
    { id: "2", title: "JavaScript best practices", timestamp: new Date(2024, 0, 14) },
    { id: "3", title: "React component patterns", timestamp: new Date(2024, 0, 13) },
    { id: "4", title: "TypeScript tips and tricks", timestamp: new Date(2024, 0, 12) },
  ])

  const placeholders = [
    "Ask me anything about programming...",
    "What's the best way to learn React?",
    "How do I optimize my code?",
    "Explain machine learning concepts",
    "Help me debug this issue",
  ]

  // Initialize Gemini
  const ai = new GoogleGenAI({
    apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY || ""
  })

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    if (!inputValue.trim()) return

    // Add user message to chat
    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      isUser: true,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMessage])

    // Clear input
    setInputValue("")

    try {
      // Send to Gemini using createUserContent
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [createUserContent([inputValue])]
      })

      const text = response.text ?? "No response received."

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: typeof text === "string" ? text : String(text),
        isUser: false,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, aiMessage])
    } catch (error) {
      console.error("Gemini API error:", error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "Sorry, I couldn't process your request right now.",
        isUser: false,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
  }

  const handleNewChat = () => {
    setMessages([])
    setSidebarOpen(false)
  }

  const handleSelectChat = (chatId: string) => {
    setActiveChatId(chatId)
    setMessages([])
    setSidebarOpen(false)
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Top Nav */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)} className="lg:hidden">
            <Menu className="w-4 h-4" />
          </Button>
        </div>
        <ModelsNav />
      </div>

      {/* Main Chat Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <ChatSidebar
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          onNewChat={handleNewChat}
          chatHistory={chatHistory}
          activeChatId={activeChatId}
          onSelectChat={handleSelectChat}
        />

        {/* Chat Column */}
        <div className="flex flex-col flex-1">
          {/* Messages Scroll Area */}
          <ScrollArea className="flex-1 p-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4" />
                <h2 className="text-2xl font-semibold mb-2">Welcome to Sage-Socratic</h2>
                <p className="text-muted-foreground max-w-md">
                  Your intelligent AI assistant is ready to help. Ask me anything!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <ChatMessage
                    key={message.id}
                    message={message.content}
                    isUser={message.isUser}
                    timestamp={message.timestamp}
                  />
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Input */}
          <div className="border-t border-border p-4">
            <PlaceholdersAndVanishInput
              placeholders={placeholders}
              onChange={handleChange}
              onSubmit={handleSubmit}
              value={inputValue}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
