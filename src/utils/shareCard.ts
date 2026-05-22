import { getTypeMeta } from '../data/typeColors.js'
import type { PokemonDetail } from '../services/pokeApi.js'

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

export async function sharePokemonCard(result: PokemonDetail): Promise<void> {
  const canvas = document.createElement('canvas')
  const W = 480
  const H = 240
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context not available')

  const primary = getTypeMeta(result.type?.[0])

  // Background gradient
  const bg = ctx.createLinearGradient(0, 0, W, H)
  bg.addColorStop(0, primary.soft ?? '#f8f9ff')
  bg.addColorStop(1, '#ffffff')
  ctx.fillStyle = bg
  roundRect(ctx, 0, 0, W, H, 20)
  ctx.fill()

  // Left accent bar
  ctx.fillStyle = primary.color ?? '#a0a6b5'
  roundRect(ctx, 0, 0, 6, H, 0)
  ctx.fill()

  // Sprite
  const sprite = await loadImage(result.sprite)
  if (sprite) ctx.drawImage(sprite, 20, 20, 180, 180)

  // Number
  ctx.fillStyle = '#c6cad5'
  ctx.font = 'bold 13px sans-serif'
  ctx.fillText(result.displayNumber ?? `#${result.id}`, 220, 48)

  // Name
  ctx.fillStyle = '#252637'
  ctx.font = `bold ${result.name.length > 10 ? 26 : 32}px sans-serif`
  ctx.fillText(result.name, 220, 90)

  // Type badges
  let badgeX = 220
  for (const type of result.type ?? []) {
    const meta = getTypeMeta(type)
    ctx.fillStyle = meta.color
    roundRect(ctx, badgeX, 102, 70, 24, 12)
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 12px sans-serif'
    ctx.fillText(meta.label, badgeX + 8, 119)
    badgeX += 78
  }

  // Description (wrapped)
  const desc = result.description ?? ''
  ctx.fillStyle = '#6b7280'
  ctx.font = '13px sans-serif'
  const words = desc.split(' ')
  let line = ''
  let lineY = 150
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (ctx.measureText(test).width > 240 && line) {
      ctx.fillText(line, 220, lineY)
      line = word
      lineY += 18
      if (lineY > H - 20) break
    } else {
      line = test
    }
  }
  if (line && lineY <= H - 20) ctx.fillText(line, 220, lineY)

  // Watermark
  ctx.fillStyle = '#d1d5db'
  ctx.font = 'bold 11px sans-serif'
  ctx.fillText('Pokédex IA', W - 90, H - 14)

  return new Promise((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      if (!blob) { reject(new Error('No se pudo generar la imagen')); return }
      const file = new File([blob], `${result.name}.png`, { type: 'image/png' })
      try {
        const shareUrl = `${window.location.origin}/pokemon/${result.apiName || result.id}`
        const shareText = `¡Mira a ${result.name} en Pokédex IA! Tipo: ${(result.type ?? []).map(getTypeMeta).map(m => m.label).join('/')}`

        if (navigator.share) {
          const shareData: ShareData = {
            title: `${result.name} — Pokédex IA`,
            text: shareText,
            url: shareUrl,
          }

          try {
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
              shareData.files = [file]
            }
          } catch {
            // canShare can throw in some strictly sandboxed environments
          }

          await navigator.share(shareData)
        } else {
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `${result.name}.png`
          a.click()
          URL.revokeObjectURL(url)
        }
        resolve()
      } catch (err) {
        // User cancelling the share sheet throws an AbortError. Do not reject as it is a normal user action.
        if (err instanceof Error && err.name === 'AbortError') {
          resolve()
        } else {
          reject(err)
        }
      }
    }, 'image/png')
  })
}

export async function shareAchievement(achievement: { label: string; desc: string; emoji: string }): Promise<void> {
  const canvas = document.createElement('canvas')
  const W = 480
  const H = 240
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context not available')

  // Background premium gold/platinum gradient
  const bg = ctx.createLinearGradient(0, 0, W, H)
  bg.addColorStop(0, '#fdfbf7') // light platinum
  bg.addColorStop(0.5, '#fffdf9')
  bg.addColorStop(1, '#f5eeda') // very light gold/cream
  ctx.fillStyle = bg
  roundRect(ctx, 0, 0, W, H, 20)
  ctx.fill()

  // Left accent golden metallic bar
  const accent = ctx.createLinearGradient(0, 0, 0, H)
  accent.addColorStop(0, '#d4af37') // metallic gold
  accent.addColorStop(0.5, '#f3e5ab') // bright cream gold
  accent.addColorStop(1, '#aa7c11') // bronze gold
  ctx.fillStyle = accent
  roundRect(ctx, 0, 0, 8, H, 0)
  ctx.fill()

  // Draw decorative golden medal circle on the left
  ctx.beginPath()
  const circleX = 110
  const circleY = H / 2
  const radius = 64
  const circleGrad = ctx.createRadialGradient(circleX - 8, circleY - 8, radius - 40, circleX, circleY, radius)
  circleGrad.addColorStop(0, '#fff3cc')
  circleGrad.addColorStop(0.8, '#dfac28')
  circleGrad.addColorStop(1, '#b58b19')
  ctx.fillStyle = circleGrad
  ctx.arc(circleX, circleY, radius, 0, Math.PI * 2)
  ctx.fill()
  
  // Outer circle border
  ctx.strokeStyle = '#b58b19'
  ctx.lineWidth = 3
  ctx.stroke()

  // Medal emoji directly centered
  ctx.fillStyle = '#000'
  ctx.font = '72px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(achievement.emoji || '🏆', circleX, circleY)

  // Label "LOGRO DESBLOQUEADO"
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = '#b58b19' // golden bronze
  ctx.font = 'bold 11px sans-serif'
  ctx.fillText('¡LOGRO DESBLOQUEADO!', 200, 58)

  // Achievement Title
  ctx.fillStyle = '#1e202c' // dark ink
  ctx.font = `bold ${achievement.label.length > 15 ? 22 : 26}px sans-serif`
  ctx.fillText(achievement.label, 200, 96)

  // Divider line
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.3)'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(200, 114)
  ctx.lineTo(W - 40, 114)
  ctx.stroke()

  // Achievement Description (wrapped)
  const desc = achievement.desc ?? ''
  ctx.fillStyle = '#5c5f73'
  ctx.font = '13px sans-serif'
  const words = desc.split(' ')
  let line = ''
  let lineY = 142
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (ctx.measureText(test).width > 240 && line) {
      ctx.fillText(line, 200, lineY)
      line = word
      lineY += 18
    } else {
      line = test
    }
  }
  if (line) ctx.fillText(line, 200, lineY)

  // Watermark "Pokédex IA"
  ctx.fillStyle = '#b58b19'
  ctx.font = 'bold 11px sans-serif'
  ctx.fillText('Pokédex IA', W - 94, H - 20)

  return new Promise((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      if (!blob) { reject(new Error('No se pudo generar la imagen')); return }
      const file = new File([blob], `logro-${achievement.label.replace(/\s+/g, '-')}.png`, { type: 'image/png' })
      try {
        const shareUrl = window.location.origin
        const shareText = `¡Desbloqueé el logro "${achievement.label}" en Pokédex IA! 🏆 ${achievement.desc}`

        if (navigator.share) {
          const shareData: ShareData = {
            title: `Logro Desbloqueado — Pokédex IA`,
            text: shareText,
            url: shareUrl,
          }

          try {
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
              shareData.files = [file]
            }
          } catch {
            // canShare can throw in some strictly sandboxed environments
          }

          await navigator.share(shareData)
        } else {
          // Download fallback
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `logro-${achievement.label.replace(/\s+/g, '-')}.png`
          a.click()
          URL.revokeObjectURL(url)
        }
        resolve()
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          resolve()
        } else {
          reject(err)
        }
      }
    }, 'image/png')
  })
}

