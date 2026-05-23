import { useState, useRef } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import { X, Download, Upload, Trash2, Award, Sparkles, Shield, Layers } from 'lucide-react'
import { playUiClick, playUiPowerOn, playUiSlideOpen } from '../utils/pokedexVoice.ts'
import type { CollectionEntry, FavoriteEntry } from '../hooks/useCollection.ts'
import { formatPokemonNumber } from '../utils/formatPokemonNumber.ts'

interface TrainerProfileModalProps {
  isOpen: boolean
  onClose: () => void
  collection: CollectionEntry[]
  favorites: FavoriteEntry[]
  unlockedAchievements: string[]
  onSelectPokemon: (apiName: string) => void
  onUpdateCollection: (pokemonId: number, action: 'seen' | 'captured' | 'release') => void
  onImportProfile: (importedData: any) => void
  prefersReducedMotion: boolean
  trainerLevel: number
  trainerXP: number
}

interface RetroQRCardProps {
  level: number
  seen: number
  captured: number
  streak: number
  name: string
}

function RetroQRCard({ level, seen, captured, streak, name }: RetroQRCardProps) {
  const size = 19
  const grid = Array(size).fill(null).map(() => Array(size).fill(false))

  const drawFinder = (x: number, y: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isBorder = r === 0 || r === 6 || c === 0 || c === 6
        const isCenter = r >= 2 && r <= 4 && c >= 2 && c <= 4
        if (x + r < size && y + c < size) {
          grid[x + r][y + c] = isBorder || isCenter
        }
      }
    }
  }

  drawFinder(0, 0)
  drawFinder(0, size - 7)
  drawFinder(size - 7, 0)

  const dataString = `pdx-v15:${name}:${level}:${seen}:${captured}:${streak}`
  let hash = 0
  for (let i = 0; i < dataString.length; i++) {
    hash = (hash << 5) - hash + dataString.charCodeAt(i)
    hash |= 0
  }

  const lcg = (seed: number) => {
    let s = seed
    return () => {
      s = (s * 1664525 + 1013904223) % 4294967296
      return s / 4294967296
    }
  }
  const random = lcg(Math.abs(hash))

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const isTopLeft = r < 8 && c < 8
      const isTopRight = r < 8 && c >= size - 8
      const isBottomLeft = r >= size - 8 && c < 8
      if (!isTopLeft && !isTopRight && !isBottomLeft) {
        grid[r][c] = random() > 0.5
      }
    }
  }

  return (
    <div className="retro-qr-wrapper" title={`Tarjeta QR de Entrenador: ${dataString}`}>
      <div 
        className="retro-qr-grid" 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: `repeat(${size}, 1fr)`, 
          gap: '1px', 
          background: '#fff', 
          padding: '5px', 
          borderRadius: '12px', 
          border: '3px solid #fbbf24', 
          width: '84px', 
          height: '84px', 
          imageRendering: 'pixelated',
          boxShadow: '0 4px 10px rgba(0, 0, 0, 0.3)'
        }}
      >
        {grid.flatMap((row, r) =>
          row.map((cell, c) => (
            <div
              key={`${r}-${c}`}
              style={{
                backgroundColor: cell ? '#1e293b' : 'transparent',
                aspectRatio: '1',
              }}
            />
          ))
        )}
      </div>
    </div>
  )
}

export function TrainerProfileModal({
  isOpen,
  onClose,
  collection = [],
  favorites = [],
  unlockedAchievements = [],
  onSelectPokemon,
  onUpdateCollection,
  onImportProfile,
  prefersReducedMotion,
  trainerLevel = 1,
  trainerXP = 0,
}: TrainerProfileModalProps) {
  const [trainerName, setTrainerName] = useState(() => {
    try {
      return localStorage.getItem('pokedex-visual-gen1:trainer-name') || 'Entrenador Jovan'
    } catch {
      return 'Entrenador Jovan'
    }
  })

  const [bestStreak] = useState(() => {
    try {
      return Number(localStorage.getItem('pokedex-visual-gen1:best-quiz-streak')) || 0
    } catch {
      return 0
    }
  })

  const [activeBadgeInfo, setActiveBadgeInfo] = useState<string | null>(null)
  const [showQr, setShowQr] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value
    setTrainerName(name)
    try {
      localStorage.setItem('pokedex-visual-gen1:trainer-name', name)
    } catch {}
  }

  // Get captured Pokemon list from collection (where capturedAt is defined and not empty)
  const capturedList = collection.filter((item) => item.capturedAt && item.capturedAt !== '')

  // Count elements
  const capturedCount = capturedList.length
  const seenCount = collection.length
  const achievementsCount = unlockedAchievements.length

  const handleExport = () => {
    playUiClick()
    try {
      const backupData = {
        trainerName,
        collection,
        favorites,
        achievements: unlockedAchievements,
        stickersEnabled: localStorage.getItem('pokedex-visual-gen1:stickers-enabled') !== 'false',
        wearTearEnabled: localStorage.getItem('pokedex-visual-gen1:wear-tear-enabled') === 'true',
        pokedexVolume: localStorage.getItem('pokedex-visual-gen1:volume') || '80',
        consoleSkin: localStorage.getItem('pokedex-visual-gen1:console-skin') || 'red',
        crtMode: localStorage.getItem('pokedex-visual-gen1:crt-mode') || 'active',
        version: 'v13',
        exportedAt: new Date().toISOString(),
      }

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `pokedex_perfil_${trainerName.toLowerCase().replace(/\s+/g, '_')}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      alert('Error al exportar el perfil.')
    }
  }

  const handleImportClick = () => {
    playUiClick()
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string)
        if (!data || typeof data !== 'object') {
          throw new Error('Formato JSON no válido')
        }

        // Validate basic properties
        const trainer = data.trainerName || 'Entrenador Importado'
        setTrainerName(trainer)

        onImportProfile(data)
        playUiPowerOn()
        alert(`¡Perfil de ${trainer} importado con éxito!`)
      } catch {
        alert('Error al importar: El archivo JSON está corrupto o no es compatible.')
      }
    }
    reader.readAsText(file)
    // Clear input
    e.target.value = ''
  }

  // Animation settings
  const modalVariants = prefersReducedMotion
    ? {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.15 } },
        exit: { opacity: 0, transition: { duration: 0.1 } },
      }
    : {
        hidden: { opacity: 0, scale: 0.95 },
        visible: { opacity: 1, scale: 1, transition: { type: 'spring' as const, duration: 0.4, bounce: 0.15 } },
        exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } },
      }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="trainer-profile-modal">
          <m.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="trainer-card-container"
            role="dialog"
            aria-modal="true"
            aria-labelledby="trainer-modal-title"
          >
            <div className="trainer-card-header">
              <h2 id="trainer-modal-title">Ficha de Entrenador</h2>
              <button
                onClick={() => { playUiClick(); onClose(); }}
                className="hover:opacity-80 transition-opacity text-white outline-none"
                aria-label="Cerrar modal"
              >
                <X className="size-6" />
              </button>
            </div>

            <div className="trainer-card-body">
              {/* Trainer Info Card */}
              <div className="trainer-info-panel">
                <div 
                  className="trainer-avatar-wrapper cursor-pointer flex flex-col items-center"
                  onClick={() => { playUiClick(); setShowQr(!showQr); }}
                  title="Toca para alternar entre Ficha QR y Foto de perfil"
                  style={{ width: '84px' }}
                >
                  <div className="relative size-[84px]" style={{ perspective: '1000px' }}>
                    <AnimatePresence mode="wait">
                      {!showQr ? (
                        <m.div
                          key="avatar"
                          initial={{ rotateY: -90, opacity: 0 }}
                          animate={{ rotateY: 0, opacity: 1 }}
                          exit={{ rotateY: 90, opacity: 0 }}
                          transition={{ duration: 0.22 }}
                          className="trainer-avatar"
                          aria-label="Foto de perfil del Entrenador. Toca para ver Ficha QR."
                          style={{ backfaceVisibility: 'hidden', position: 'absolute', inset: 0 }}
                        >
                          🎓
                        </m.div>
                      ) : (
                        <m.div
                          key="qr"
                          initial={{ rotateY: 90, opacity: 0 }}
                          animate={{ rotateY: 0, opacity: 1 }}
                          exit={{ rotateY: -90, opacity: 0 }}
                          transition={{ duration: 0.22 }}
                          style={{ backfaceVisibility: 'hidden', position: 'absolute', inset: 0 }}
                        >
                          <RetroQRCard 
                            level={trainerLevel} 
                            seen={seenCount} 
                            captured={capturedCount} 
                            streak={bestStreak} 
                            name={trainerName} 
                          />
                        </m.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <span className="text-[8px] font-bold text-slate-400 select-none uppercase tracking-wider block mt-1.5 whitespace-nowrap">
                    {!showQr ? "VER QR" : "VER FOTO"}
                  </span>
                </div>
                <div className="trainer-details">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <label htmlFor="trainer-name-input" className="sr-only">Nombre del Entrenador</label>
                    <input
                      id="trainer-name-input"
                      type="text"
                      value={trainerName}
                      onChange={handleNameChange}
                      className="trainer-name-input"
                      placeholder="Tu nombre de entrenador"
                      maxLength={16}
                    />
                    <div className="trainer-level-badge" title={`Nivel de Entrenador: ${trainerLevel}`}>
                      LV {trainerLevel}
                    </div>
                  </div>
                  <div className="trainer-stats-row flex-wrap gap-y-1.5">
                    <span className="trainer-stat-pill" title="Pokémon Vistos">
                      <Sparkles className="size-3" /> Vistos: {seenCount}
                    </span>
                    <span className="trainer-stat-pill" title="Pokémon Capturados">
                      <Shield className="size-3" /> Capturados: {capturedCount}
                    </span>
                    <span className="trainer-stat-pill" title="Logros Obtenidos">
                      <Award className="size-3" /> Logros: {achievementsCount}
                    </span>
                    {bestStreak > 0 && (
                      <span className="trainer-stat-pill border-amber-500/30 text-amber-400" title={`Racha máxima de Quiz: ${bestStreak} aciertos`}>
                        🔥 Racha: {bestStreak}
                      </span>
                    )}
                  </div>
                  {/* XP progress bar (v14) */}
                  {(() => {
                    const nextLevelXp = trainerLevel * 200
                    const xpPercent = Math.min(100, Math.max(0, (trainerXP / nextLevelXp) * 100))
                    return (
                      <div className="trainer-xp-container">
                        <div className="trainer-xp-header">
                          <span>Experiencia</span>
                          <span className="trainer-xp-text">{trainerXP} / {nextLevelXp} XP</span>
                        </div>
                        <div className="trainer-xp-bar" title={`${xpPercent.toFixed(1)}% de progreso`}>
                          <div 
                            className="trainer-xp-fill" 
                            style={{ width: `${xpPercent}%` }} 
                          />
                        </div>
                      </div>
                    )
                  })()}
                </div>
              </div>

              {/* Medals & Achievements */}
              <div className="trainer-badges-section">
                <h3 className="pc-box-section-title">
                  <Award className="size-4" /> Medallas del Campeón
                </h3>
                 <div className="trainer-badges-grid">
                  <div 
                    onClick={() => {
                      playUiClick()
                      const unlocked = unlockedAchievements.includes('Amante de la IA')
                      setActiveBadgeInfo(unlocked 
                        ? "🎓 ¡Medalla Amante IA! Escaneaste y conversaste con la Inteligencia Artificial del Profesor." 
                        : "🎓 Bloqueada. Requisito: Escanea y conversa con tu primer Pokémon usando el Asistente IA."
                      )
                    }}
                    className={`trainer-badge-card ${unlockedAchievements.includes('Amante de la IA') ? 'badge-unlocked' : ''} cursor-pointer`}
                    title="Detalles de logro"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.click()}
                  >
                    <span className="trainer-badge-card-emoji">🎓</span>
                    <span className="trainer-badge-card-name">Amante IA</span>
                  </div>
                  <div 
                    onClick={() => {
                      playUiClick()
                      const unlocked = unlockedAchievements.includes('Entrenador de Fuego')
                      setActiveBadgeInfo(unlocked 
                        ? "🔥 ¡Medalla Ígnea! Has capturado al menos un Pokémon de elemento Fuego." 
                        : "🔥 Bloqueada. Requisito: Captura al menos un Pokémon de elemento Fuego."
                      )
                    }}
                    className={`trainer-badge-card ${unlockedAchievements.includes('Entrenador de Fuego') ? 'badge-unlocked' : ''} cursor-pointer`}
                    title="Detalles de logro"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.click()}
                  >
                    <span className="trainer-badge-card-emoji">🔥</span>
                    <span className="trainer-badge-card-name">Fuego</span>
                  </div>
                  <div 
                    onClick={() => {
                      playUiClick()
                      const unlocked = unlockedAchievements.includes('Cazador Legendario')
                      setActiveBadgeInfo(unlocked 
                        ? "✨ ¡Medalla Leyenda! Has avistado o capturado a tu primer Pokémon Legendario o Mítico." 
                        : "✨ Bloqueada. Requisito: Escanea o captura tu primer Pokémon Legendario o Mítico."
                      )
                    }}
                    className={`trainer-badge-card ${unlockedAchievements.includes('Cazador Legendario') ? 'badge-unlocked' : ''} cursor-pointer`}
                    title="Detalles de logro"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.click()}
                  >
                    <span className="trainer-badge-card-emoji">✨</span>
                    <span className="trainer-badge-card-name">Mítico</span>
                  </div>
                </div>
                {activeBadgeInfo && (
                  <div className="mt-3 text-[10px] bg-slate-950/60 border border-slate-800 p-2 rounded text-slate-300 font-mono shadow-inner leading-relaxed animate-fade-in text-center select-none uppercase tracking-wide">
                    {activeBadgeInfo}
                  </div>
                )}
              </div>

              {/* PC Box Grid */}
              <h3 className="pc-box-section-title">
                <Layers className="size-4" /> Caja de PC Local ({capturedCount})
              </h3>
              <div className="pc-box-grid">
                {capturedList.length > 0 ? (
                  capturedList.map((pkmn) => (
                    <div
                      key={pkmn.id}
                      onClick={() => {
                        playUiSlideOpen()
                        onSelectPokemon(pkmn.apiName)
                        onClose()
                      }}
                      className="pc-box-item"
                      title={`Ver detalles de ${pkmn.name}`}
                    >
                      <span className="pc-box-item-number">{formatPokemonNumber(pkmn.id)}</span>
                      <img src={pkmn.sprite} alt={pkmn.name} className="pc-box-sprite" />
                      <span className="pc-box-item-name">{pkmn.name}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          playUiClick()
                          onUpdateCollection(pkmn.id, 'release')
                        }}
                        className="pc-box-release-btn"
                        title="Liberar Pokémon"
                        aria-label={`Liberar a ${pkmn.name}`}
                      >
                        <Trash2 className="size-2.5" />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="pc-box-empty">
                    <span>🔴 Caja de PC Vacía</span>
                    <span className="text-[10px] text-slate-500 normal-case">Captura Pokémon en la ficha principal para llenar tu PC.</span>
                  </div>
                )}
              </div>

              {/* Backup Actions */}
              <div className="backup-actions-panel">
                <button onClick={handleExport} className="backup-btn" title="Exportar perfil como archivo JSON">
                  <Download className="size-4" /> Exportar Perfil
                </button>
                <button onClick={handleImportClick} className="backup-btn backup-btn-import" title="Importar perfil desde archivo JSON">
                  <Upload className="size-4" /> Importar Perfil
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".json"
                  className="hidden"
                  aria-hidden="true"
                />
              </div>
            </div>
          </m.div>
        </div>
      )}
    </AnimatePresence>
  )
}
