import { useState, useEffect, useRef, useCallback } from 'react';

interface Planet {
  name: string;
  namePT: string;
  color: string;
  radius: number; // visual radius in pixels
  orbitRadius: number; // visual orbit radius in pixels
  orbitalPeriod: number; // in Earth days
  distanceAU: number; // actual distance in AU
  angle: number; // current angle in radians
  referenceDate: Date; // reference date for angle calculation
}

const PLANETS_DATA: Omit<Planet, 'angle' | 'referenceDate'>[] = [
  { name: 'Mercury', namePT: 'Mercúrio', color: '#b5b5b5', radius: 4, orbitRadius: 60, orbitalPeriod: 88, distanceAU: 0.39 },
  { name: 'Venus', namePT: 'Vênus', color: '#e8cda0', radius: 6, orbitRadius: 90, orbitalPeriod: 225, distanceAU: 0.72 },
  { name: 'Earth', namePT: 'Terra', color: '#4da6ff', radius: 7, orbitRadius: 125, orbitalPeriod: 365.25, distanceAU: 1.0 },
  { name: 'Mars', namePT: 'Marte', color: '#e85d3a', radius: 5, orbitRadius: 165, orbitalPeriod: 687, distanceAU: 1.52 },
  { name: 'Jupiter', namePT: 'Júpiter', color: '#d4a574', radius: 16, orbitRadius: 220, orbitalPeriod: 4333, distanceAU: 5.2 },
  { name: 'Saturn', namePT: 'Saturno', color: '#f4d59c', radius: 14, orbitRadius: 280, orbitalPeriod: 10759, distanceAU: 9.54 },
  { name: 'Uranus', namePT: 'Urano', color: '#7de8e8', radius: 10, orbitRadius: 340, orbitalPeriod: 30687, distanceAU: 19.2 },
  { name: 'Neptune', namePT: 'Netuno', color: '#4169e1', radius: 10, orbitRadius: 390, orbitalPeriod: 60190, distanceAU: 30.06 },
];

// Reference epoch: J2000.0 (January 1, 2000, 12:00 TT)
const J2000 = new Date('2000-01-01T12:00:00Z');

function calculatePlanetAngle(orbitalPeriod: number, currentDate: Date, initialAngle: number = 0): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysSinceJ2000 = (currentDate.getTime() - J2000.getTime()) / msPerDay;
  const angularVelocity = (2 * Math.PI) / orbitalPeriod;
  return initialAngle + angularVelocity * daysSinceJ2000;
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const [selectedPlanet, setSelectedPlanet] = useState<string | null>(null);
  const [showOrbits, setShowOrbits] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [zoom, setZoom] = useState(1);
  const lastTimeRef = useRef<number>(Date.now());

  const planetsRef = useRef<Planet[]>(
    PLANETS_DATA.map((p, i) => ({
      ...p,
      angle: (i * Math.PI * 2) / 8, // evenly distributed initial angles
      referenceDate: J2000,
    }))
  );

  const drawSolarSystem = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;

    // Clear canvas with dark background
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, width, height);

    // Draw stars background
    drawStars(ctx, width, height);

    // Update planet angles based on current date
    planetsRef.current = planetsRef.current.map((planet, i) => ({
      ...planet,
      angle: calculatePlanetAngle(planet.orbitalPeriod, currentDate, (i * Math.PI * 2) / 8),
    }));

    // Draw orbit paths
    if (showOrbits) {
      planetsRef.current.forEach((planet) => {
        ctx.beginPath();
        ctx.arc(centerX, centerY, planet.orbitRadius * zoom, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        ctx.stroke();
      });
    }

    // Draw Sun
    drawSun(ctx, centerX, centerY);

    // Draw planets
    planetsRef.current.forEach((planet) => {
      const x = centerX + Math.cos(planet.angle) * planet.orbitRadius * zoom;
      const y = centerY + Math.sin(planet.angle) * planet.orbitRadius * zoom;

      // Draw planet glow
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, planet.radius * zoom * 2);
      gradient.addColorStop(0, planet.color + '80');
      gradient.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.arc(x, y, planet.radius * zoom * 2, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Draw planet body
      ctx.beginPath();
      ctx.arc(x, y, planet.radius * zoom, 0, Math.PI * 2);
      ctx.fillStyle = planet.color;
      ctx.fill();

      // Draw Saturn's rings
      if (planet.name === 'Saturn') {
        ctx.beginPath();
        ctx.ellipse(x, y, planet.radius * zoom * 2.2, planet.radius * zoom * 0.5, 0.3, 0, Math.PI * 2);
        ctx.strokeStyle = planet.color + 'aa';
        ctx.lineWidth = 2 * zoom;
        ctx.stroke();
      }

      // Draw labels
      if (showLabels) {
        ctx.font = `${Math.max(10, 12 * zoom)}px sans-serif`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.textAlign = 'center';
        ctx.fillText(planet.namePT, x, y - planet.radius * zoom - 8);
      }

      // Highlight selected planet
      if (selectedPlanet === planet.name) {
        ctx.beginPath();
        ctx.arc(x, y, planet.radius * zoom + 5, 0, Math.PI * 2);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    });
  }, [currentDate, showOrbits, showLabels, selectedPlanet, zoom]);

  function drawStars(ctx: CanvasRenderingContext2D, width: number, height: number) {
    // Use a seeded random for consistent stars
    const starCount = 200;
    for (let i = 0; i < starCount; i++) {
      const x = (Math.sin(i * 127.1 + 311.7) * 43758.5453) % 1 * width;
      const y = (Math.sin(i * 269.5 + 183.3) * 43758.5453) % 1 * height;
      const absX = Math.abs(x);
      const absY = Math.abs(y);
      const size = Math.abs(Math.sin(i * 43.1) * 1.5);
      ctx.beginPath();
      ctx.arc(absX, absY, size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + Math.abs(Math.sin(i * 17.3)) * 0.7})`;
      ctx.fill();
    }
  }

  function drawSun(ctx: CanvasRenderingContext2D, x: number, y: number) {
    // Sun glow
    const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, 45 * zoom);
    glowGradient.addColorStop(0, '#ffdd00');
    glowGradient.addColorStop(0.3, '#ffaa00');
    glowGradient.addColorStop(0.7, '#ff660044');
    glowGradient.addColorStop(1, 'transparent');
    ctx.beginPath();
    ctx.arc(x, y, 45 * zoom, 0, Math.PI * 2);
    ctx.fillStyle = glowGradient;
    ctx.fill();

    // Sun body
    const sunGradient = ctx.createRadialGradient(x, y, 0, x, y, 25 * zoom);
    sunGradient.addColorStop(0, '#ffffff');
    sunGradient.addColorStop(0.3, '#ffee00');
    sunGradient.addColorStop(0.7, '#ffaa00');
    sunGradient.addColorStop(1, '#ff6600');
    ctx.beginPath();
    ctx.arc(x, y, 25 * zoom, 0, Math.PI * 2);
    ctx.fillStyle = sunGradient;
    ctx.fill();
  }

  // Animation loop
  useEffect(() => {
    if (isPlaying) {
      const animate = () => {
        const now = Date.now();
        const delta = now - lastTimeRef.current;
        lastTimeRef.current = now;

        // Advance time based on speed multiplier
        // 1x = 1 real second = 1 day in simulation
        const daysToAdd = (delta / 1000) * speedMultiplier;
        const msToAdd = daysToAdd * 24 * 60 * 60 * 1000;
        setCurrentDate(prev => new Date(prev.getTime() + msToAdd));

        animationRef.current = requestAnimationFrame(animate);
      };
      lastTimeRef.current = Date.now();
      animationRef.current = requestAnimationFrame(animate);
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, speedMultiplier]);

  // Render loop
  useEffect(() => {
    drawSolarSystem();
  }, [drawSolarSystem]);

  // Handle canvas resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const container = canvas.parentElement;
      if (!container) return;
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      drawSolarSystem();
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawSolarSystem]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentDate(new Date(e.target.value));
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const timeParts = e.target.value.split(':');
    const newDate = new Date(currentDate);
    newDate.setHours(parseInt(timeParts[0]) || 0);
    newDate.setMinutes(parseInt(timeParts[1]) || 0);
    setCurrentDate(newDate);
  };

  const goToNow = () => {
    setCurrentDate(new Date());
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getDateInputValue = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getTimeInputValue = (date: Date) => {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const selectedPlanetData = planetsRef.current.find(p => p.name === selectedPlanet);

  return (
    <div className="w-full h-screen bg-[#0a0a1a] flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-[#111133]/80 backdrop-blur-sm border-b border-white/10 px-4 py-3 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <span className="text-2xl">☀️</span>
          <h1 className="text-white text-lg font-bold tracking-wide">Sistema Solar Interativo</h1>
        </div>
        <div className="text-white/70 text-sm hidden md:block">
          {formatDate(currentDate)} • {formatTime(currentDate)}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Controls */}
        <aside className="w-72 bg-[#111133]/60 backdrop-blur-sm border-r border-white/10 p-4 overflow-y-auto flex flex-col gap-4 z-10">
          {/* Date/Time Controls */}
          <div className="space-y-3">
            <h2 className="text-white font-semibold text-sm uppercase tracking-wider flex items-center gap-2">
              <span>📅</span> Data e Hora
            </h2>
            
            <div>
              <label className="text-white/60 text-xs block mb-1">Data</label>
              <input
                type="date"
                value={getDateInputValue(currentDate)}
                onChange={handleDateChange}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-400 transition-colors"
              />
            </div>

            <div>
              <label className="text-white/60 text-xs block mb-1">Hora</label>
              <input
                type="time"
                value={getTimeInputValue(currentDate)}
                onChange={handleTimeChange}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-400 transition-colors"
              />
            </div>

            <button
              onClick={goToNow}
              className="w-full bg-blue-600/80 hover:bg-blue-600 text-white rounded-lg px-3 py-2 text-sm font-medium transition-colors"
            >
              🕐 Ir para Agora
            </button>
          </div>

          {/* Playback Controls */}
          <div className="space-y-3">
            <h2 className="text-white font-semibold text-sm uppercase tracking-wider flex items-center gap-2">
              <span>▶️</span> Animação
            </h2>

            <div className="flex gap-2">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isPlaying
                    ? 'bg-red-600/80 hover:bg-red-600 text-white'
                    : 'bg-green-600/80 hover:bg-green-600 text-white'
                }`}
              >
                {isPlaying ? '⏸ Pausar' : '▶ Iniciar'}
              </button>
              <button
                onClick={() => setCurrentDate(new Date())}
                className="bg-white/10 hover:bg-white/20 text-white rounded-lg px-3 py-2 text-sm transition-colors"
                title="Resetar"
              >
                🔄
              </button>
            </div>

            <div>
              <label className="text-white/60 text-xs block mb-1">
                Velocidade: {speedMultiplier}x
                {speedMultiplier === 1 && ' (1 seg = 1 dia)'}
                {speedMultiplier === 7 && ' (1 seg = 1 semana)'}
                {speedMultiplier === 30 && ' (1 seg = 1 mês)'}
                {speedMultiplier === 365 && ' (1 seg = 1 ano)'}
              </label>
              <input
                type="range"
                min="0.1"
                max="365"
                step="0.1"
                value={speedMultiplier}
                onChange={(e) => setSpeedMultiplier(parseFloat(e.target.value))}
                className="w-full accent-blue-500"
              />
              <div className="flex justify-between text-white/40 text-xs mt-1">
                <span>0.1x</span>
                <span>365x</span>
              </div>
            </div>

            {/* Quick speed buttons */}
            <div className="flex flex-wrap gap-1">
              {[0.1, 1, 7, 30, 365].map(speed => (
                <button
                  key={speed}
                  onClick={() => setSpeedMultiplier(speed)}
                  className={`px-2 py-1 rounded text-xs transition-colors ${
                    speedMultiplier === speed
                      ? 'bg-blue-600 text-white'
                      : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>

          {/* Display Options */}
          <div className="space-y-3">
            <h2 className="text-white font-semibold text-sm uppercase tracking-wider flex items-center gap-2">
              <span>⚙️</span> Opções
            </h2>

            <label className="flex items-center gap-2 text-white/80 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={showOrbits}
                onChange={(e) => setShowOrbits(e.target.checked)}
                className="accent-blue-500"
              />
              Mostrar órbitas
            </label>

            <label className="flex items-center gap-2 text-white/80 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={showLabels}
                onChange={(e) => setShowLabels(e.target.checked)}
                className="accent-blue-500"
              />
              Mostrar nomes
            </label>

            <div>
              <label className="text-white/60 text-xs block mb-1">Zoom: {zoom.toFixed(1)}x</label>
              <input
                type="range"
                min="0.3"
                max="2"
                step="0.1"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-full accent-blue-500"
              />
            </div>
          </div>

          {/* Planet List */}
          <div className="space-y-3">
            <h2 className="text-white font-semibold text-sm uppercase tracking-wider flex items-center gap-2">
              <span>🪐</span> Planetas
            </h2>
            <div className="space-y-1">
              {planetsRef.current.map((planet) => (
                <button
                  key={planet.name}
                  onClick={() => setSelectedPlanet(selectedPlanet === planet.name ? null : planet.name)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                    selectedPlanet === planet.name
                      ? 'bg-white/20 text-white'
                      : 'bg-white/5 text-white/70 hover:bg-white/10'
                  }`}
                >
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: planet.color }}
                  />
                  <span>{planet.namePT}</span>
                  <span className="ml-auto text-xs text-white/40">{planet.distanceAU} AU</span>
                </button>
              ))}
            </div>
          </div>

          {/* Selected Planet Info */}
          {selectedPlanetData && (
            <div className="space-y-2 bg-white/5 rounded-lg p-3 border border-white/10">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <span
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: selectedPlanetData.color }}
                />
                {selectedPlanetData.namePT}
              </h3>
              <div className="text-white/60 text-xs space-y-1">
                <p>Distância do Sol: {selectedPlanetData.distanceAU} UA</p>
                <p>Período orbital: {selectedPlanetData.orbitalPeriod} dias</p>
                <p>
                  Período orbital: {(selectedPlanetData.orbitalPeriod / 365.25).toFixed(2)} anos
                </p>
                <p>
                  Ângulo atual: {((selectedPlanetData.angle % (2 * Math.PI)) * (180 / Math.PI)).toFixed(1)}°
                </p>
              </div>
            </div>
          )}
        </aside>

        {/* Canvas Area */}
        <main className="flex-1 relative">
          <canvas
            ref={canvasRef}
            className="w-full h-full cursor-crosshair"
            onClick={(e) => {
              const canvas = canvasRef.current;
              if (!canvas) return;
              const rect = canvas.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const y = e.clientY - rect.top;
              const centerX = canvas.width / 2;
              const centerY = canvas.height / 2;

              // Check if click is near a planet
              let clicked = false;
              planetsRef.current.forEach((planet) => {
                const px = centerX + Math.cos(planet.angle) * planet.orbitRadius * zoom;
                const py = centerY + Math.sin(planet.angle) * planet.orbitRadius * zoom;
                const dist = Math.sqrt((x - px) ** 2 + (y - py) ** 2);
                if (dist < planet.radius * zoom + 10) {
                  setSelectedPlanet(planet.name);
                  clicked = true;
                }
              });
              if (!clicked) {
                setSelectedPlanet(null);
              }
            }}
          />

          {/* Mobile date display */}
          <div className="absolute top-3 left-3 md:hidden bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2 text-white text-sm">
            <div>{formatDate(currentDate)}</div>
            <div className="text-white/60 text-xs">{formatTime(currentDate)}</div>
          </div>

          {/* Info overlay */}
          <div className="absolute bottom-3 right-3 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2 text-white/50 text-xs">
            <p>Clique em um planeta para ver detalhes</p>
            <p>Use os controles para ajustar data/hora</p>
          </div>
        </main>
      </div>
    </div>
  );
}
