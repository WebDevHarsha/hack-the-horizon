"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { ChatSidebar } from "@/components/chat-sidebar"
import { ChatMessage } from "@/components/chat-message"
import { PlaceholdersAndVanishInput } from "@/components/ui/placeholders-and-vanish-input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Menu } from "lucide-react"
import ModelsNav from "@/components/modelsnav"
import { Timestamp } from 'firebase/firestore'

// Firestore imports
import {
  createNewChat,
  getChatHistory,
  getChatMessages,
  saveMessage,
  saveLearningContext,
  getLearningContext,
  generateChatTitle,
  updateChatTitle,
  deleteChat,
  subscribeToMessages,
  type FirestoreChatHistory,
  type FirestoreMessage
} from "@/lib/firestore"

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
  const [activeChatId, setActiveChatId] = useState<string | undefined>(undefined)
  const [inputValue, setInputValue] = useState("")
  const [learningContext, setLearningContext] = useState<LearningContext | null>(null)
  const [chatHistory, setChatHistory] = useState<ChatHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [messageLoading, setMessageLoading] = useState(false)

  // For demo purposes - in production, get this from auth
  const userId = "demo-user" // Replace with actual user ID from authentication

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

  // Convert Firestore timestamp to Date
  const timestampToDate = (timestamp: Timestamp): Date => {
    return timestamp.toDate()
  }

  // Convert Message to FirestoreMessage format
  const messageToFirestore = (message: Message): Omit<FirestoreMessage, 'timestamp'> => ({
    id: message.id,
    content: message.content,
    isUser: message.isUser,
    messageType: message.messageType
  })

  // Convert FirestoreMessage to Message format
  const firestoreToMessage = (firestoreMessage: FirestoreMessage): Message => ({
    id: firestoreMessage.id,
    content: firestoreMessage.content,
    isUser: firestoreMessage.isUser,
    timestamp: timestampToDate(firestoreMessage.timestamp),
    messageType: firestoreMessage.messageType
  })

  // Load chat history on component mount
  useEffect(() => {
    const loadChatHistory = async () => {
      try {
        const history = await getChatHistory(userId)
        const convertedHistory = history.map(chat => ({
          id: chat.id,
          title: chat.title,
          timestamp: timestampToDate(chat.timestamp)
        }))
        setChatHistory(convertedHistory)
        
        // Auto-select the most recent chat or create a new one
        if (convertedHistory.length > 0) {
          setActiveChatId(convertedHistory[0].id)
        } else {
          // Create first chat for new user
          const newChatId = await createNewChat(userId)
          setActiveChatId(newChatId)
        }
      } catch (error) {
        console.error('Error loading chat history:', error)
        // Create a fallback new chat
        const newChatId = await createNewChat(userId)
        setActiveChatId(newChatId)
      } finally {
        setLoading(false)
      }
    }

    loadChatHistory()
  }, [userId])

  // Load messages when active chat changes
  useEffect(() => {
    if (!activeChatId) return

    const loadMessages = async () => {
      setMessageLoading(true)
      try {
        const firestoreMessages = await getChatMessages(activeChatId)
        const convertedMessages = firestoreMessages.map(firestoreToMessage)
        setMessages(convertedMessages)

        // Load learning context
        const context = await getLearningContext(activeChatId)
        if (context) {
          setLearningContext({
            topic: context.topic,
            userLevel: context.userLevel,
            previousQuestions: context.previousQuestions,
            userInsights: context.userInsights,
            currentFocus: context.currentFocus
          })
        } else {
          setLearningContext(null)
        }
      } catch (error) {
        console.error('Error loading messages:', error)
      } finally {
        setMessageLoading(false)
      }
    }

    loadMessages()
  }, [activeChatId])

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
    
    if (!inputValue.trim() || !activeChatId) return

    // Add user message to chat
    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      isUser: true,
      timestamp: new Date(),
    }
    
    // Update local state immediately for better UX
    setMessages((prev) => [...prev, userMessage])

    // Save to Firestore
    try {
      await saveMessage(activeChatId, messageToFirestore(userMessage))
      
      // Auto-generate title from first message
      if (messages.length === 0) {
        const title = generateChatTitle(inputValue)
        await updateChatTitle(activeChatId, title)
        
        // Update local chat history
        setChatHistory(prev => 
          prev.map(chat => 
            chat.id === activeChatId 
              ? { ...chat, title }
              : chat
          )
        )
      }
    } catch (error) {
      console.error('Error saving user message:', error)
    }

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
      let updatedContext = learningContext

      if (!learningContext && contextUpdates.topic) {
        updatedContext = {
          topic: contextUpdates.topic,
          userLevel: contextUpdates.userLevel || 'beginner',
          previousQuestions: [],
          userInsights: [],
          currentFocus: contextUpdates.currentFocus || contextUpdates.topic
        }
        setLearningContext(updatedContext)
      } else if (learningContext) {
        updatedContext = {
          ...learningContext,
          previousQuestions: [...learningContext.previousQuestions, currentInput].slice(-5),
          userInsights: [...learningContext.userInsights, currentInput].slice(-10)
        }
        setLearningContext(updatedContext)
      }

      // Save updated learning context
      if (updatedContext) {
        try {
          await saveLearningContext(activeChatId, updatedContext)
        } catch (error) {
          console.error('Error saving learning context:', error)
        }
      }

      // Determine message type
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

      // Save AI message to Firestore
      try {
        await saveMessage(activeChatId, messageToFirestore(aiMessage))
      } catch (error) {
        console.error('Error saving AI message:', error)
      }

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

      // Save error message
      try {
        await saveMessage(activeChatId, messageToFirestore(errorMessage))
      } catch (saveError) {
        console.error('Error saving error message:', saveError)
      }
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
  }

  const handleNewChat = async () => {
    try {
      const newChatId = await createNewChat(userId)
      setActiveChatId(newChatId)
      setMessages([])
      setLearningContext(null)
      setSidebarOpen(false)

      // Add to local chat history
      const newChat: ChatHistory = {
        id: newChatId,
        title: 'New Learning Session',
        timestamp: new Date()
      }
      setChatHistory(prev => [newChat, ...prev])
    } catch (error) {
      console.error('Error creating new chat:', error)
    }
  }

  const handleSelectChat = (chatId: string) => {
    if (chatId !== activeChatId) {
      setActiveChatId(chatId)
      setSidebarOpen(false)
    }
  }

  const handleDeleteChat = async (chatId: string) => {
    try {
      await deleteChat(chatId)
      
      // Remove from local state
      setChatHistory(prev => prev.filter(chat => chat.id !== chatId))
      
      // If this was the active chat, select another or create new
      if (chatId === activeChatId) {
        const remainingChats = chatHistory.filter(chat => chat.id !== chatId)
        if (remainingChats.length > 0) {
          setActiveChatId(remainingChats[0].id)
        } else {
          const newChatId = await createNewChat(userId)
          setActiveChatId(newChatId)
          setMessages([])
          setLearningContext(null)
        }
      }
    } catch (error) {
      console.error('Error deleting chat:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-muted-foreground">Loading your learning sessions...</p>
        </div>
      </div>
    )
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
          onDeleteChat={handleDeleteChat}
        />

        {/* Chat Column */}
        <div className="flex flex-col flex-1">
          {/* Messages Scroll Area */}
          <ScrollArea className="flex-1 p-4">
            {messageLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">Loading messages...</p>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <span className="text-2xl">🤔</span>
                </div>
                <h2 className="text-2xl font-semibold mb-2">Welcome to Sage-Socratic</h2>
                <p className="text-muted-foreground max-w-md mb-4">
                  I'm here to guide your learning journey through thoughtful questions and exploration.
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