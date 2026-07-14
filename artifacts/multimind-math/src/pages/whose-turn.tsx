import React from "react";
import { Link } from "wouter";

export default function WhoseTurn() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center py-12 px-6">
      <h1 className="text-4xl font-bold text-center mb-8">Whose Turn Is It?</h1>
      <div className="flex gap-6">
        <Link href="/hub">
          <div className="w-32 h-32 bg-primary/20 rounded-full flex items-center justify-center text-4xl cursor-pointer hover:scale-105 transition-transform">
            👤
          </div>
        </Link>
        <Link href="/grownup-check">
          <div className="w-32 h-32 bg-accent/20 rounded-full flex items-center justify-center text-4xl cursor-pointer hover:scale-105 transition-transform">
            👨‍👩‍👧
          </div>
        </Link>
      </div>
    </div>
  );
}
