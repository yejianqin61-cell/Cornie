function rand(min, max) {
  return Math.random() * (max - min) + min
}

function chance(p) {
  return Math.random() < p
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

export function createCornieBlinkController({
  showLayer,
  hideLayers,
  setHeadDipPx,
  minIntervalMs = 3000,
  maxIntervalMs = 8000,
  doubleBlinkChance = 0.2,
}) {
  let stopped = false
  let timer = null
  let blinking = false

  async function blinkOnce() {
    if (blinking || stopped) return
    blinking = true

    // 轻微下移 1px + 随机 0~0.4，避免机械感
    const dip = 1 + rand(0, 0.4)
    setHeadDipPx(dip)
    setTimeout(() => setHeadDipPx(0), 120 + Math.floor(rand(0, 60)))

    // half 50ms -> closed 80ms -> half 50ms -> hide
    showLayer('half')
    await sleep(50 + Math.floor(rand(-8, 8)))

    showLayer('closed')
    await sleep(80 + Math.floor(rand(-10, 10)))

    showLayer('half')
    await sleep(50 + Math.floor(rand(-8, 8)))

    hideLayers()
    blinking = false
  }

  async function blinkSequence() {
    await blinkOnce()
    if (stopped) return
    if (chance(doubleBlinkChance)) {
      await sleep(140 + Math.floor(rand(0, 220)))
      await blinkOnce()
    }
  }

  function scheduleNext() {
    if (stopped) return
    const next = Math.floor(rand(minIntervalMs, maxIntervalMs))
    timer = setTimeout(async () => {
      await blinkSequence()
      scheduleNext()
    }, next)
  }

  return {
    start() {
      stopped = false
      hideLayers()
      scheduleNext()
    },
    stop() {
      stopped = true
      blinking = false
      if (timer) clearTimeout(timer)
      timer = null
      hideLayers()
      setHeadDipPx(0)
    },
    async blinkNow() {
      await blinkSequence()
    },
  }
}
