// Logos SVG dos times brasileiros
export const teamLogos: Record<number, React.ReactNode> = {
  1: ( // Botafogo - Preto e Branco
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <circle cx="50" cy="50" r="45" fill="black" />
      <circle cx="50" cy="50" r="40" fill="white" />
      <circle cx="50" cy="50" r="35" fill="black" />
      <text x="50" y="60" textAnchor="middle" fill="white" fontSize="24" fontWeight="bold">B</text>
    </svg>
  ),
  2: ( // Palmeiras - Verde
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <circle cx="50" cy="50" r="45" fill="#1a7c3a" />
      <circle cx="50" cy="50" r="40" fill="white" />
      <text x="50" y="60" textAnchor="middle" fill="#1a7c3a" fontSize="24" fontWeight="bold">P</text>
    </svg>
  ),
  3: ( // Flamengo - Vermelho e Preto
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <rect width="100" height="100" fill="#c41e3a" />
      <polygon points="50,10 90,90 10,90" fill="black" />
      <text x="50" y="65" textAnchor="middle" fill="white" fontSize="20" fontWeight="bold">FLA</text>
    </svg>
  ),
  4: ( // Grêmio - Azul e Branco
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <circle cx="50" cy="50" r="45" fill="#003d82" />
      <circle cx="50" cy="50" r="40" fill="white" />
      <circle cx="50" cy="50" r="30" fill="#003d82" />
      <text x="50" y="60" textAnchor="middle" fill="white" fontSize="24" fontWeight="bold">G</text>
    </svg>
  ),
  5: ( // Corinthians - Branco e Preto
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <rect width="100" height="100" fill="white" stroke="black" strokeWidth="2" />
      <line x1="50" y1="0" x2="50" y2="100" stroke="black" strokeWidth="3" />
      <text x="50" y="60" textAnchor="middle" fill="black" fontSize="24" fontWeight="bold">C</text>
    </svg>
  ),
  6: ( // Fortaleza - Azul e Vermelho
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <rect width="50" height="100" fill="#003d82" />
      <rect x="50" width="50" height="100" fill="#c41e3a" />
      <text x="50" y="60" textAnchor="middle" fill="white" fontSize="20" fontWeight="bold">FOR</text>
    </svg>
  ),
  7: ( // Internacional - Vermelho
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <circle cx="50" cy="50" r="45" fill="#c41e3a" />
      <circle cx="50" cy="50" r="40" fill="white" />
      <circle cx="50" cy="50" r="35" fill="#c41e3a" />
      <text x="50" y="60" textAnchor="middle" fill="white" fontSize="24" fontWeight="bold">I</text>
    </svg>
  ),
  8: ( // São Paulo - Vermelho, Branco e Preto
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <rect width="100" height="100" fill="white" />
      <polygon points="0,0 100,0 100,50 0,50" fill="#c41e3a" />
      <polygon points="0,50 100,50 100,100 0,100" fill="black" />
      <text x="50" y="60" textAnchor="middle" fill="white" fontSize="20" fontWeight="bold">SPA</text>
    </svg>
  ),
  9: ( // Cruzeiro - Azul
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <circle cx="50" cy="50" r="45" fill="#003d82" />
      <circle cx="50" cy="50" r="40" fill="white" />
      <text x="50" y="60" textAnchor="middle" fill="#003d82" fontSize="24" fontWeight="bold">C</text>
    </svg>
  ),
  10: ( // Atlético Mineiro - Preto e Branco
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <rect width="50" height="100" fill="black" />
      <rect x="50" width="50" height="100" fill="white" />
      <text x="50" y="60" textAnchor="middle" fill="black" fontSize="20" fontWeight="bold">CAM</text>
    </svg>
  ),
  11: ( // Vasco da Gama - Branco e Preto
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <circle cx="50" cy="50" r="45" fill="white" stroke="black" strokeWidth="2" />
      <circle cx="50" cy="50" r="40" fill="white" />
      <polygon points="50,20 70,50 50,80 30,50" fill="black" />
      <text x="50" y="65" textAnchor="middle" fill="black" fontSize="18" fontWeight="bold">VAS</text>
    </svg>
  ),
  12: ( // Fluminense - Verde, Branco e Vermelho
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <rect width="100" height="33.33" fill="#1a7c3a" />
      <rect y="33.33" width="100" height="33.34" fill="white" />
      <rect y="66.67" width="100" height="33.33" fill="#c41e3a" />
      <text x="50" y="60" textAnchor="middle" fill="black" fontSize="20" fontWeight="bold">FLU</text>
    </svg>
  ),
  13: ( // Bahia - Azul e Branco
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <circle cx="50" cy="50" r="45" fill="#003d82" />
      <circle cx="50" cy="50" r="40" fill="white" />
      <circle cx="50" cy="50" r="30" fill="#003d82" />
      <text x="50" y="60" textAnchor="middle" fill="white" fontSize="24" fontWeight="bold">B</text>
    </svg>
  ),
  14: ( // Sport Recife - Vermelho e Preto
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <rect width="50" height="100" fill="#c41e3a" />
      <rect x="50" width="50" height="100" fill="black" />
      <text x="50" y="60" textAnchor="middle" fill="white" fontSize="20" fontWeight="bold">SPO</text>
    </svg>
  ),
  15: ( // Red Bull Bragantino - Vermelho e Azul
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <rect width="100" height="100" fill="#c41e3a" />
      <circle cx="50" cy="50" r="30" fill="#003d82" />
      <text x="50" y="60" textAnchor="middle" fill="white" fontSize="18" fontWeight="bold">RBB</text>
    </svg>
  ),
  16: ( // Juventude - Verde e Branco
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <rect width="50" height="100" fill="#1a7c3a" />
      <rect x="50" width="50" height="100" fill="white" stroke="#1a7c3a" strokeWidth="2" />
      <text x="50" y="60" textAnchor="middle" fill="#1a7c3a" fontSize="20" fontWeight="bold">JUV</text>
    </svg>
  ),
  17: ( // Cuiabá - Amarelo e Verde
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <rect width="50" height="100" fill="#FFD700" />
      <rect x="50" width="50" height="100" fill="#1a7c3a" />
      <text x="50" y="60" textAnchor="middle" fill="black" fontSize="20" fontWeight="bold">CUI</text>
    </svg>
  ),
  18: ( // Goiás - Verde e Branco
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <circle cx="50" cy="50" r="45" fill="#1a7c3a" />
      <circle cx="50" cy="50" r="40" fill="white" />
      <text x="50" y="60" textAnchor="middle" fill="#1a7c3a" fontSize="24" fontWeight="bold">G</text>
    </svg>
  ),
  19: ( // Athletico Paranaense - Vermelho
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <circle cx="50" cy="50" r="45" fill="#c41e3a" />
      <circle cx="50" cy="50" r="40" fill="white" />
      <text x="50" y="60" textAnchor="middle" fill="#c41e3a" fontSize="20" fontWeight="bold">APA</text>
    </svg>
  ),
  20: ( // Chapecoense - Verde
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <circle cx="50" cy="50" r="45" fill="#1a7c3a" />
      <circle cx="50" cy="50" r="40" fill="white" />
      <circle cx="50" cy="50" r="30" fill="#1a7c3a" />
      <text x="50" y="60" textAnchor="middle" fill="white" fontSize="20" fontWeight="bold">CHA</text>
    </svg>
  ),
};
