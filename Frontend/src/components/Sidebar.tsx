import React from 'react';
import { Session } from '../types';

type SidebarProps = {
  sessionId: string;
  sessions: Array<Session>;
  isLoading: boolean;
  onNewChat: () => Promise<void>;
  onSelectSession: (sid: string) => Promise<void>;
  onDeleteSession: (e: React.MouseEvent, sid: string) => Promise<void>;
}

export function Sidebar({ sessionId, sessions, isLoading, onNewChat, onSelectSession, onDeleteSession }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">Research Assistant</div>
      <button className="new-chat-btn" onClick={onNewChat} disabled={isLoading}>
        + New Chat
      </button>
      <div className="session-list">
        {sessions.map((s) => (
          <div
            key={s.session_id}
            className={`session-item${s.session_id === sessionId ? " active" : ""}`}
            onClick={() => onSelectSession(s.session_id)}
            title={s.created_at}
          >
            <span className="session-item-label">{s.session_id.slice(0, 8)}…</span>
            <button
              className="delete-session-btn"
              onClick={(e) => onDeleteSession(e, s.session_id)}
              title="Delete chat"
            >
              🗑
            </button>
          </div>
        ))}
      </div>
    </aside>
  )
}
