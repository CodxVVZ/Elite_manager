import React from "react";
import { teamLogos } from "@/lib/teamLogos";
import { teams } from "@/lib/teams";

interface TeamLogoProps {
  teamId: number | string;
  logoUrl?: string;
  fallbackName?: string;
  className?: string;
}

export function TeamLogo({ teamId, logoUrl, fallbackName, className = "w-full h-full" }: TeamLogoProps) {
  const numericId = typeof teamId === 'number' ? teamId : parseInt(teamId, 10);
  
  if (!logoUrl) {
    const team = teams.find(t => t?.id === numericId);
    if (team?.logoUrl) logoUrl = team.logoUrl;
  }

  const nameToUse = fallbackName || `Time ${teamId}`;

  const finalUrl = logoUrl;

  if (finalUrl) {
    return <img src={finalUrl} alt={fallbackName || "Logo"} className={`object-contain ${className}`} />;
  }

  const SvgLogo = teamLogos[numericId];
  if (SvgLogo) {
    return <div className={className}>{SvgLogo}</div>;
  }

  // Generate generic stylish logo based on name/id
  let abbr = "?";
  if (nameToUse.length >= 3) {
      abbr = nameToUse.substring(0, 3).toUpperCase();
  } else if (nameToUse.length > 0) {
      abbr = nameToUse.toUpperCase();
  }
  
  let hash = 0;
  for (let i = 0; i < nameToUse.length; i++) {
    hash = nameToUse.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const h1 = Math.abs(hash) % 360;
  const s1 = 60 + (Math.abs(hash >> 8) % 30);
  const l1 = 30 + (Math.abs(hash >> 16) % 25);
  
  const h2 = (h1 + 180 + (Math.abs(hash >> 4) % 60) - 30) % 360; 
  
  const color1 = `hsl(${h1}, ${s1}%, ${l1}%)`;
  const color2 = `hsl(${h2}, ${s1}%, ${l1 + 15}%)`;
  
  const patternType = Math.abs(hash) % 5;
  const bg = patternType === 0 ? color1 
           : patternType === 1 ? `linear-gradient(135deg, ${color1} 0%, ${color1} 50%, ${color2} 50%, ${color2} 100%)`
           : patternType === 2 ? `linear-gradient(45deg, ${color1} 0%, ${color1} 50%, ${color2} 50%, ${color2} 100%)`
           : patternType === 3 ? `linear-gradient(180deg, ${color1} 0%, ${color1} 50%, ${color2} 50%, ${color2} 100%)`
           : `linear-gradient(90deg, ${color1} 0%, ${color1} 50%, ${color2} 50%, ${color2} 100%)`;

  return (
    <div 
      className={`overflow-hidden rounded-full shadow-sm text-white flex items-center justify-center font-bold text-xs tracking-tighter ${className}`} 
      style={{ background: bg, boxSizing: 'border-box', border: '2px solid rgba(255,255,255,0.2)' }}
    >
      <span style={{ textShadow: '0px 1px 3px rgba(0,0,0,0.8)' }}>{abbr}</span>
    </div>
  );
}
