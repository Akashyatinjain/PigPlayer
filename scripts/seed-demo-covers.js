const fs = require("fs");
const path = require("path");

const coversDir = path.join(__dirname, "..", "public", "demo", "covers");
if (!fs.existsSync(coversDir)) {
  fs.mkdirSync(coversDir, { recursive: true });
}

const covers = [
  {
    fileName: "cover-1.svg",
    title: "MIDNIGHT DRIFT",
    artist: "Lumina",
    genre: "SYNTHWAVE",
    bg: "#08090d",
    color1: "#1d4ed8",
    color2: "#3b82f6",
    circleColor: "#60a5fa",
  },
  {
    fileName: "cover-2.svg",
    title: "GOLDEN HOUR",
    artist: "Solstice",
    genre: "AMBIENT CHILL",
    bg: "#0a0c14",
    color1: "#2563eb",
    color2: "#6366f1",
    circleColor: "#93c5fd",
  },
  {
    fileName: "cover-3.svg",
    title: "ECHOES OF SILENCE",
    artist: "Kaelen",
    genre: "NEO-SOUL GROOVE",
    bg: "#060810",
    color1: "#1e40af",
    color2: "#0284c7",
    circleColor: "#38bdf8",
  },
  {
    fileName: "cover-4.svg",
    title: "QUANTUM HORIZONS",
    artist: "Apex Echo",
    genre: "CYBERPUNK",
    bg: "#0b0e18",
    color1: "#1d4ed8",
    color2: "#4f46e5",
    circleColor: "#818cf8",
  },
  {
    fileName: "cover-5.svg",
    title: "VELVET HORIZONS",
    artist: "Maya Chen",
    genre: "DEEP HOUSE",
    bg: "#07090e",
    color1: "#2563eb",
    color2: "#0ea5e9",
    circleColor: "#7dd3fc",
  },
];

for (const c of covers) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
    <defs>
      <linearGradient id="grad_${c.title.replace(/\s+/g, "")}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${c.color1}" />
        <stop offset="100%" stop-color="${c.color2}" />
      </linearGradient>
      <radialGradient id="rad_${c.title.replace(/\s+/g, "")}" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="${c.circleColor}" stop-opacity="0.4" />
        <stop offset="100%" stop-color="${c.circleColor}" stop-opacity="0" />
      </radialGradient>
    </defs>
    
    <rect width="500" height="500" fill="${c.bg}" />
    
    <!-- Vinyl grooves texture -->
    <circle cx="250" cy="250" r="220" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="2" />
    <circle cx="250" cy="250" r="180" fill="none" stroke="rgba(255,255,255,0.07)" stroke-width="1.5" />
    <circle cx="250" cy="250" r="140" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1" />
    <circle cx="250" cy="250" r="100" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="1" />

    <!-- Ambient glow circle in Cobalt -->
    <circle cx="250" cy="250" r="200" fill="url(#rad_${c.title.replace(/\s+/g, "")})" />

    <!-- Cobalt core circle -->
    <circle cx="250" cy="250" r="70" fill="url(#grad_${c.title.replace(/\s+/g, "")})" />
    <circle cx="250" cy="250" r="20" fill="${c.bg}" />
    <circle cx="250" cy="250" r="4" fill="${c.circleColor}" />

    <!-- Sleek typography -->
    <text x="40" y="60" fill="rgba(255,255,255,0.5)" font-family="system-ui, sans-serif" font-size="11" font-weight="700" letter-spacing="3">${c.genre}</text>
    <text x="40" y="420" fill="#ffffff" font-family="system-ui, sans-serif" font-size="24" font-weight="800" letter-spacing="1.5">${c.title}</text>
    <text x="40" y="450" fill="rgba(255,255,255,0.7)" font-family="system-ui, sans-serif" font-size="15" font-weight="500">${c.artist}</text>
    <text x="460" y="60" text-anchor="end" fill="#3b82f6" font-family="monospace" font-size="11" font-weight="700" letter-spacing="1">COBALT HI-FI</text>
  </svg>`;

  fs.writeFileSync(path.join(coversDir, c.fileName), svg);
}

console.log("Cobalt & Obsidian covers regenerated successfully!");
