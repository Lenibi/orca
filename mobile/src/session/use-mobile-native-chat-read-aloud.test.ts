import { createElement } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const speech = vi.hoisted(() => ({ spoken: [] as string[], stops: 0 }))

vi.mock('expo-speech', () => ({
  speak: (text: string) => {
    speech.spoken.push(text)
  },
  stop: () => {
    speech.stops += 1
    return Promise.resolve()
  }
}))

import { useMobileNativeChatReadAloud } from './use-mobile-native-chat-read-aloud'

type ReadAloud = ReturnType<typeof useMobileNativeChatReadAloud>

describe('useMobileNativeChatReadAloud', () => {
  let renderer: ReactTestRenderer | null = null
  let readAloud: ReadAloud | null = null

  function Harness({ scopeKey }: { scopeKey: string }): null {
    readAloud = useMobileNativeChatReadAloud(scopeKey)
    return null
  }

  beforeEach(() => {
    speech.spoken.length = 0
    speech.stops = 0
  })

  afterEach(() => {
    act(() => renderer?.unmount())
    renderer = null
    readAloud = null
  })

  function startReadingInTab(scopeKey: string): number {
    act(() => {
      renderer = create(createElement(Harness, { scopeKey }))
    })
    act(() => readAloud?.toggle('latest-reply', 'First tab reply.'))
    expect(speech.spoken).toEqual(['First tab reply.'])
    expect(readAloud?.speakingKey).toBe('latest-reply')
    return speech.stops
  }

  it('stops reading when the chat switches to another tab', () => {
    const stopsWhileReading = startReadingInTab('tab-a')

    act(() => renderer?.update(createElement(Harness, { scopeKey: 'tab-b' })))

    expect(speech.stops).toBe(stopsWhileReading + 1)
    expect(readAloud?.speakingKey).toBeNull()
  })

  it('stops when pressed after the reply it was reading is gone', () => {
    const stopsWhileReading = startReadingInTab('tab-a')

    act(() => readAloud?.toggle('latest-reply', null))

    expect(speech.stops).toBe(stopsWhileReading + 1)
    expect(readAloud?.speakingKey).toBeNull()
  })

  it('does nothing when pressed with no reply to read', () => {
    act(() => {
      renderer = create(createElement(Harness, { scopeKey: 'tab-a' }))
    })

    act(() => readAloud?.toggle('latest-reply', null))

    expect(speech.spoken).toEqual([])
    expect(readAloud?.speakingKey).toBeNull()
  })

  it('keeps reading when the same tab re-renders', () => {
    const stopsWhileReading = startReadingInTab('tab-a')

    act(() => renderer?.update(createElement(Harness, { scopeKey: 'tab-a' })))

    expect(speech.stops).toBe(stopsWhileReading)
    expect(readAloud?.speakingKey).toBe('latest-reply')
  })
})
