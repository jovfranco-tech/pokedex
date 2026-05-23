import { useState, useRef, useEffect } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import { X, Download, Upload, Trash2, Award, Sparkles, User, Shield } from 'lucide-react'
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
}: TrainerProfileModalProps) {
  const [trainerName, setTrainerName] = useState(() => {
    try {
      return localStorage.getItem('pokedex-visual-gen1:trainer-name') || 'Entrenador Jovan'
    } catch {
      return 'Entrenador Jovan'
    }
  })

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
    } catch (e) {
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
      } catch (err) {
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
        visible: { opacity: 1, scale: 1, transition: { type: 'spring', duration: 0.4, bounce: 0.15 } },
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
                <div className="trainer-avatar" aria-hidden="true">
                  🎓
                </div>
                <div className="trainer-details">
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
                  <div className="trainer-stats-row">
                    <span className="trainer-stat-pill" title="Pokémon Vistos">
                      <Sparkles className="size-3" /> Vistos: {seenCount}
                    </span>
                    <span className="trainer-stat-pill" title="Pokémon Capturados">
                      <Shield className="size-3" /> Capturados: {capturedCount}
                    </span>
                    <span className="trainer-stat-pill" title="Logros Obtenidos">
                      <Award className="size-3" /> Logros: {achievementsCount}
                    </span>
                  </div>
                </div>
              </div>

              {/* Medals & Achievements */}
              <div className="trainer-badges-section">
                <h3 className="pc-box-section-title">
                  <Award className="size-4" /> Medallas del Campeón
                </h3>
                <div className="trainer-badges-grid">
                  <div className={`trainer-badge-card ${unlockedAchievements.includes('Amante de la IA') ? 'badge-unlocked' : ''}`}>
                    <span className="trainer-badge-card-emoji">🎓</span>
                    <span className="trainer-badge-card-name">Amante IA</span>
                  </div>
                  <div className={`trainer-badge-card ${unlockedAchievements.includes('Entrenador de Fuego') ? 'badge-unlocked' : ''}`}>
                    <span className="trainer-badge-card-emoji">🔥</span>
                    <span className="trainer-badge-card-name">Fuego</span>
                  </div>
                  <div className={`trainer-badge-card ${unlockedAchievements.includes('Cazador Legendario') ? 'badge-unlocked' : ''}`}>
                    <span className="trainer-badge-card-emoji">✨</span>
                    <span className="trainer-badge-card-name">Mítico</span>
                  </div>
                </div>
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
