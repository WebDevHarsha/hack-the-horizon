"use client";

import { useState, useEffect } from "react";
import { GoogleGenAI } from "@google/genai";
import { MessageSquare, Plus, Settings, Brain } from "lucide-react";
import ModelsNav from "@/components/modelsnav";
import { auth, db } from "@/app/firebase/config";
import { 
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged
} from "firebase/auth";
import { 
  collection, 
  doc, 
  setDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  serverTimestamp 
} from "firebase/firestore";

export default function SocraticChatPage() {
  const [user, setUser] = useState(null);
  const [conversations, setConversations] = useState([
    { id: 1, title: "New Conversation", messages: [] }
  ]);
  const [activeConversationId, setActiveConversationId] = useState(1);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState("gemini-2.5-flash");

  // Get current conversation
  const activeConversation = conversations.find(c => c.id === activeConversationId);
  const messages = activeConversation?.messages || [];

  // Initialize Gemini
  const ai = new GoogleGenAI({
    apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY || ""
  });

  // Authentication and data loading effect
  useEffect(() => {
    console.log("Authentication effect starting...");
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("Auth state changed:", user ? `User: ${user.uid}` : "No user");
      
      if (user) {
        setUser(user);
        console.log("Loading conversations for user:", user.uid);
        loadUserConversations(user.uid);
      } else {
        console.log("No user found, attempting authentication...");
        // Create a local user ID for this browser
        const localUserId = localStorage.getItem('socratic_user_id') || 
                           `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        if (!localStorage.getItem('socratic_user_id')) {
          localStorage.setItem('socratic_user_id', localUserId);
        }

        console.log("Using local user ID:", localUserId);
        setUser({ uid: localUserId });
        loadUserConversations(localUserId);
      }
    });

    return () => unsubscribe();
  }, []);

  // Load user conversations from Firestore
  const loadUserConversations = (userId) => {
    console.log("Loading conversations for userId:", userId);
    
    try {
      const q = query(
        collection(db, "conversations"),
        where("userId", "==", userId),
        orderBy("updatedAt", "desc")
      );

      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        console.log("Firestore snapshot received, docs count:", querySnapshot.size);
        
        const loadedConversations = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          console.log("Loaded conversation:", doc.id, data);
          loadedConversations.push({
            id: doc.id,
            title: data.title,
            messages: data.messages || []
          });
        });
        
        if (loadedConversations.length > 0) {
          console.log("Setting conversations:", loadedConversations);
          setConversations(loadedConversations);
          // Set active conversation to the most recent one if none selected
          if (!activeConversationId || activeConversationId === 1) {
            setActiveConversationId(loadedConversations[0].id);
          }
        } else {
          console.log("No conversations found, creating initial conversation");
          // Create initial conversation if none exist
          createInitialConversation(userId);
        }
      }, (error) => {
        console.error("Error loading conversations:", error);
        console.error("Error code:", error.code);
        console.error("Error message:", error.message);
        
        // Fallback to creating initial conversation
        createInitialConversation(userId);
      });

      return unsubscribe;
    } catch (error) {
      console.error("Error setting up conversation listener:", error);
      createInitialConversation(userId);
    }
  };

  // Create initial conversation for new users
  const createInitialConversation = async (userId) => {
    console.log("Creating initial conversation for user:", userId);
    
    const initialId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const initialConversation = {
      id: initialId,
      title: "New Conversation",
      messages: [],
      userId: userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    try {
      console.log("Saving initial conversation:", initialConversation);
      await saveConversation(initialConversation);
      console.log("Initial conversation saved successfully");
      setActiveConversationId(initialId);
      
      // Also update local state immediately
      setConversations([{
        id: initialId,
        title: "New Conversation",
        messages: []
      }]);
    } catch (error) {
      console.error("Error creating initial conversation:", error);
      
      // Fallback: create local-only conversation
      setConversations([{
        id: initialId,
        title: "New Conversation",
        messages: []
      }]);
      setActiveConversationId(initialId);
    }
  };

  // Save conversation to Firestore
  const saveConversation = async (conversationData) => {
    if (!user) {
      console.log("No user - cannot save to Firestore");
      return;
    }

    try {
      console.log("Saving conversation to Firestore:", conversationData.id);
      const conversationRef = doc(db, "conversations", conversationData.id);
      await setDoc(conversationRef, {
        ...conversationData,
        userId: user.uid,
        updatedAt: serverTimestamp()
      }, { merge: true });
      console.log("Successfully saved conversation:", conversationData.id);
    } catch (error) {
      console.error("Error saving conversation:", error);
    }
  };

  // Create new conversation
  function createNewConversation() {
    if (!user) return;

    const newId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newConversation = {
      id: newId,
      title: "New Conversation",
      messages: [],
      userId: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    // Add to local state immediately for responsive UI
    setConversations(prev => [newConversation, ...prev]);
    setActiveConversationId(newId);
    
    // Save to Firestore
    saveConversation(newConversation);
  }

  // Update conversation messages
  function updateConversationMessages(newMessages) {
    if (!user) return;

    const updatedTitle = newMessages.length > 0 && activeConversation?.title === "New Conversation"
      ? newMessages[0].text.slice(0, 30) + "..."
      : activeConversation?.title || "New Conversation";

    // Update local state immediately
    setConversations(prev =>
      prev.map(conv =>
        conv.id === activeConversationId
          ? {
              ...conv,
              messages: newMessages,
              title: updatedTitle
            }
          : conv
      )
    );

    // Save to Firestore
    const updatedConversation = {
      id: activeConversationId,
      title: updatedTitle,
      messages: newMessages,
      userId: user.uid,
      updatedAt: serverTimestamp()
    };
    
    saveConversation(updatedConversation);
  }

  async function sendMessage() {
    if (!input.trim() || !user) return;

    const userMessage = { role: "user", text: input };
    const newMessages = [...messages, userMessage];
    updateConversationMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      // Build conversation context for better Socratic flow
      const conversationHistory = messages
        .map((m) => `${m.role.toUpperCase()}: ${m.text}`)
        .join("\n");

      // Socratic system instruction
      const socraticPrompt = `
You are a Socratic teacher. 
You never give direct answers. 
You respond with thought-provoking, open-ended questions that guide the student to figure out the answer themselves.
Encourage deeper reasoning, ask "why" or "how" questions, and build on their previous responses.
Keep it conversational but intellectually challenging.

Conversation so far:
${conversationHistory}

User just said: "${input}"

Your response:
`;

      const response = await ai.models.generateContent({
        model: selectedModel,
        contents: socraticPrompt
      });
      
      const text = response.text;

      const finalMessages = [...newMessages, { role: "assistant", text }];
      updateConversationMessages(finalMessages);
    } catch (err) {
      console.error(err);
      const errorMessages = [...newMessages, { role: "assistant", text: "⚠️ Error: Failed to get a response." }];
      updateConversationMessages(errorMessages);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <div className="p-4 border-b border-gray-200">
        <ModelsNav></ModelsNav>
      </div>
      <div className="flex flex-row h-full">
        {/* Sidebar */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          {/* Sidebar Header */}
          <div className="p-4 border-b border-gray-200">
            <button
              onClick={createNewConversation}
              className="w-full flex items-center gap-2 p-3 text-left bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Chat
            </button>
          </div>

          {/* Chat History */}
          <div className="flex-1 overflow-y-auto p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Chat History
            </h3>
            <div className="space-y-2">
              {conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  onClick={() => setActiveConversationId(conversation.id)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${activeConversationId === conversation.id
                      ? "bg-blue-100 border-2 border-blue-300"
                      : "bg-gray-50 hover:bg-gray-100 border-2 border-transparent"
                    }`}
                >
                  <div className="font-medium text-sm truncate">
                    {conversation.title}
                  </div>
                  <div className="text-xs text-gray-600">
                    {conversation.messages.length} messages
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-gray-200">
            <button className="w-full flex items-center gap-2 p-2 text-left text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <Settings className="w-4 h-4" />
              Settings
            </button>
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
          <div className="bg-white border-b border-gray-200 p-4">
            <h1 className="text-xl font-semibold text-gray-800">
              Socratic Learning Chat
            </h1>
            <p className="text-sm text-gray-600">
              Model: {selectedModel} • {activeConversation?.title}
            </p>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-gray-500 mt-20">
                <Brain className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <h2 className="text-xl font-medium mb-2">Start Learning with Socratic Method</h2>
                <p className="text-sm">Ask any question and I'll guide you to discover the answer through thoughtful questioning.</p>
              </div>
            )}

            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`p-3 rounded-lg max-w-[80%] ${m.role === "user"
                      ? "bg-blue-500 text-white"
                      : "bg-white text-gray-900 border border-gray-200"
                    }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 text-gray-500 p-3 rounded-lg">
                  Thinking...
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="bg-white border-t border-gray-200 p-4">
            <div className="flex gap-2">
              <input
                className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ask or answer..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              />
              <button
                className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                onClick={sendMessage}
                disabled={loading}
              >
                Send
              </button>
            </div>
          </div>
        </div>
        </div>
      </div>
      );
}