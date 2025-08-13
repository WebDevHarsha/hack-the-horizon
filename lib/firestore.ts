// lib/firestore.ts
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  where,
  serverTimestamp,
  onSnapshot,
  Timestamp
} from 'firebase/firestore'
import { db } from '@/app/firebase/config'

// Types
export interface FirestoreMessage {
  id: string
  content: string
  isUser: boolean
  timestamp: Timestamp
  messageType?: 'question' | 'reflection' | 'encouragement' | 'guidance'
}

export interface FirestoreChatHistory {
  id: string
  title: string
  timestamp: Timestamp
  userId?: string
  lastMessage?: string
  messageCount: number
  learningContext?: {
    topic: string
    userLevel: 'beginner' | 'intermediate' | 'advanced'
    previousQuestions: string[]
    userInsights: string[]
    currentFocus: string
  }
}

export interface FirestoreLearningContext {
  topic: string
  userLevel: 'beginner' | 'intermediate' | 'advanced'
  previousQuestions: string[]
  userInsights: string[]
  currentFocus: string
  updatedAt: Timestamp
}

// Collections
const CHATS_COLLECTION = 'chats'
const MESSAGES_COLLECTION = 'messages'

// Chat History Functions
export const createNewChat = async (userId?: string): Promise<string> => {
  const chatId = doc(collection(db, CHATS_COLLECTION)).id
  const newChat: Omit<FirestoreChatHistory, 'id'> = {
    title: 'New Learning Session',
    timestamp: serverTimestamp() as Timestamp,
    userId: userId || 'anonymous',
    messageCount: 0
  }

  await setDoc(doc(db, CHATS_COLLECTION, chatId), newChat)
  return chatId
}

export const getChatHistory = async (userId?: string): Promise<FirestoreChatHistory[]> => {
  try {
    const chatsRef = collection(db, CHATS_COLLECTION)
    const q = userId 
      ? query(chatsRef, where('userId', '==', userId), orderBy('timestamp', 'desc'), limit(50))
      : query(chatsRef, orderBy('timestamp', 'desc'), limit(50))
    
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as FirestoreChatHistory))
  } catch (error) {
    console.error('Error fetching chat history:', error)
    return []
  }
}

export const updateChatTitle = async (chatId: string, title: string): Promise<void> => {
  try {
    await updateDoc(doc(db, CHATS_COLLECTION, chatId), { title })
  } catch (error) {
    console.error('Error updating chat title:', error)
    throw error
  }
}

export const deleteChat = async (chatId: string): Promise<void> => {
  try {
    // Delete the chat document
    await deleteDoc(doc(db, CHATS_COLLECTION, chatId))
    
    // Delete all messages in the chat
    const messagesRef = collection(db, CHATS_COLLECTION, chatId, MESSAGES_COLLECTION)
    const messagesSnapshot = await getDocs(messagesRef)
    
    const deletePromises = messagesSnapshot.docs.map(doc => deleteDoc(doc.ref))
    await Promise.all(deletePromises)
  } catch (error) {
    console.error('Error deleting chat:', error)
    throw error
  }
}

// Message Functions
export const saveMessage = async (
  chatId: string, 
  message: Omit<FirestoreMessage, 'timestamp'> & { timestamp?: Date }
): Promise<void> => {
  try {
    const messageToSave = {
      ...message,
      timestamp: serverTimestamp() as Timestamp
    }

    await setDoc(
      doc(db, CHATS_COLLECTION, chatId, MESSAGES_COLLECTION, message.id), 
      messageToSave
    )

    // Update chat's last message and message count
    const chatRef = doc(db, CHATS_COLLECTION, chatId)
    const chatDoc = await getDoc(chatRef)
    
    if (chatDoc.exists()) {
      const currentCount = chatDoc.data().messageCount || 0
      await updateDoc(chatRef, {
        lastMessage: message.content.substring(0, 100), // First 100 chars
        messageCount: currentCount + 1,
        timestamp: serverTimestamp() // Update last activity
      })
    }
  } catch (error) {
    console.error('Error saving message:', error)
    throw error
  }
}

export const getChatMessages = async (chatId: string): Promise<FirestoreMessage[]> => {
  try {
    const messagesRef = collection(db, CHATS_COLLECTION, chatId, MESSAGES_COLLECTION)
    const q = query(messagesRef, orderBy('timestamp', 'asc'))
    
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(doc => ({
      ...doc.data()
    } as FirestoreMessage))
  } catch (error) {
    console.error('Error fetching messages:', error)
    return []
  }
}

// Real-time message listener
export const subscribeToMessages = (
  chatId: string, 
  callback: (messages: FirestoreMessage[]) => void
) => {
  const messagesRef = collection(db, CHATS_COLLECTION, chatId, MESSAGES_COLLECTION)
  const q = query(messagesRef, orderBy('timestamp', 'asc'))
  
  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(doc => ({
      ...doc.data()
    } as FirestoreMessage))
    callback(messages)
  }, (error) => {
    console.error('Error in message subscription:', error)
  })
}

// Learning Context Functions
export const saveLearningContext = async (
  chatId: string, 
  context: Omit<FirestoreLearningContext, 'updatedAt'>
): Promise<void> => {
  try {
    const contextToSave = {
      ...context,
      updatedAt: serverTimestamp() as Timestamp
    }

    await updateDoc(doc(db, CHATS_COLLECTION, chatId), {
      learningContext: contextToSave
    })
  } catch (error) {
    console.error('Error saving learning context:', error)
    throw error
  }
}

export const getLearningContext = async (chatId: string): Promise<FirestoreLearningContext | null> => {
  try {
    const chatDoc = await getDoc(doc(db, CHATS_COLLECTION, chatId))
    
    if (chatDoc.exists() && chatDoc.data().learningContext) {
      return chatDoc.data().learningContext as FirestoreLearningContext
    }
    return null
  } catch (error) {
    console.error('Error fetching learning context:', error)
    return null
  }
}

// Utility Functions
export const generateChatTitle = (firstMessage: string): string => {
  // Extract a meaningful title from the first user message
  const cleanMessage = firstMessage.trim()
  
  if (cleanMessage.length <= 50) {
    return cleanMessage
  }
  
  // Take first 50 characters and add ellipsis
  return cleanMessage.substring(0, 47) + '...'
}

// Analytics/Stats Functions (optional)
export const getChatStats = async (userId?: string) => {
  try {
    const chatsRef = collection(db, CHATS_COLLECTION)
    const q = userId 
      ? query(chatsRef, where('userId', '==', userId))
      : query(chatsRef)
    
    const querySnapshot = await getDocs(q)
    
    let totalChats = 0
    let totalMessages = 0
    const topics = new Map<string, number>()
    
    querySnapshot.docs.forEach(doc => {
      const data = doc.data()
      totalChats++
      totalMessages += data.messageCount || 0
      
      if (data.learningContext?.topic) {
        const topic = data.learningContext.topic
        topics.set(topic, (topics.get(topic) || 0) + 1)
      }
    })
    
    return {
      totalChats,
      totalMessages,
      popularTopics: Array.from(topics.entries())
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
    }
  } catch (error) {
    console.error('Error fetching chat stats:', error)
    return { totalChats: 0, totalMessages: 0, popularTopics: [] }
  }
}