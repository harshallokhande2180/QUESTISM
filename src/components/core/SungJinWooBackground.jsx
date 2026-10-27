import { useEffect, useRef } from 'react'

/**
 * SungJinWooBackground
 *
 * Canvas-based animated background inspired by the Sung Jin-Woo "Darkness"
 * wallpaper — deep void, pulsing purple/violet monarch aura, rising dark
 * smoke particles, floating mana embers, shadow-soldier silhouettes, and
 * a subtle breathing glow at the center.
 */
export default function SungJinWooBackground() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    let W = 0, H = 0
    function resize() {
      W = canvas.width  = window.innerWidth
      H = canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const PARTICLE_COUNT = 120
    const particles = Array.from({ length: PARTICLE_COUNT }, () => spawnParticle(true))

    function spawnParticle(randomY = false) {
      const x = Math.random() * (W || window.innerWidth)
      return {
        x,
        y: randomY ? Math.random() * (H || window.innerHeight) : (H || window.innerHeight) + 10,
        vx: (Math.random() - 0.5) * 0.4,
        vy: -(0.3 + Math.random() * 0.8),
        radius: 1 + Math.random() * 3,
        alpha: 0,
        maxAlpha: 0.1 + Math.random() * 0.5,
        life: 0,
        maxLife: 180 + Math.random() * 200,
        hue: 260 + Math.random() * 60,
        saturation: 60 + Math.random() * 40,
        ember: Math.random() < 0.18,
      }
    }

    const SHADOWS = 5
    const shadows = Array.from({ length: SHADOWS }, (_, i) => ({
      x: (i + 0.5) / SHADOWS,
      yOffset: 0,
      phase: Math.random() * Math.PI * 2,
      speed: 0.002 + Math.random() * 0.003,
      scale: 0.7 + Math.random() * 0.6,
      alpha: 0.04 + Math.random() * 0.08,
    }))

    let tick = 0

    function drawShadow(x, y, scale, alpha) {
      ctx.save()
      ctx.globalAlpha = alpha
      ctx.translate(x, y)
      ctx.scale(scale, scale)

      const grad = ctx.createRadialGradient(0, -60, 0, 0, -30, 80)
      grad.addColorStop(0, 'rgba(138, 43, 226, 0.9)')
      grad.addColorStop(0.4, 'rgba(75, 0, 130, 0.6)')
      grad.addColorStop(1, 'transparent')

      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(0, -80, 18, 0, Math.PI * 2)
      ctx.fill()

      ctx.beginPath()
      ctx.moveTo(-16, -62)
      ctx.lineTo(-22, 0)
      ctx.lineTo(22, 0)
      ctx.lineTo(16, -62)
      ctx.closePath()
      ctx.fillStyle = 'rgba(75, 0, 130, 0.5)'
      ctx.fill()

      ctx.beginPath()
      ctx.moveTo(-22, 0)
      ctx.lineTo(-26, 80)
      ctx.lineTo(-10, 80)
      ctx.lineTo(-8, 0)
      ctx.closePath()
      ctx.fill()

      ctx.beginPath()
      ctx.moveTo(22, 0)
      ctx.lineTo(26, 80)
      ctx.lineTo(10, 80)
      ctx.lineTo(8, 0)
      ctx.closePath()
      ctx.fill()

      ctx.beginPath()
      ctx.arc(0, -82, 4, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(180, 100, 255, 0.9)'
      ctx.fill()
      ctx.shadowBlur = 12
      ctx.shadowColor = '#a855f7'
      ctx.fill()

      ctx.restore()
    }

    function render() {
      tick++

      ctx.fillStyle = '#020006'
      ctx.fillRect(0, 0, W, H)

      const breathe = 0.5 + 0.5 * Math.sin(tick * 0.018)
      const cx = W / 2
      const cy = H * 0.78

      const outerAura = ctx.createRadialGradient(cx, cy, 0, cx, cy, W * 0.55)
      outerAura.addColorStop(0, `rgba(120, 20, 200, ${0.07 + breathe * 0.06})`)
      outerAura.addColorStop(0.4, `rgba(80, 0, 140, ${0.05 + breathe * 0.04})`)
      outerAura.addColorStop(1, 'transparent')
      ctx.fillStyle = outerAura
      ctx.fillRect(0, 0, W, H)

      const innerGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, H * 0.35)
      innerGlow.addColorStop(0, `rgba(160, 50, 255, ${0.12 + breathe * 0.1})`)
      innerGlow.addColorStop(0.3, `rgba(100, 10, 180, ${0.08 + breathe * 0.06})`)
      innerGlow.addColorStop(1, 'transparent')
      ctx.fillStyle = innerGlow
      ctx.fillRect(0, 0, W, H)

      const mistGrad = ctx.createLinearGradient(0, H * 0.6, 0, H)
      mistGrad.addColorStop(0, 'transparent')
      mistGrad.addColorStop(0.5, `rgba(70, 0, 120, ${0.08 + breathe * 0.05})`)
      mistGrad.addColorStop(1, `rgba(30, 0, 60, ${0.25})`)
      ctx.fillStyle = mistGrad
      ctx.fillRect(0, 0, W, H)

      const topVig = ctx.createLinearGradient(0, 0, 0, H * 0.4)
      topVig.addColorStop(0, 'rgba(2, 0, 6, 0.7)')
      topVig.addColorStop(1, 'transparent')
      ctx.fillStyle = topVig
      ctx.fillRect(0, 0, W, H)

      const sideW = W * 0.3
      const leftVig = ctx.createLinearGradient(0, 0, sideW, 0)
      leftVig.addColorStop(0, 'rgba(2, 0, 6, 0.6)')
      leftVig.addColorStop(1, 'transparent')
      ctx.fillStyle = leftVig
      ctx.fillRect(0, 0, W, H)

      const rightVig = ctx.createLinearGradient(W, 0, W - sideW, 0)
      rightVig.addColorStop(0, 'rgba(2, 0, 6, 0.6)')
      rightVig.addColorStop(1, 'transparent')
      ctx.fillStyle = rightVig
      ctx.fillRect(0, 0, W, H)

      shadows.forEach(s => {
        s.phase += s.speed
        const yOff = Math.sin(s.phase) * 8
        const xPos = s.x * W
        const yPos = H * 0.72 + yOff
        const alpha = s.alpha * (0.6 + 0.4 * Math.sin(s.phase * 1.3))
        drawShadow(xPos, yPos, s.scale, alpha)
      })

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]
        p.life++
        p.x += p.vx
        p.y += p.vy

        const progress = p.life / p.maxLife
        if (progress < 0.2) {
          p.alpha = (progress / 0.2) * p.maxAlpha
        } else if (progress > 0.7) {
          p.alpha = ((1 - progress) / 0.3) * p.maxAlpha
        } else {
          p.alpha = p.maxAlpha
        }

        if (p.life >= p.maxLife || p.y < -20) {
          particles[i] = spawnParticle()
          particles[i].x = cx + (Math.random() - 0.5) * W * 0.7
          continue
        }

        ctx.save()
        ctx.globalAlpha = p.alpha

        if (p.ember) {
          ctx.shadowBlur = 10
          ctx.shadowColor = `hsl(${p.hue}, ${p.saturation}%, 70%)`
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
          ctx.fillStyle = `hsl(${p.hue}, ${p.saturation}%, 75%)`
          ctx.fill()
        } else {
          const smokeGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 4)
          smokeGrad.addColorStop(0, `hsla(${p.hue}, ${p.saturation}%, 40%, 1)`)
          smokeGrad.addColorStop(1, 'transparent')
          ctx.fillStyle = smokeGrad
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.radius * 4, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.restore()
      }

      for (let y = 0; y < H; y += 4) {
        ctx.fillStyle = 'rgba(0,0,0,0.06)'
        ctx.fillRect(0, y, W, 1)
      }

      const edgeGlow = ctx.createLinearGradient(0, H * 0.5, 0, H)
      edgeGlow.addColorStop(0, 'transparent')
      edgeGlow.addColorStop(0.8, `rgba(138, 43, 226, ${0.04 + breathe * 0.03})`)
      edgeGlow.addColorStop(1, `rgba(88, 0, 160, ${0.08 + breathe * 0.04})`)
      ctx.fillStyle = edgeGlow
      ctx.fillRect(0, 0, W, H)

      rafId = requestAnimationFrame(render)
    }

    let rafId = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="questism-3d-bg"
      aria-hidden
    />
  )
}
