"use client"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import {  Plus, Settings } from "lucide-react"

interface ChatHistory {
  id: string
  title: string
  timestamp: Date
}

interface ChatSidebarProps {
  isOpen: boolean
  onToggle: () => void
  onNewChat: () => void
  chatHistory: ChatHistory[]
  activeChatId?: string
  onSelectChat: (chatId: string) => void
}

export function ChatSidebar({
  isOpen,
  onToggle,
  onNewChat,
  chatHistory,
  activeChatId,
  onSelectChat,
}: ChatSidebarProps) {
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onToggle} />}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed left-0 top-0 z-50 h-full w-80 bg-sidebar border-r border-sidebar-border transform transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          {/* <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-sidebar-primary-foreground" />
              </div>
              <h1 className="text-xl font-semibold text-sidebar-foreground">Sage</h1>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggle}
              className="lg:hidden text-sidebar-foreground hover:bg-sidebar-accent"
            >
              <X className="w-4 h-4" />
            </Button>
          </div> */}

          {/* New Chat Button */}
          <div className="p-4">
            <Button
              onClick={onNewChat}
              className="w-full justify-start gap-2 bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90"
            >
              <Plus className="w-4 h-4" />
              New Chat
            </Button>
          </div>

          {/* Chat History */}
          <div className="flex-1 px-4">
            <h2 className="text-sm font-medium text-sidebar-foreground/70 mb-2">Recent Chats</h2>
            <ScrollArea className="h-full">
              <div className="space-y-1">
                {chatHistory.map((chat) => (
                  <Button
                    key={chat.id}
                    variant="ghost"
                    onClick={() => onSelectChat(chat.id)}
                    className={cn(
                      "w-full justify-start text-left h-auto p-3 text-sidebar-foreground hover:bg-sidebar-accent",
                      activeChatId === chat.id && "bg-sidebar-accent",
                    )}
                  >
                    <div className="flex flex-col items-start gap-1 min-w-0 flex-1">
                      <span className="text-sm font-medium truncate w-full">{chat.title}</span>
                      {/* <span className="text-xs text-sidebar-foreground/50">{chat.timestamp.toLocaleDateString()}</span> */}
                    </div>
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Settings */}
          <div className="p-[22px] border-t border-sidebar-border">
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 text-sidebar-foreground hover:bg-sidebar-accent"
            >
              <Settings className="w-4 h-4" />
              Settings
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
