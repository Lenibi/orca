import { useCallback, useEffect, useRef, useState } from 'react'
import { useSpeechOutput } from '../platform/speech-output'

export function useMobileNativeChatReadAloud(scopeKey: string) {
  const speech = useSpeechOutput()
  const [speakingKey, setSpeakingKey] = useState<string | null>(null)
  const runRef = useRef(0)

  const stop = useCallback(() => {
    runRef.current += 1
    setSpeakingKey(null)
    speech.stop()
  }, [speech])

  const toggle = useCallback(
    // Stop needs no text: the reply being read can be gone while it is still playing.
    (key: string, text: string | null) => {
      if (speakingKey === key) {
        stop()
        return
      }
      if (!text) {
        return
      }
      runRef.current += 1
      const run = runRef.current
      setSpeakingKey(key)
      // A replaced run still settles; only the current run may clear the state.
      void speech
        .speak(text)
        .catch(() => false)
        .then(() => {
          if (runRef.current === run) {
            setSpeakingKey(null)
          }
        })
    },
    [speakingKey, speech, stop]
  )

  // Switching chat tabs keeps this view mounted, so a new scope must end the old tab's reading.
  useEffect(() => () => stop(), [scopeKey, stop])

  return { canSpeak: speech.canSpeak, speakingKey, toggle, stop }
}
