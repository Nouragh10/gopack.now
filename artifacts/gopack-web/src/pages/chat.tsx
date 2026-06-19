import { useState, useEffect, useRef } from "react";
import { useRoute, Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Send, ArrowLeft, Loader2 } from "lucide-react";
import { ref, push, set, onValue } from "firebase/database";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";

const AVATAR_COLORS = ["#E85D3A", "#7F77DD", "#1D9E75", "#378ADD", "#BA7517", "#C4448A"];

function getAvatarColor(uid: string) {
  let hash = 0;
  for (let i = 0; i < uid.length; i++) hash = uid.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function Chat() {
  const [, params] = useRoute("/trip/:tripId/chat");
  const tripId = params?.tripId || "";
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [tripName, setTripName] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!tripId) return;
    const chatRef = ref(db, `trips/${tripId}/chat`);
    const tripRef = ref(db, `trips/${tripId}/destination`);
    const unsub1 = onValue(chatRef, snap => {
      const data = snap.val();
      if (data) {
        const msgs = Object.entries(data).map(([id, msg]: [string, any]) => ({ id, ...msg }));
        msgs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        setMessages(msgs);
      } else {
        setMessages([]);
      }
      setLoading(false);
    });
    const unsub2 = onValue(tripRef, snap => {
      if (snap.exists()) setTripName(snap.val());
    });
    return () => { unsub1(); unsub2(); };
  }, [tripId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !user || !tripId) return;
    setSending(true);
    const chatRef = ref(db, `trips/${tripId}/chat`);
    const newRef = push(chatRef);
    await set(newRef, {
      text: text.trim(),
      author: user.displayName || "Guest",
      memberId: user.uid,
      timestamp: new Date().toISOString(),
    });
    setText("");
    setSending(false);
  };

  return (
    <div className="h-screen bg-background text-foreground flex flex-col">
      {/* Nav */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-border shrink-0">
        <Link href={`/trip/${tripId}`} className="text-muted-foreground hover:text-foreground" data-testid="link-back">
          <ArrowLeft size={20} />
        </Link>
        <Link href="/" className="font-display font-bold text-xl" data-testid="link-logo">
          go<span className="text-primary">pack</span>
        </Link>
        <div className="ml-3">
          <p className="font-medium text-sm leading-tight">{tripName || "Trip Chat"}</p>
          <p className="text-xs text-muted-foreground">Group chat</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-3">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 size={24} className="animate-spin text-primary" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-center text-muted-foreground">
            <div>
              <p className="font-medium mb-1">No messages yet</p>
              <p className="text-sm">Start the conversation with your crew</p>
            </div>
          </div>
        ) : (
          <AnimatePresence>
            {messages.map((msg) => {
              const isMe = user?.uid === msg.memberId;
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex items-end gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}
                  data-testid={`message-${msg.id}`}
                >
                  {!isMe && (
                    <div
                      className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-white text-xs font-medium"
                      style={{ backgroundColor: getAvatarColor(msg.memberId) }}
                    >
                      {msg.author?.[0]?.toUpperCase() || "?"}
                    </div>
                  )}
                  <div className={`max-w-[70%] ${isMe ? "items-end" : "items-start"} flex flex-col gap-1`}>
                    {!isMe && <span className="text-xs text-muted-foreground px-1">{msg.author}</span>}
                    <div
                      className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                        isMe
                          ? "bg-foreground text-background rounded-br-sm"
                          : "bg-muted/60 text-foreground rounded-bl-sm"
                      }`}
                    >
                      {msg.text}
                    </div>
                    <span className="text-xs text-muted-foreground/60 px-1">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="flex items-center gap-3 px-6 py-4 border-t border-border shrink-0">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Message the group..."
          className="flex-1 border border-border rounded-full px-5 py-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          data-testid="input-message"
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          className="w-11 h-11 bg-primary text-white rounded-full flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-40"
          data-testid="button-send"
        >
          {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </form>
    </div>
  );
}
