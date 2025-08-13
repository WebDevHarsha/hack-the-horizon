"use client";

import { useState } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";

export default function FeynmanCoachPage() {
  const [messages, setMessages] = useState<{ role: string; text: string }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // Initialize Gemini
  const genAI = new GoogleGenerativeAI(
    process.env.NEXT_PUBLIC_GEMINI_API_KEY || ""
  );

  async function sendMessage() {
    if (!input.trim()) return;

    const userMessage = { role: "user", text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      // Pass conversation so far
      const conversationHistory = messages
        .map((m) => `${m.role.toUpperCase()}: ${m.text}`)
        .join("\n");

      // Prompt for "Feynman coach" style
      const feynmanCoachPrompt = `
You are acting as a Feynman Technique coach.
The student (user) is explaining a concept.
Your role:
1. Do NOT explain the concept for them.
2. Listen to their explanation and point out parts that are unclear, missing, or too complex.
3. Ask them to simplify, clarify, or give an example in their own words.
4. Use follow-up questions like: "Can you explain that more simply?" or "What does that mean in everyday terms?"
5. Keep them doing the explaining — only guide them with questions.

Conversation so far:
${conversationHistory}

User just said: "${input}"

Your response:
`;

      const result = await model.generateContent(feynmanCoachPrompt);
      const text = result.response.text();

      setMessages((prev) => [...prev, { role: "assistant", text }]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "⚠️ Error: Failed to get a response." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto p-4">
      <div className="flex-1 overflow-y-auto space-y-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`p-3 rounded-lg max-w-[80%] ${
              m.role === "user"
                ? "bg-purple-500 text-white self-end ml-auto"
                : "bg-gray-200 text-gray-900 self-start"
            }`}
          >
            {m.text}
          </div>
        ))}
        {loading && <div className="text-gray-500">Thinking...</div>}
      </div>

      <div className="mt-4 flex gap-2">
        <input
          className="flex-1 p-2 border rounded-lg"
          placeholder="Explain your concept here..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button
          className="bg-purple-500 text-white px-4 py-2 rounded-lg"
          onClick={sendMessage}
          disabled={loading}
        >
          Send
        </button>
      </div>
    </div>
  );
}
