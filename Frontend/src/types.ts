export type Message = {
  role: "user" | "assistant";
  content: string;
}

export type Session = {
  session_id: string;
  created_at: string;
  title?: string;
}
