"use client"

import { cn } from "@/lib/utils"
import { Bot, User } from "lucide-react"

interface ChatMessageProps {
  message: string
  isUser: boolean
  timestamp: Date
  messageType?: 'question' | 'reflection' | 'encouragement' | 'guidance'
}

export function ChatMessage({ message, isUser, timestamp, messageType }: ChatMessageProps) {
  const getMessageTypeColor = () => {
    if (isUser) return "bg-primary text-primary-foreground ml-auto"
    
    switch (messageType) {
      case 'encouragement':
        return "bg-green-100 text-green-900 border-l-4 border-green-500"
      case 'reflection':
        return "bg-blue-100 text-blue-900 border-l-4 border-blue-500"
      case 'guidance':
        return "bg-yellow-100 text-yellow-900 border-l-4 border-yellow-500"
      case 'question':
        return "bg-purple-100 text-purple-900 border-l-4 border-purple-500"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  return (
    <div className={cn("flex gap-3 p-4", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
          <Bot className="w-4 h-4 text-primary-foreground" />
        </div>
      )}

      <div className={cn("max-w-[80%] space-y-2", isUser && "order-first")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-2 text-sm",
            getMessageTypeColor()
          )}
        >
          {message}
        </div>
        <div className={cn("text-xs text-muted-foreground", isUser && "text-right")}>
          {timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>

      {isUser && (
        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
          <User className="w-4 h-4 text-secondary-foreground" />
        </div>
      )}
    </div>
  )
}
