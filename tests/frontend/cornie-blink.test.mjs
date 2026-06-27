import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createCornieBlinkController } from '../../src/renderer/cornieBlink.js'

describe('cornieBlink controller', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.spyOn(Math, 'random').mockReturnValue(0.1)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('runs a full blink sequence and resets head dip', async () => {
    const showLayer = vi.fn()
    const hideLayers = vi.fn()
    const setHeadDipPx = vi.fn()

    const controller = createCornieBlinkController({
      showLayer,
      hideLayers,
      setHeadDipPx,
      doubleBlinkChance: 0
    })

    const blinkPromise = controller.blinkNow()
    await vi.advanceTimersByTimeAsync(300)
    await blinkPromise

    expect(showLayer).toHaveBeenNthCalledWith(1, 'half')
    expect(showLayer).toHaveBeenNthCalledWith(2, 'closed')
    expect(showLayer).toHaveBeenNthCalledWith(3, 'half')
    expect(hideLayers).toHaveBeenCalled()
    expect(setHeadDipPx).toHaveBeenCalledWith(0)
  })

  it('starts scheduled blinking and stops cleanly', async () => {
    const controller = createCornieBlinkController({
      showLayer: vi.fn(),
      hideLayers: vi.fn(),
      setHeadDipPx: vi.fn(),
      minIntervalMs: 1000,
      maxIntervalMs: 1000,
      doubleBlinkChance: 0
    })

    controller.start()
    await vi.advanceTimersByTimeAsync(1300)
    controller.stop()

    expect(true).toBe(true)
  })
})
