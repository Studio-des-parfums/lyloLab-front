import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * 'starting': waiting for the mic to deliver real audio; nothing is captured yet.
 * 'recording': audio is flowing and being recorded — the user can speak.
 */
export type RecorderState = 'idle' | 'starting' | 'recording' | 'transcribing'

/** Formats the browser can record, in order of preference (Chrome/Firefox, then Safari). */
const MIME_TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg']

/**
 * Dictation, not a call: echo cancellation and auto gain (which starts low and
 * swallows the first words) degrade the voice. Light noise suppression is kept
 * for open spaces.
 */
const AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: false,
  // Kept on: Bluetooth headset mics come in very low, too quiet to transcribe.
  autoGainControl: true,
  noiseSuppression: true,
  channelCount: 1,
}

const AUDIO_BITRATE = 64_000

/** A warmed-up mic not used within this delay is released (OS mic indicator off). */
const WARM_IDLE_MS = 15_000

/**
 * Bluetooth headsets deliver pure digital silence while they switch to their
 * mic profile. Recording starts on the first frame carrying real signal (any
 * real mic has some noise); past this delay we start anyway.
 */
const READY_TIMEOUT_MS = 2_500

export const voiceInputSupported =
  typeof navigator !== 'undefined' &&
  !!navigator.mediaDevices?.getUserMedia &&
  typeof MediaRecorder !== 'undefined'

interface Mic {
  stream: MediaStream
  audioCtx: AudioContext
  analyser: AnalyserNode
}

function closeMic(mic: Mic) {
  mic.stream.getTracks().forEach((t) => t.stop())
  void mic.audioCtx.close()
}

async function openMic(): Promise<Mic> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: AUDIO_CONSTRAINTS })
  const audioCtx = new AudioContext()
  const analyser = audioCtx.createAnalyser()
  analyser.fftSize = 256
  audioCtx.createMediaStreamSource(stream).connect(analyser)
  return { stream, audioCtx, analyser }
}

function isLive(mic: Mic) {
  return mic.stream.getAudioTracks().some((t) => t.readyState === 'live')
}

/**
 * Records the microphone, then hands the audio to `transcribe` once stopped.
 * `level` (0–1) follows the input volume, for a live indicator. Call `warm()`
 * when the user is about to dictate (hover, focus) to open the mic ahead.
 */
export function useVoiceRecorder(
  transcribe: (audio: Blob, signal: AbortSignal) => Promise<string>,
  onText: (text: string) => void,
  onError: (message: string) => void,
) {
  const [state, setState] = useState<RecorderState>('idle')
  const [level, setLevel] = useState(0)
  const [seconds, setSeconds] = useState(0)
  const stateRef = useRef<RecorderState>('idle')
  const micRef = useRef<Promise<Mic> | null>(null)
  const idleTimerRef = useRef<number | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const cancelledRef = useRef(false)
  const abortRef = useRef<AbortController | null>(null)
  const frameRef = useRef(0)
  const clockRef = useRef<number | null>(null)

  const setPhase = useCallback((next: RecorderState) => {
    stateRef.current = next
    setState(next)
  }, [])

  const clearIdleTimer = () => {
    if (idleTimerRef.current !== null) clearTimeout(idleTimerRef.current)
    idleTimerRef.current = null
  }

  const releaseMic = useCallback(() => {
    clearIdleTimer()
    const pending = micRef.current
    micRef.current = null
    pending?.then(closeMic, () => {})
  }, [])

  /** Opens the mic (or reuses the open one). */
  const acquireMic = useCallback(async (): Promise<Mic> => {
    clearIdleTimer()
    if (micRef.current) {
      const mic = await micRef.current.catch(() => null)
      if (mic && isLive(mic)) return mic
      micRef.current = null
    }
    micRef.current = openMic()
    micRef.current.catch(() => {
      micRef.current = null
    })
    return micRef.current
  }, [])

  const scheduleRelease = useCallback(() => {
    clearIdleTimer()
    idleTimerRef.current = window.setTimeout(() => {
      if (stateRef.current === 'idle') releaseMic()
    }, WARM_IDLE_MS)
  }, [releaseMic])

  /** Pre-opens the mic so a following start() is instant. Silent on failure. */
  const warm = useCallback(() => {
    if (stateRef.current !== 'idle') return
    // Only once the permission is granted: never pop the prompt on a hover.
    void navigator.permissions
      ?.query({ name: 'microphone' as PermissionName })
      .then((status) => {
        if (status.state !== 'granted' || stateRef.current !== 'idle') return
        return acquireMic().then(scheduleRelease)
      })
      .catch(() => {})
  }, [acquireMic, scheduleRelease])

  const stopMeters = () => {
    cancelAnimationFrame(frameRef.current)
    if (clockRef.current !== null) clearInterval(clockRef.current)
    clockRef.current = null
    setLevel(0)
  }

  const start = useCallback(async () => {
    if (stateRef.current !== 'idle') return
    cancelledRef.current = false
    setPhase('starting')

    let mic: Mic
    try {
      mic = await acquireMic()
    } catch {
      setPhase('idle')
      onError("Impossible d'accéder au micro. Autorisez-le dans les réglages du navigateur.")
      return
    }
    if (cancelledRef.current) {
      setPhase('idle')
      scheduleRelease()
      return
    }
    void mic.audioCtx.resume()

    const samples = new Uint8Array(mic.analyser.fftSize)
    const readLevel = () => {
      mic.analyser.getByteTimeDomainData(samples)
      let sum = 0
      let signal = false
      for (const s of samples) {
        if (s !== 128) signal = true
        sum += ((s - 128) / 128) ** 2
      }
      return { signal, rms: Math.sqrt(sum / samples.length) }
    }

    // Wait for real signal before recording, so "you can speak" is true.
    const waitedFrom = performance.now()
    await new Promise<void>((resolve) => {
      const poll = () => {
        if (
          cancelledRef.current ||
          readLevel().signal ||
          performance.now() - waitedFrom > READY_TIMEOUT_MS
        ) {
          resolve()
        } else {
          frameRef.current = requestAnimationFrame(poll)
        }
      }
      poll()
    })
    if (cancelledRef.current) {
      setPhase('idle')
      scheduleRelease()
      return
    }

    const mimeType = MIME_TYPES.find((t) => MediaRecorder.isTypeSupported(t))
    const recorder = new MediaRecorder(mic.stream, {
      ...(mimeType ? { mimeType } : {}),
      audioBitsPerSecond: AUDIO_BITRATE,
    })
    const chunks: Blob[] = []
    recorder.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data)

    recorder.onstart = () => {
      const tick = () => {
        setLevel(Math.min(1, readLevel().rms * 4))
        frameRef.current = requestAnimationFrame(tick)
      }
      tick()
      const startedAt = Date.now()
      setSeconds(0)
      clockRef.current = window.setInterval(
        () => setSeconds(Math.floor((Date.now() - startedAt) / 1000)),
        250,
      )
      setPhase('recording')
    }

    recorder.onstop = async () => {
      stopMeters()
      recorderRef.current = null
      // Keep the mic warm a little, for a follow-up dictation.
      scheduleRelease()
      const audio = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' })
      if (import.meta.env.DEV) {
        // Debug: open this URL to hear exactly what is sent for transcription.
        console.info(
          `[voice] ${audio.type}, ${(audio.size / 1024).toFixed(1)} Ko, ` +
            `micro « ${mic.stream.getAudioTracks()[0]?.label} » :`,
          URL.createObjectURL(audio),
        )
      }
      if (cancelledRef.current || audio.size === 0) {
        setPhase('idle')
        return
      }
      setPhase('transcribing')
      const controller = new AbortController()
      abortRef.current = controller
      try {
        const text = await transcribe(audio, controller.signal)
        if (text) onText(text)
      } catch (err) {
        if (!controller.signal.aborted) {
          onError(err instanceof Error ? err.message : 'La transcription a échoué')
        }
      } finally {
        abortRef.current = null
        setPhase('idle')
      }
    }

    recorderRef.current = recorder
    recorder.start()
  }, [acquireMic, scheduleRelease, setPhase, transcribe, onText, onError])

  /** Stops and transcribes. */
  const stop = useCallback(() => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
  }, [])

  /** Stops and discards the recording (or the pending transcription). */
  const cancel = useCallback(() => {
    cancelledRef.current = true
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
    abortRef.current?.abort()
  }, [])

  /** Cancels everything and closes the mic right away (panel closed). */
  const shutdown = useCallback(() => {
    cancel()
    releaseMic()
  }, [cancel, releaseMic])

  useEffect(
    () => () => {
      cancelledRef.current = true
      if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
      abortRef.current?.abort()
      cancelAnimationFrame(frameRef.current)
      if (clockRef.current !== null) clearInterval(clockRef.current)
      releaseMic()
    },
    [releaseMic],
  )

  return { state, level, seconds, start, stop, cancel, warm, shutdown }
}
