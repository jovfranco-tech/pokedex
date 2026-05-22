import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import type { PokemonDetail } from '../services/pokeApi.js'

interface TiltState {
  x: string
  y: string
  lightX: string
  lightY: string
}

const neutralTilt: TiltState = {
  x: '-7deg',
  y: '10deg',
  lightX: '58%',
  lightY: '34%',
}

const stageMotionByType: Record<string, string> = {
  bug:      'stage-motion-nature',
  dark:     'stage-motion-mystic',
  dragon:   'stage-motion-air',
  electric: 'stage-motion-electric',
  fairy:    'stage-motion-mystic',
  fighting: 'stage-motion-heavy',
  fire:     'stage-motion-fire',
  flying:   'stage-motion-air',
  ghost:    'stage-motion-mystic',
  grass:    'stage-motion-nature',
  ground:   'stage-motion-heavy',
  ice:      'stage-motion-water',
  normal:   'stage-motion-heavy',
  poison:   'stage-motion-mystic',
  psychic:  'stage-motion-mystic',
  rock:     'stage-motion-heavy',
  steel:    'stage-motion-heavy',
  water:    'stage-motion-water',
}

const stageParticles = Array.from({ length: 10 }, (_, index) => index)
const typeBurstItems = Array.from({ length: 8 }, (_, index) => index)

interface Pokemon3DStageProps {
  pokemon: PokemonDetail
}

export function Pokemon3DStage({ pokemon }: Pokemon3DStageProps) {
  const [tilt, setTilt] = useState<TiltState>(neutralTilt)
  const [imgLoaded, setImgLoaded] = useState(false)
  const modelSprite = pokemon.sprite
  const motionSprite = pokemon.animatedSprite
  const stageSprite = motionSprite || modelSprite

  useEffect(() => {
    setImgLoaded(false)
  }, [pokemon.id, stageSprite])
  const primaryType = (pokemon.type?.[0] ?? 'normal').toLowerCase().replace(/[^a-z0-9]/g, '')
  const motionClass = stageMotionByType[primaryType] ?? 'stage-motion-mystic'

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width - 0.5
    const y = (event.clientY - rect.top) / rect.height - 0.5

    setTilt({
      x: `${(-y * 18).toFixed(2)}deg`,
      y: `${(x * 22).toFixed(2)}deg`,
      lightX: `${Math.round((x + 0.5) * 100)}%`,
      lightY: `${Math.round((y + 0.5) * 100)}%`,
    })
  }

  return (
    <div
      className={`pokemon-3d-shell pokemon-3d-${primaryType} ${motionClass}`}
      style={{ '--tilt-x': tilt.x, '--tilt-y': tilt.y, '--light-x': tilt.lightX, '--light-y': tilt.lightY } as CSSProperties}
      aria-label={`Animación 3D de ${pokemon.name}`}
      onPointerMove={handlePointerMove}
      onPointerLeave={() => setTilt(neutralTilt)}
    >
      <div className="stage-depth-glow" aria-hidden="true" />
      <div className="pokemon-3d-type-wash" aria-hidden="true" />
      <div className="stage-type-burst" aria-hidden="true">
        {typeBurstItems.map((item) => (
          <span key={item} />
        ))}
      </div>
      <div className="stage-particle-field" aria-hidden="true">
        {stageParticles.map((particle) => (
          <span key={particle} className="stage-particle" />
        ))}
      </div>
      <div className="stage-speed-lines" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className="pokemon-3d-holo" aria-hidden="true" />
      <div className="pokemon-3d-grid" aria-hidden="true" />
      <div className="pokemon-3d-aura" aria-hidden="true" />
      <div className="pokemon-3d-light" aria-hidden="true" />
      <div className="pokemon-3d-scan-beam" aria-hidden="true" />
      <div className="pokemon-3d-orbit orbit-one" aria-hidden="true" />
      <div className="pokemon-3d-orbit orbit-two" aria-hidden="true" />
      <div className="pokemon-3d-orbit orbit-three" aria-hidden="true" />
      <div className="pokemon-3d-energy-ring ring-front" aria-hidden="true" />
      <div className="pokemon-3d-energy-ring ring-back" aria-hidden="true" />
      <div className="pokemon-3d-pedestal" aria-hidden="true">
        <span />
        <span />
        <div className="pedestal-laser-cone" />
      </div>
      <span className="pokemon-3d-spark spark-one" aria-hidden="true" />
      <span className="pokemon-3d-spark spark-two" aria-hidden="true" />
      <span className="pokemon-3d-spark spark-three" aria-hidden="true" />

      {!imgLoaded && (
        <div className="stage-artwork-loader" aria-hidden="true">
          <svg viewBox="0 0 100 100" className="stage-loader-pokeball">
            <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="8" strokeDasharray="12 22" />
            <line x1="10" y1="50" x2="90" y2="50" stroke="currentColor" strokeWidth="8" />
            <circle cx="50" cy="50" r="15" fill="currentColor" stroke="none" />
            <circle cx="50" cy="50" r="6" fill="#1b1c2b" stroke="none" />
          </svg>
          <span className="sr-only">Cargando holograma...</span>
        </div>
      )}

      <div className="pokemon-3d-model" style={{ opacity: imgLoaded ? 1 : 0, transition: 'opacity 0.4s ease' }}>
        <div className="pokemon-3d-model-idle">
          <div className="pokemon-3d-depth-stack">
            <img
              src={stageSprite}
              alt=""
              className={`pokemon-3d-depth depth-back ${motionSprite ? 'pokemon-animated-depth' : ''}`}
              aria-hidden="true"
              onLoad={() => setImgLoaded(true)}
            />
            <img
              src={stageSprite}
              alt=""
              className={`pokemon-3d-depth depth-mid ${motionSprite ? 'pokemon-animated-depth' : ''}`}
              aria-hidden="true"
              onLoad={() => setImgLoaded(true)}
            />
            <div className="pokemon-3d-card">
              <img
                src={stageSprite}
                alt={`Holograma 3D de ${pokemon.name}`}
                className={motionSprite ? 'pokemon-animated-sprite' : ''}
                onLoad={() => setImgLoaded(true)}
              />
            </div>
          </div>
        </div>
      </div>

      {!motionSprite && (
        <img
          src={modelSprite}
          alt=""
          className="pokemon-3d-motion-sprite"
          aria-hidden="true"
          onLoad={() => setImgLoaded(true)}
        />
      )}

      <div className="pokemon-3d-shadow" aria-hidden="true" />
    </div>
  )
}
