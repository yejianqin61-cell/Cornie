import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createCornieBlinkController } from '../../src/renderer/cornieBlink.js'

describe('cornieBlink controller', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('runs a full blink sequence and resets head dip', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1)

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

  it('runs a double blink sequence when chance matches', async () => {
    const randomValues = [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1]
    vi.spyOn(Math, 'random').mockImplementation(() => randomValues.shift() ?? 0.1)

    const showLayer = vi.fn()
    const hideLayers = vi.fn()
    const setHeadDipPx = vi.fn()

    const controller = createCornieBlinkController({
      showLayer,
      hideLayers,
      setHeadDipPx,
      doubleBlinkChance: 1
    })

    const blinkPromise = controller.blinkNow()
    await vi.advanceTimersByTimeAsync(800)
    await blinkPromise

    expect(showLayer).toHaveBeenCalledTimes(6)
    expect(showLayer.mock.calls.map((call) => call[0])).toEqual([
      'half',
      'closed',
      'half',
      'half',
      'closed',
      'half'
    ])
    expect(hideLayers).toHaveBeenCalledTimes(2)
  })

  it('starts scheduled blinking and stops with cleanup', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)

    const showLayer = vi.fn()
    const hideLayers = vi.fn()
    const setHeadDipPx = vi.fn()

    const controller = createCornieBlinkController({
      showLayer,
      hideLayers,
      setHeadDipPx,
      minIntervalMs: 1000,
      maxIntervalMs: 1000,
      doubleBlinkChance: 0
    })

    controller.start()
    expect(hideLayers).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(1300)
    controller.stop()

    expect(hideLayers).toHaveBeenCalledTimes(3)
    expect(setHeadDipPx).toHaveBeenCalledWith(0)

    const showCountAfterStop = showLayer.mock.calls.length
    await vi.advanceTimersByTimeAsync(4000)
    expect(showLayer.mock.calls.length).toBe(showCountAfterStop)
  })
})
