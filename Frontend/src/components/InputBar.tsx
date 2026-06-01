import React from 'react';

type InputBarProps = {
  query: string;
  setQuery: React.Dispatch<React.SetStateAction<string>>;
  isLoading: boolean;
  handleResearch: () => Promise<void>;
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export function InputBar({ query, setQuery, isLoading, handleResearch, handleKeyDown }: InputBarProps) {
  return (
    <div className="input-bar">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Enter a research topic..."
      />
      <button onClick={handleResearch} disabled={isLoading}>
        {isLoading ? "Researching..." : "Research"}
      </button>
    </div>
  )
}
