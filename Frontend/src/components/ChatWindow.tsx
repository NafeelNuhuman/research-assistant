import React, { RefObject } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message } from '../types';

type ChatWindowProps = {
  messages: Array<Message>;
  isLoading: boolean;
  toolStatus: string;
  bottomRef: RefObject<HTMLDivElement | null>;
}

export function ChatWindow({ messages, isLoading, toolStatus, bottomRef }: ChatWindowProps) {
  const exchanges: Array<{ user: Message; assistant: Message | null }> = []
  for (let i = 0; i < messages.length; i++) {
    if (messages[i].role === "user") {
      const next = messages[i + 1]
      exchanges.push({
        user: messages[i],
        assistant: next?.role === "assistant" ? next : null,
      })
      if (next?.role === "assistant") i++
    }
  }

  return (
    <div className="chat-window">
      {exchanges.map((exchange, index) => (
        <div key={index} className="exchange">
          <div className="bubble user-bubble">{exchange.user.content}</div>
          {exchange.assistant !== null && (
            <div className="bubble assistant-bubble">
              {exchange.assistant.content === "" && isLoading
                ? toolStatus.length === 0
                  ? <span className="typing-indicator">Researching…</span>
                  : <span className="typing-indicator">{toolStatus}</span>
                : <ReactMarkdown remarkPlugins={[remarkGfm]}>{exchange.assistant.content}</ReactMarkdown>
              }
            </div>
          )}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
