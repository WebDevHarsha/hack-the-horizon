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
  messageType?: 'question' | 'reflection' | 'encouragement' | 'guidance'
}

interface ChatHistory {
  id: string
  title: string
  timestamp: Date
}

interface LearningContext {
  topic: string
  userLevel: 'beginner' | 'intermediate' | 'advanced'
  previousQuestions: string[]
  userInsights: string[]
  currentFocus: string
}

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [activeChatId, setActiveChatId] = useState<string>("1")
  const [inputValue, setInputValue] = useState("")
  const [learningContext, setLearningContext] = useState<LearningContext | null>(null)
  const [chatHistory] = useState<ChatHistory[]>([
    { id: "1", title: "Exploring JavaScript fundamentals", timestamp: new Date(2024, 0, 15) },
    { id: "2", title: "Understanding React concepts", timestamp: new Date(2024, 0, 14) },
    { id: "3", title: "Database design principles", timestamp: new Date(2024, 0, 13) },
    { id: "4", title: "Problem-solving strategies", timestamp: new Date(2024, 0, 12) },
  ])

  const placeholders = [
    "I want to learn about...",
    "I'm struggling with...",
    "Help me understand...",
    "Can you teach me...",
    "I'm curious about...",
  ]

  // Initialize Gemini
  const ai = new GoogleGenAI({
    apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY || ""
  })

  const generateSocraticPrompt = (userMessage: string, context: LearningContext | null) => {
    const basePrompt = `You are a Socratic teacher. Your role is to guide learning through thoughtful questions, not to give direct answers. 

CORE PRINCIPLES:
1. Ask probing questions that lead students to discover answers themselves
2. Build on their existing knowledge and responses
3. Encourage critical thinking and self-reflection
4. Be patient and supportive
5. Help them make connections between concepts

TECHNIQUES TO USE:
- Ask "What do you think happens when...?"
- "How might this relate to something you already know?"
- "What patterns do you notice?"
- "What would happen if we changed X?"
- "Can you think of an example where...?"
- "What's your reasoning behind that?"

AVOID:
- Giving direct answers immediately
- Lecturing or explaining everything
- Being condescending
- Moving too fast without checking understanding

USER MESSAGE: "${userMessage}"
`

    if (context) {
      return basePrompt + `
LEARNING CONTEXT:
- Topic: ${context.topic}
- User Level: ${context.userLevel}
- Previous Questions Asked: ${context.previousQuestions.join(', ')}
- User Insights So Far: ${context.userInsights.join(', ')}
- Current Focus: ${context.currentFocus}

Build on this context to ask your next guiding question.`
    } else {
      return basePrompt + `
This appears to be the start of a learning conversation. First, try to understand:
1. What they want to learn
2. What they already know about the topic
3. Why they're interested in learning this

Then guide them with questions that will help them explore the topic systematically.`
    }
  }

  const extractLearningContext = (userMessage: string, _aiResponse: string): Partial<LearningContext> => {
    // Simple extraction logic - in production, you might use more sophisticated NLP
    const topicKeywords = userMessage.toLowerCase()
    let topic = 'general inquiry'
    let userLevel: 'beginner' | 'intermediate' | 'advanced' = 'beginner'

    // Detect topic
    if (topicKeywords.includes('javascript') || topicKeywords.includes('js')) topic = 'JavaScript'
    else if (topicKeywords.includes('react')) topic = 'React'
    else if (topicKeywords.includes('python')) topic = 'Python'
    else if (topicKeywords.includes('database')) topic = 'Database Design'
    else if (topicKeywords.includes('algorithm')) topic = 'Algorithms'

    // Detect level
    if (topicKeywords.includes('advanced') || topicKeywords.includes('complex')) userLevel = 'advanced'
    else if (topicKeywords.includes('intermediate') || topicKeywords.includes('some experience')) userLevel = 'intermediate'

    return { topic, userLevel, currentFocus: topic }
  }

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
    const currentInput = inputValue
    setInputValue("")

    try {
      // Generate Socratic prompt
      const socraticPrompt = generateSocraticPrompt(currentInput, learningContext)
      
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [createUserContent([socraticPrompt])]
      })

      const text = response.text ?? "Let me think about how to guide you through this. What's your initial understanding of this topic?"

      // Update learning context
      const contextUpdates = extractLearningContext(currentInput, text)
      if (!learningContext && contextUpdates.topic) {
        setLearningContext({
          topic: contextUpdates.topic,
          userLevel: contextUpdates.userLevel || 'beginner',
          previousQuestions: [],
          userInsights: [],
          currentFocus: contextUpdates.currentFocus || contextUpdates.topic
        })
      } else if (learningContext) {
        setLearningContext(prev => ({
          ...prev!,
          previousQuestions: [...prev!.previousQuestions, currentInput].slice(-5), // Keep last 5
          userInsights: [...prev!.userInsights, currentInput].slice(-10) // Keep last 10
        }))
      }

      // Determine message type based on response content
      let messageType: Message['messageType'] = 'question'
      const responseText = typeof text === "string" ? text : String(text)
      if (responseText.includes('excellent') || responseText.includes('good thinking')) messageType = 'encouragement'
      else if (responseText.includes('reflect') || responseText.includes('consider')) messageType = 'reflection'
      else if (responseText.includes('try') || responseText.includes('approach')) messageType = 'guidance'

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: responseText,
        isUser: false,
        timestamp: new Date(),
        messageType
      }
      setMessages((prev) => [...prev, aiMessage])
    } catch (error) {
      console.error("Gemini API error:", error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "I'm having trouble connecting right now. While we wait, what do you think might be a good starting point for exploring this topic?",
        isUser: false,
        timestamp: new Date(),
        messageType: 'question'
      }
      setMessages((prev) => [...prev, errorMessage])
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
  }

  const handleNewChat = () => {
    setMessages([])
    setLearningContext(null)
    setSidebarOpen(false)
  }

  const handleSelectChat = (chatId: string) => {
    setActiveChatId(chatId)
    setMessages([])
    setLearningContext(null)
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
          {learningContext && (
            <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-medium">Learning:</span>
              <span>{learningContext.topic}</span>
              <span className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs">
                {learningContext.userLevel}
              </span>
            </div>
          )}
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
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <span className="text-2xl">🤔</span>
                </div>
                <h2 className="text-2xl font-semibold mb-2">Welcome to Sage-Socratic</h2>
                <p className="text-muted-foreground max-w-md mb-4">
                  I&apos;m here to guide your learning journey through thoughtful questions and exploration.
                </p>
                <div className="text-sm text-muted-foreground space-y-2">
                  <p><strong>How I teach:</strong></p>
                  <ul className="text-left space-y-1">
                    <li>• I ask questions to guide your thinking</li>
                    <li>• I help you discover answers yourself</li>
                    <li>• I build on what you already know</li>
                    <li>• I encourage you to make connections</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <ChatMessage
                    key={message.id}
                    message={message.content}
                    isUser={message.isUser}
                    timestamp={message.timestamp}
                    messageType={message.messageType}
                  />
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Learning Progress Indicator */}
          {learningContext && messages.length > 0 && (
            <div className="px-4 py-2 bg-muted/30 border-t text-xs text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>Questions explored: {learningContext.previousQuestions.length}</span>
                <span>Focus: {learningContext.currentFocus}</span>
              </div>
            </div>
          )}

          {/* Input */}
          <div className="border-t border-border p-4">
            <PlaceholdersAndVanishInput
              placeholders={placeholders}
              onChange={handleChange}
              onSubmit={handleSubmit}
              value={inputValue}
            />
            <div className="mt-2 text-xs text-muted-foreground text-center">
              💡 I learn best through questions and exploration together
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}