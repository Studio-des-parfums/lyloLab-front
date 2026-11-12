import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, Loader2, Mic, Minus, Send, Sparkles, Square, X } from 'lucide-react'
import { useVoiceRecorder, voiceInputSupported } from '../hooks/useVoiceRecorder'
import { useFormula } from '../context/FormulaContext'
import { applyManualMl, computeFormulaShares } from '../data/formulaEngine'
import { evaluateFormulaCompliance } from '../data/ifraCompliance'
import {
  describeChange,
  streamChat,
  transcribeAudio,
  type ChatMessagePayload,
  type ChatSource,
  type FormulaProposal,
  type FormulaSnapshot,
} from '../data/aiApi'
import './FormulaAssistant.css'

type Decision = 'pending' | 'accepted' | 'rejected'

interface ChatEntry {
  id: number
  role: 'user' | 'assistant'
  content: string
  proposal?: FormulaProposal | null
  warnings?: string[]
  sources?: ChatSource[]
  decision?: Decision
  streaming?: boolean
}

const DECISION_LABEL: Record<Decision, string> = {
  pending: 'en attente',
  accepted: 'acceptée',
  rejected: 'refusée',
}

const WELCOME =
  'Bonjour ! Je peux analyser votre formule, suggérer des matières, proposer des réglages ' +
  'de facettes et de dosages, ou m\'inspirer d\'un parfum de référence que je recherche sur ' +
  'internet. Chaque modification vous sera soumise avant d\'être appliquée.'

/** History sent to the model: proposals and the user's decision are folded into the text. */
function toPayload(entries: ChatEntry[]): ChatMessagePayload[] {
  return entries.map((entry) => ({
    role: entry.role,
    content:
      entry.proposal && entry.decision
        ? `${entry.content}\n[Proposition : ${entry.proposal.summary} — ${DECISION_LABEL[entry.decision]}]`
        : entry.content,
  }))
}

export default function FormulaAssistant() {
  const {
    favorites,
    facets,
    adjustments,
    catalog,
    totalVolumeMl,
    manualMl,
    formulaName,
    applyAiChanges,
  } = useFormula()

  const [open, setOpen] = useState(false)
  const [entries, setEntries] = useState<ChatEntry[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [phase, setPhase] = useState<'thinking' | 'search' | 'catalog' | 'writing'>('thinking')
  const abortRef = useRef<AbortController | null>(null)
  const nextId = useRef(1)
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: phase === 'writing' ? 'auto' : 'smooth',
    })
  }, [entries, sending, open, phase])

  // Stop a running answer when the panel closes or the page unmounts.
  useEffect(() => {
    if (!open) abortRef.current?.abort()
  }, [open])
  useEffect(() => () => abortRef.current?.abort(), [])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  // Voice input: the transcription lands in the draft, to review before sending.
  const appendTranscript = useCallback((text: string) => {
    setDraft((prev) => (prev.trim() ? `${prev.trimEnd()} ${text}` : text))
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [])
  const voice = useVoiceRecorder(transcribeAudio, appendTranscript, setError)

  const shutdownVoice = voice.shutdown
  useEffect(() => {
    if (!open) shutdownVoice()
  }, [open, shutdownVoice])

  function snapshot(): FormulaSnapshot {
    const shares = applyManualMl(
      computeFormulaShares(favorites, facets, adjustments, catalog),
      manualMl,
      totalVolumeMl,
    )
    return {
      name: formulaName,
      totalVolumeMl,
      facets,
      adjustments,
      manualDistribution: manualMl !== null,
      lines: shares.map((share) => ({
        material: share.material.name,
        percent: share.percent,
        ml: (share.percent / 100) * totalVolumeMl,
        ifraLimitPercent: share.ifraLimitPercent,
        cappedByIfra: share.cappedByIfra,
      })),
      overlappingAllergens: evaluateFormulaCompliance(shares).overlappingAllergens,
    }
  }

  async function send() {
    const content = draft.trim()
    if (!content || sending) return

    const userEntry: ChatEntry = { id: nextId.current++, role: 'user', content }
    const conversation = [...entries, userEntry]
    setEntries(conversation)
    setDraft('')
    setError(null)
    setSending(true)

    setPhase('thinking')

    const controller = new AbortController()
    abortRef.current = controller
    const assistantId = nextId.current++
    let started = false

    try {
      const response = await streamChat(toPayload(conversation), snapshot(), {
        signal: controller.signal,
        onStatus: (status) => setPhase((p) => (p === 'writing' ? p : status)),
        onDelta: (text) => {
          if (!started) {
            started = true
            setPhase('writing')
            setEntries((prev) => [
              ...prev,
              { id: assistantId, role: 'assistant', content: text, streaming: true },
            ])
          } else {
            setEntries((prev) =>
              prev.map((e) => (e.id === assistantId ? { ...e, content: e.content + text } : e)),
            )
          }
        },
      })
      const final: ChatEntry = {
        id: assistantId,
        role: 'assistant',
        content: response.message,
        proposal: response.proposal,
        warnings: response.warnings,
        sources: response.sources,
        decision: response.proposal ? 'pending' : undefined,
      }
      setEntries((prev) =>
        started ? prev.map((e) => (e.id === assistantId ? final : e)) : [...prev, final],
      )
    } catch (err) {
      setEntries((prev) =>
        prev.map((e) => (e.id === assistantId ? { ...e, streaming: false } : e)),
      )
      if (!controller.signal.aborted) {
        setError(err instanceof Error ? err.message : 'Erreur inconnue')
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null
      setSending(false)
    }
  }

  function decide(entry: ChatEntry, decision: Decision) {
    if (decision === 'accepted' && entry.proposal) applyAiChanges(entry.proposal.changes)
    setEntries((prev) => prev.map((e) => (e.id === entry.id ? { ...e, decision } : e)))
  }

  if (!open) {
    return (
      <button
        type="button"
        className="assistant-launcher"
        onClick={() => setOpen(true)}
        aria-label="Ouvrir l'assistant de formulation"
        title="Assistant de formulation"
      >
        <Sparkles size={24} />
      </button>
    )
  }

  return (
    <div className="assistant-panel" role="dialog" aria-label="Assistant de formulation">
      <div className="assistant-header">
        <span className="assistant-avatar">
          <Sparkles size={16} />
        </span>
        <div className="assistant-header-text">
          <span className="assistant-title">Assistant formulation</span>
          <span className="assistant-subtitle">
            {!sending
              ? 'Propose, vous validez'
              : phase === 'search'
                ? 'Recherche web…'
                : phase === 'catalog'
                  ? 'Consultation du catalogue…'
                : phase === 'writing'
                  ? 'Rédaction…'
                  : 'Réflexion…'}
          </span>
        </div>
        <button
          type="button"
          className="assistant-icon-btn"
          onClick={() => setOpen(false)}
          aria-label="Réduire"
        >
          <Minus size={16} />
        </button>
      </div>

      <div className="assistant-messages" ref={listRef}>
        <div className="assistant-bubble assistant-bubble-ai">{WELCOME}</div>

        {entries.map((entry) => (
          <div
            key={entry.id}
            className={`assistant-row assistant-row-${entry.role === 'user' ? 'user' : 'ai'}`}
          >
            <div
              className={`assistant-bubble assistant-bubble-${entry.role === 'user' ? 'user' : 'ai'}${entry.streaming ? ' assistant-streaming' : ''}`}
            >
              {entry.content}
            </div>

            {entry.proposal && (
              <div className={`assistant-proposal assistant-proposal-${entry.decision}`}>
                <p className="assistant-proposal-summary">{entry.proposal.summary}</p>
                <ul className="assistant-proposal-changes">
                  {entry.proposal.changes.map((change, i) => (
                    <li key={i}>{describeChange(change)}</li>
                  ))}
                </ul>
                {entry.decision === 'pending' ? (
                  <div className="assistant-proposal-actions">
                    <button
                      type="button"
                      className="assistant-btn assistant-btn-reject"
                      onClick={() => decide(entry, 'rejected')}
                    >
                      <X size={14} /> Refuser
                    </button>
                    <button
                      type="button"
                      className="assistant-btn assistant-btn-accept"
                      onClick={() => decide(entry, 'accepted')}
                    >
                      <Check size={14} /> Appliquer
                    </button>
                  </div>
                ) : (
                  <p className="assistant-proposal-status">
                    {entry.decision === 'accepted' ? '✓ Appliquée' : '✕ Refusée'}
                  </p>
                )}
              </div>
            )}

            {entry.sources && entry.sources.length > 0 && (
              <div className="assistant-sources">
                <span>Sources :</span>
                {entry.sources.map((source) => (
                  <a key={source.url} href={source.url} target="_blank" rel="noreferrer" title={source.url}>
                    {source.title}
                  </a>
                ))}
              </div>
            )}

            {entry.warnings?.map((warning) => (
              <p key={warning} className="assistant-warning">
                ⚠ {warning}
              </p>
            ))}
          </div>
        ))}

        {sending && phase !== 'writing' && (
          <div className="assistant-bubble assistant-bubble-ai assistant-typing" aria-label="L'assistant écrit">
            <span />
            <span />
            <span />
          </div>
        )}

        {error && <p className="assistant-error">{error}</p>}
      </div>

      <form
        className="assistant-composer"
        onSubmit={(e) => {
          e.preventDefault()
          send()
        }}
      >
        {voice.state === 'starting' ? (
          <div className="assistant-recording">
            <button
              type="button"
              className="assistant-icon-btn"
              onClick={voice.cancel}
              aria-label="Annuler"
            >
              <X size={16} />
            </button>
            <Loader2 size={14} className="assistant-spin" />
            <span className="assistant-recording-hint">Activation du micro…</span>
          </div>
        ) : voice.state === 'recording' ? (
          <div
            className="assistant-recording"
            onKeyDown={(e) => e.key === 'Escape' && voice.cancel()}
          >
            <button
              type="button"
              className="assistant-icon-btn"
              onClick={voice.cancel}
              aria-label="Annuler l'enregistrement"
              title="Annuler (Échap)"
            >
              <X size={16} />
            </button>
            <span className="assistant-recording-dot" />
            <div className="assistant-recording-wave" aria-hidden>
              {[0.5, 0.8, 1, 0.7, 0.9, 0.6, 1, 0.75, 0.55].map((k, i) => (
                <span key={i} style={{ transform: `scaleY(${0.15 + voice.level * k * 0.85})` }} />
              ))}
            </div>
            <span className="assistant-recording-time">
              {Math.floor(voice.seconds / 60)}:{String(voice.seconds % 60).padStart(2, '0')}
            </span>
            <button
              type="button"
              className="assistant-send assistant-mic-stop"
              onClick={voice.stop}
              aria-label="Terminer et transcrire"
              title="Terminer et transcrire"
              autoFocus
            >
              <Square size={13} fill="currentColor" />
            </button>
          </div>
        ) : (
          <>
            <textarea
              ref={inputRef}
              rows={1}
              value={draft}
              disabled={voice.state === 'transcribing'}
              placeholder={voice.state === 'transcribing' ? 'Transcription…' : 'Écrivez ou dictez un message…'}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  send()
                }
              }}
            />
            {voiceInputSupported && (
              <button
                type="button"
                className="assistant-mic"
                onClick={voice.start}
                onPointerEnter={voice.warm}
                onFocus={voice.warm}
                disabled={voice.state === 'transcribing'}
                aria-label="Dicter un message"
                title="Dicter un message"
              >
                {voice.state === 'transcribing' ? (
                  <Loader2 size={16} className="assistant-spin" />
                ) : (
                  <Mic size={16} />
                )}
              </button>
            )}
            <button
              type="submit"
              className="assistant-send"
              disabled={!draft.trim() || sending || voice.state === 'transcribing'}
              aria-label="Envoyer"
            >
              <Send size={16} />
            </button>
          </>
        )}
      </form>
    </div>
  )
}
