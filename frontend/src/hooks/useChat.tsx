import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { prompt as systemPrompt } from "../system-prompt";

export type ChatMessage = {
    id: string;
    role: "user" | "ai";
    text: string;
};

type OpenAIChatMessage = {
    role: "system" | "user" | "assistant";
    content: string;
};
export default function useChat() {
    const [conversation, setConversation] = useState<ChatMessage[]>([]);
    const mutation = useMutation({
        mutationFn: async (messages: ChatMessage[]) => {
            const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
            if (!apiKey) {
                throw new Error("Missing VITE_OPENAI_API_KEY");
            }

            const payloadMessages: OpenAIChatMessage[] = [
                { role: "system", content: systemPrompt },
                ...messages.map(
                    (message): OpenAIChatMessage => ({
                        role: message.role === "ai" ? "assistant" : "user",
                        content: message.text,
                    }),
                ),
            ];

            const response = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model: "gpt-4o-mini",
                    messages: payloadMessages,
                }),
            });

            if (!response.ok) {
                throw new Error(`OpenAI error: ${response.status}`);
            }

            const data: {
                choices?: { message?: { content?: string } }[];
            } = await response.json();

            return data.choices?.[0]?.message?.content ?? "";
        },
    });

    const sendMessage = async (text: string) => {
        const trimmed = text.trim();
        if (!trimmed) return;

        const userMessage: ChatMessage = {
            id: crypto.randomUUID(),
            role: "user",
            text: trimmed,
        };

        const nextMessages = [...conversation, userMessage];
        setConversation(nextMessages);

        try {
            const responseText = await mutation.mutateAsync(nextMessages);
            if (responseText) {
                setConversation((prev) => [
                    ...prev,
                    {
                        id: crypto.randomUUID(),
                        role: "ai",
                        text: responseText,
                    },
                ]);
            }
        } catch (error) {
            console.error(error);
        }
    };

    return {
        conversation,
        sendMessage,
        isLoading: mutation.isPending,
        error: mutation.error,
    };
}