import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, LogOut, User, Mail, Edit2, Check, X, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { updateProfile } from "firebase/auth";
import { ref, update } from "firebase/database";
import { auth, db } from "@/lib/firebase";

const AVATAR_COLORS = ["#E85D3A", "#7F77DD", "#1D9E75", "#378ADD", "#BA7517", "#C4448A"];

function getAvatarColor(uid: string): string {
  let hash = 0;
  for (let i = 0; i < uid.length; i++) hash = uid.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function Profile() {
  const { user, signOut } = useAuth();
  const [, setLocation] = useLocation();
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(user?.displayName || "");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const handleSignOut = async () => {
    await signOut();
    setLocation("/");
  };

  const handleSaveName = async () => {
    if (!user || !nameInput.trim()) return;
    setSaving(true);
    setSaveError("");
    try {
      const newName = nameInput.trim();
      await updateProfile(user, { displayName: newName });

      // Sync name to all trip member records in RTDB
      try {
        const storageKey = `gopack_trips_${user.uid}`;
        const raw = localStorage.getItem(storageKey);
        const tripIds: string[] = raw ? JSON.parse(raw) : [];
        await Promise.all(
          tripIds.map(tripId =>
            update(ref(db, `trips/${tripId}/members/${user.uid}`), { name: newName })
          )
        );
      } catch {
        // Non-critical — member name sync failed silently
      }

      setEditingName(false);
    } catch {
      setSaveError("Could not update name. Try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <p className="mb-4">You&apos;re not signed in.</p>
          <Link href="/login" className="bg-primary text-white px-6 py-3 rounded-full hover:bg-primary/90 transition-colors">
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  const initial = (user.displayName || user.email || "?")[0].toUpperCase();
  const avatarColor = getAvatarColor(user.uid);
  const isAnonymous = user.isAnonymous;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="flex items-center justify-between px-8 py-5 border-b border-border">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-muted-foreground hover:text-foreground" data-testid="link-back">
            <ArrowLeft size={20} />
          </Link>
          <Link href="/" className="font-display font-bold text-xl" data-testid="link-logo">
            go<span className="text-primary">pack</span>
          </Link>
        </div>
      </nav>

      <div className="max-w-lg mx-auto px-8 py-16">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-8">

          {/* Avatar + name */}
          <div className="flex flex-col items-center gap-4">
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center text-white text-4xl font-bold"
              style={{ backgroundColor: avatarColor }}
            >
              {initial}
            </div>
            {editingName ? (
              <div className="flex items-center gap-2 w-full max-w-xs">
                <input
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  className="flex-1 border border-border rounded-lg px-4 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 text-center"
                  autoFocus
                  onKeyDown={e => { if (e.key === "Enter") handleSaveName(); if (e.key === "Escape") setEditingName(false); }}
                  data-testid="input-display-name"
                />
                <button onClick={handleSaveName} disabled={saving} className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors" data-testid="button-save-name">
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                </button>
                <button onClick={() => { setEditingName(false); setNameInput(user.displayName || ""); }} className="p-2 text-muted-foreground hover:bg-muted/50 rounded-lg transition-colors">
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="font-serif text-3xl font-bold">
                  {user.displayName || (isAnonymous ? "Guest" : user.email?.split("@")[0])}
                </h1>
                <button
                  onClick={() => setEditingName(true)}
                  className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors"
                  title="Edit display name"
                  data-testid="button-edit-name"
                >
                  <Edit2 size={14} />
                </button>
              </div>
            )}
            {saveError && <p className="text-destructive text-sm">{saveError}</p>}
            {isAnonymous && (
              <span className="text-xs px-3 py-1 bg-muted rounded-full text-muted-foreground border border-border">
                Guest account
              </span>
            )}
          </div>

          {/* Details */}
          <div className="border border-border rounded-2xl divide-y divide-border bg-background">
            {user.email && (
              <div className="flex items-center gap-3 px-5 py-4">
                <Mail size={16} className="text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-0.5">Email</p>
                  <p className="text-sm">{user.email}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3 px-5 py-4">
              <User size={16} className="text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-0.5">Account type</p>
                <p className="text-sm">{isAnonymous ? "Guest (anonymous)" : "Google account"}</p>
              </div>
            </div>
          </div>

          {isAnonymous && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm text-amber-800">
              <p className="font-medium mb-1">You&apos;re using a guest account</p>
              <p className="text-amber-700">Sign in with Google to keep your trips across devices and never lose your data.</p>
              <Link href="/login" className="mt-3 inline-block bg-amber-600 text-white px-5 py-2.5 rounded-full text-sm font-medium hover:bg-amber-700 transition-colors">
                Upgrade to Google sign-in
              </Link>
            </div>
          )}

          {/* Sign out */}
          <button
            onClick={handleSignOut}
            className="flex items-center justify-center gap-2 w-full border border-border py-3.5 rounded-full text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            data-testid="button-sign-out"
          >
            <LogOut size={16} />
            Sign out
          </button>

        </motion.div>
      </div>
    </div>
  );
}
