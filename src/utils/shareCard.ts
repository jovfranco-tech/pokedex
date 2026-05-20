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
        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          await navigator.share({
            title: `${result.name} — Pokédex IA`,
            text: `${result.name} · ${result.type?.join('/')} · ${result.displayNumber ?? ''}`,
            files: [file],
          })
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
        reject(err)
      }
    }, 'image/png')
  })
}
