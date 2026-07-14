import React from "react";

interface MascotProps {
  className?: string;
  size?: number;
}

export function ZiggyMascot({ className = "", size = 120 }: MascotProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <ellipse cx="60" cy="88" rx="38" ry="26" fill="#6C4EF4" opacity="0.2"/>
      <circle cx="37" cy="18" r="13" fill="#7C5CBF"/>
      <circle cx="83" cy="18" r="13" fill="#7C5CBF"/>
      <ellipse cx="60" cy="65" rx="45" ry="42" fill="#7C5CBF"/>
      <ellipse cx="60" cy="58" rx="42" ry="38" fill="#9B7DE8"/>
      <circle cx="45" cy="52" r="11" fill="white"/>
      <circle cx="75" cy="52" r="11" fill="white"/>
      <circle cx="47" cy="51" r="6" fill="#2D1B69"/>
      <circle cx="77" cy="51" r="6" fill="#2D1B69"/>
      <circle cx="49" cy="49" r="2.5" fill="white"/>
      <circle cx="79" cy="49" r="2.5" fill="white"/>
      <path d="M47 67 Q60 78 73 67" stroke="#2D1B69" strokeWidth="3" fill="none" strokeLinecap="round"/>
      <ellipse cx="18" cy="72" rx="12" ry="8" fill="#9B7DE8" transform="rotate(-25 18 72)"/>
      <ellipse cx="102" cy="72" rx="12" ry="8" fill="#9B7DE8" transform="rotate(25 102 72)"/>
      <circle cx="18" cy="82" r="6" fill="#9B7DE8"/>
      <circle cx="102" cy="82" r="6" fill="#9B7DE8"/>
    </svg>
  );
}

export function PipMascot({ className = "", size = 120 }: MascotProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <ellipse cx="60" cy="92" rx="38" ry="22" fill="#3B8BEB" opacity="0.2"/>
      <ellipse cx="60" cy="65" rx="48" ry="44" fill="#2E7DD1"/>
      <ellipse cx="60" cy="60" rx="44" ry="40" fill="#5BA3F5"/>
      <circle cx="38" cy="22" r="10" fill="#5BA3F5"/>
      <circle cx="82" cy="22" r="10" fill="#5BA3F5"/>
      <ellipse cx="38" cy="22" rx="10" ry="8" fill="#5BA3F5"/>
      <ellipse cx="82" cy="22" rx="10" ry="8" fill="#5BA3F5"/>
      <ellipse cx="44" cy="54" rx="11" ry="9" fill="white"/>
      <ellipse cx="76" cy="54" rx="11" ry="9" fill="white"/>
      <ellipse cx="45" cy="55" rx="5.5" ry="5" fill="#1A4A8A"/>
      <ellipse cx="77" cy="55" rx="5.5" ry="5" fill="#1A4A8A"/>
      <circle cx="47" cy="53" r="2" fill="white"/>
      <circle cx="79" cy="53" r="2" fill="white"/>
      <ellipse cx="60" cy="68" rx="6" ry="4" fill="#3E89D8"/>
      <path d="M48 74 Q60 82 72 74" stroke="#1A4A8A" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <ellipse cx="15" cy="70" rx="11" ry="7" fill="#5BA3F5" transform="rotate(-15 15 70)"/>
      <ellipse cx="105" cy="70" rx="11" ry="7" fill="#5BA3F5" transform="rotate(15 105 70)"/>
    </svg>
  );
}

export function NovaMascot({ className = "", size = 120 }: MascotProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <ellipse cx="60" cy="94" rx="36" ry="20" fill="#2ECC71" opacity="0.2"/>
      <polygon points="55,8 60,0 65,8" fill="#27AE60"/>
      <polygon points="40,14 44,6 50,14" fill="#27AE60"/>
      <polygon points="70,14 76,6 80,14" fill="#27AE60"/>
      <ellipse cx="60" cy="64" rx="46" ry="42" fill="#27AE60"/>
      <ellipse cx="60" cy="58" rx="42" ry="38" fill="#2ECC71"/>
      <circle cx="44" cy="52" r="12" fill="white"/>
      <circle cx="76" cy="52" r="12" fill="white"/>
      <circle cx="46" cy="50" r="7" fill="#1A6B35"/>
      <circle cx="78" cy="50" r="7" fill="#1A6B35"/>
      <circle cx="48" cy="48" r="2.5" fill="white"/>
      <circle cx="80" cy="48" r="2.5" fill="white"/>
      <path d="M46 66 Q60 79 74 66" stroke="#1A6B35" strokeWidth="3" fill="none" strokeLinecap="round"/>
      <rect x="52" y="70" width="16" height="6" rx="3" fill="#1A6B35"/>
      <ellipse cx="16" cy="68" rx="12" ry="8" fill="#2ECC71" transform="rotate(-20 16 68)"/>
      <ellipse cx="104" cy="68" rx="12" ry="8" fill="#2ECC71" transform="rotate(20 104 68)"/>
      <circle cx="16" cy="78" r="5" fill="#2ECC71"/>
      <circle cx="104" cy="78" r="5" fill="#2ECC71"/>
    </svg>
  );
}

export function BrambleMascot({ className = "", size = 120 }: MascotProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <ellipse cx="60" cy="94" rx="38" ry="22" fill="#E67E22" opacity="0.2"/>
      <circle cx="32" cy="24" r="16" fill="#D35400"/>
      <circle cx="88" cy="24" r="16" fill="#D35400"/>
      <circle cx="32" cy="24" r="10" fill="#F39C12"/>
      <circle cx="88" cy="24" r="10" fill="#F39C12"/>
      <ellipse cx="60" cy="66" rx="46" ry="42" fill="#D35400"/>
      <ellipse cx="60" cy="60" rx="43" ry="39" fill="#E67E22"/>
      <ellipse cx="60" cy="75" rx="28" ry="18" fill="#F39C12"/>
      <circle cx="44" cy="54" r="11" fill="white"/>
      <circle cx="76" cy="54" r="11" fill="white"/>
      <circle cx="46" cy="53" r="6" fill="#7D3C00"/>
      <circle cx="78" cy="53" r="6" fill="#7D3C00"/>
      <circle cx="48" cy="51" r="2" fill="white"/>
      <circle cx="80" cy="51" r="2" fill="white"/>
      <circle cx="60" cy="68" r="5" fill="#D35400"/>
      <circle cx="60" cy="68" r="3.5" fill="#C0392B"/>
      <path d="M48 75 Q60 85 72 75" stroke="#7D3C00" strokeWidth="3" fill="none" strokeLinecap="round"/>
      <ellipse cx="14" cy="72" rx="11" ry="7" fill="#E67E22" transform="rotate(-20 14 72)"/>
      <ellipse cx="106" cy="72" rx="11" ry="7" fill="#E67E22" transform="rotate(20 106 72)"/>
    </svg>
  );
}

export function EchoMascot({ className = "", size = 120 }: MascotProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <ellipse cx="60" cy="96" rx="36" ry="18" fill="#7F8C8D" opacity="0.2"/>
      <rect x="52" y="2" width="16" height="14" rx="3" fill="#95A5A6"/>
      <circle cx="60" cy="2" r="3" fill="#E74C3C"/>
      <rect x="20" y="30" width="80" height="72" rx="16" fill="#7F8C8D"/>
      <rect x="24" y="34" width="72" height="64" rx="14" fill="#95A5A6"/>
      <rect x="32" y="44" width="56" height="38" rx="8" fill="#2C3E50"/>
      <rect x="36" y="48" width="22" height="14" rx="4" fill="#3498DB"/>
      <rect x="62" y="48" width="22" height="14" rx="4" fill="#3498DB"/>
      <circle cx="47" cy="55" r="4" fill="white"/>
      <circle cx="73" cy="55" r="4" fill="white"/>
      <circle cx="48" cy="54" r="2" fill="#1A252F"/>
      <circle cx="74" cy="54" r="2" fill="#1A252F"/>
      <rect x="38" y="68" width="44" height="8" rx="4" fill="#3498DB" opacity="0.6"/>
      <rect x="42" y="70" width="18" height="4" rx="2" fill="white" opacity="0.8"/>
      <rect x="10" y="50" width="10" height="24" rx="5" fill="#7F8C8D"/>
      <rect x="100" y="50" width="10" height="24" rx="5" fill="#7F8C8D"/>
      <rect x="35" y="102" width="50" height="12" rx="6" fill="#95A5A6"/>
    </svg>
  );
}

export function LunaMascot({ className = "", size = 120 }: MascotProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <ellipse cx="60" cy="94" rx="38" ry="22" fill="#E91E8C" opacity="0.2"/>
      <path d="M60 2 L64 14 L52 8 Z" fill="#FFD700"/>
      <path d="M60 2 L56 14 L68 8 Z" fill="#FFA500"/>
      <circle cx="60" cy="4" r="5" fill="#FFD700"/>
      <ellipse cx="60" cy="65" rx="46" ry="43" fill="#C2185B"/>
      <ellipse cx="60" cy="59" rx="43" ry="40" fill="#E91E8C"/>
      <ellipse cx="60" cy="59" rx="40" ry="37" fill="#F06292"/>
      <circle cx="44" cy="52" r="12" fill="white"/>
      <circle cx="76" cy="52" r="12" fill="white"/>
      <circle cx="46" cy="50" r="7" fill="#880E4F"/>
      <circle cx="78" cy="50" r="7" fill="#880E4F"/>
      <circle cx="48" cy="48" r="2.5" fill="white"/>
      <circle cx="80" cy="48" r="2.5" fill="white"/>
      <circle cx="44" cy="67" r="5" fill="#F48FB1"/>
      <circle cx="76" cy="67" r="5" fill="#F48FB1"/>
      <path d="M46 68 Q60 80 74 68" stroke="#880E4F" strokeWidth="3" fill="none" strokeLinecap="round"/>
      <path d="M52 73 Q60 79 68 73" stroke="#880E4F" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.5"/>
      <ellipse cx="14" cy="70" rx="12" ry="8" fill="#F06292" transform="rotate(-20 14 70)"/>
      <ellipse cx="106" cy="70" rx="12" ry="8" fill="#F06292" transform="rotate(20 106 70)"/>
      <path d="M24 46 L26 40 L28 46" fill="#FFD700" opacity="0.8"/>
      <path d="M92 44 L94 38 L96 44" fill="#FFD700" opacity="0.8"/>
    </svg>
  );
}

const MASCOTS: Record<string, React.FC<MascotProps>> = {
  Ziggy: ZiggyMascot,
  Pip: PipMascot,
  Nova: NovaMascot,
  Bramble: BrambleMascot,
  Echo: EchoMascot,
  Luna: LunaMascot,
};

interface MascotByNameProps extends MascotProps {
  name: string;
}

export function MascotByName({ name, className, size }: MascotByNameProps) {
  const Component = MASCOTS[name] ?? ZiggyMascot;
  return <Component className={className} size={size} />;
}

export const GUIDE_CONFIG = [
  { name: "Ziggy", personality: "Curious & Encouraging", color: "from-violet-500 to-purple-600", dot: "bg-violet-500", textColor: "text-violet-700", bgLight: "bg-violet-50", border: "border-violet-300" },
  { name: "Pip",   personality: "Calm & Patient",        color: "from-blue-400 to-blue-600",    dot: "bg-blue-500",   textColor: "text-blue-700",   bgLight: "bg-blue-50",   border: "border-blue-300"   },
  { name: "Nova",  personality: "Energetic & Fun",       color: "from-green-400 to-emerald-600", dot: "bg-green-500", textColor: "text-green-700",  bgLight: "bg-green-50",  border: "border-green-300"  },
  { name: "Bramble", personality: "Thoughtful & Wise",   color: "from-orange-400 to-amber-600", dot: "bg-orange-500", textColor: "text-orange-700", bgLight: "bg-orange-50", border: "border-orange-300" },
  { name: "Echo",  personality: "Logical & Clear",       color: "from-slate-400 to-gray-600",   dot: "bg-slate-500",  textColor: "text-slate-700",  bgLight: "bg-slate-50",  border: "border-slate-300"  },
  { name: "Luna",  personality: "Kind & Cheerful",       color: "from-pink-400 to-rose-500",    dot: "bg-pink-500",   textColor: "text-pink-700",   bgLight: "bg-pink-50",   border: "border-pink-300"   },
];

export default MascotByName;
