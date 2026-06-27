import { useEffect, useState } from 'react';
import type { MatchEvent } from '@/lib/matchEngine';
import type { Team } from '@/lib/teams';
import { ArrowRight, ArrowLeft } from 'lucide-react';

interface Pitch2DProps {
  homeTeam: Team;
  awayTeam: Team;
  lastEvent: MatchEvent | null;
  isPlaying: boolean;
}

export function Pitch2D({ homeTeam, awayTeam, lastEvent, isPlaying }: Pitch2DProps) {
  const isHomeAttacking = lastEvent?.team === 'home';
  const isAwayAttacking = lastEvent?.team === 'away';

  return (
    <div className="relative w-full aspect-[2/1] rounded-xl border-2 border-[#1a4a1a] overflow-hidden bg-[#2d6a2d]">
      {/* Stripes (pitch mowing pattern) */}
      <div className="absolute inset-0 flex">
        {Array(10).fill(0).map((_, i) => (
          <div key={i} className={`flex-1 ${i % 2 === 0 ? 'bg-white/5' : 'bg-transparent'}`} />
        ))}
      </div>

      {/* Field Lines */}
      <div className="absolute inset-y-0 left-1/2 w-px bg-white/40"/>
      <div className="absolute top-1/2 left-1/2 w-16 h-16 border border-white/40 rounded-full -translate-x-1/2 -translate-y-1/2"/>
      <div className="absolute top-1/4 left-0 h-1/2 w-12 border border-white/40"/>
      <div className="absolute top-[35%] left-0 h-[30%] w-4 border border-white/40"/>
      <div className="absolute top-1/2 left-12 w-4 h-4 border border-white/40 rounded-full -translate-x-1/2 -translate-y-1/2"/>
      
      <div className="absolute top-1/4 right-0 h-1/2 w-12 border border-white/40"/>
      <div className="absolute top-[35%] right-0 h-[30%] w-4 border border-white/40"/>
      <div className="absolute top-1/2 right-12 w-4 h-4 border border-white/40 rounded-full translate-x-1/2 -translate-y-1/2"/>

      {/* Goal Areas (out of bounds slightly) */}
      <div className="absolute top-[35%] -left-1 h-[30%] w-1 bg-white/80"/>
      <div className="absolute top-[35%] -right-1 h-[30%] w-1 bg-white/80"/>

      <div className="absolute bottom-1 left-2 text-xs text-white opacity-60 font-bold">{homeTeam.abbreviation}</div>
      <div className="absolute bottom-1 right-2 text-xs text-white opacity-60 font-bold">{awayTeam.abbreviation}</div>

      {/* Attack Indicators */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-300">
        {isHomeAttacking && (
          <div className="flex flex-col items-center animate-pulse text-white/90">
            <span className="text-xs font-bold mb-1 uppercase tracking-widest text-blue-300 drop-shadow-md">Ataque</span>
            <ArrowRight size={48} className="text-blue-400 drop-shadow-lg" />
          </div>
        )}

        {isAwayAttacking && (
          <div className="flex flex-col items-center animate-pulse text-white/90">
            <span className="text-xs font-bold mb-1 uppercase tracking-widest text-red-300 drop-shadow-md">Ataque</span>
            <ArrowLeft size={48} className="text-red-400 drop-shadow-lg" />
          </div>
        )}

        {!isHomeAttacking && !isAwayAttacking && (
          <div className="w-3 h-3 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)] border border-black/20" />
        )}
      </div>
    </div>
  );
}
