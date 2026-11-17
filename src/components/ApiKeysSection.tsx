import { useEffect, useState } from 'react'
import { Check, Copy, Eye, EyeOff, KeyRound, Pencil, Plus, Trash2, X } from 'lucide-react'
import {
  createApiKey,
  fetchApiKeys,
  revokeApiKey,
  updateApiKey,
  type ApiKey,
  type CreatedApiKey,
} from '../data/apiKeysApi'

const dateFormat = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })

async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

/** Clés permettant à une plateforme externe d'envoyer des demandes de formulation. */
export default function ApiKeysSection() {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [webhookUrl, setWebhookUrl] = useState('')
  const [created, setCreated] = useState<CreatedApiKey | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [editingWebhook, setEditingWebhook] = useState<{ id: string; value: string } | null>(null)
  const [shownSecret, setShownSecret] = useState<string | null>(null)
  const [confirmRevokeId, setConfirmRevokeId] = useState<string | null>(null)

  useEffect(() => {
    fetchApiKeys()
      .then(setKeys)
      .catch((err) => setError(err instanceof Error ? err.message : 'Erreur inconnue'))
  }, [])

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setBusy(false)
    }
  }

  async function handleCopy(id: string, text: string) {
    if (await copy(text)) {
      setCopied(id)
      setTimeout(() => setCopied(null), 2000)
    }
  }

  const replace = (updated: ApiKey) => setKeys((list) => list.map((k) => (k.id === updated.id ? updated : k)))

  return (
    <section className="team-card">
      <h2>Clés API &amp; webhooks</h2>
      <p className="team-card-hint">
        Une clé permet à une autre plateforme (ex. votre gestionnaire de tâches) d'envoyer des
        demandes de formulation à Lylo-Lab. Le webhook reçoit les changements de statut.
      </p>

      {error && <p className="team-status team-status-error">{error}</p>}

      {created && (
        <div className="apikey-created">
          <strong>Clé « {created.name} » créée.</strong> Copiez-la maintenant : elle ne sera plus
          jamais affichée.
          <div className="apikey-reveal">
            <code>{created.key}</code>
            <button type="button" className="btn btn-outline" onClick={() => handleCopy('new', created.key)}>
              {copied === 'new' ? <Check size={15} /> : <Copy size={15} />}
              {copied === 'new' ? 'Copiée' : 'Copier'}
            </button>
            <button type="button" className="team-icon-btn" onClick={() => setCreated(null)} aria-label="Fermer">
              <X size={15} />
            </button>
          </div>
        </div>
      )}

      {keys.length === 0 ? (
        <p className="team-status">Aucune clé pour le moment.</p>
      ) : (
        <ul className="team-members">
          {keys.map((k) => (
            <li key={k.id} className={`team-member apikey-row${k.revokedAt ? ' apikey-revoked' : ''}`}>
              <span className="team-avatar" aria-hidden>
                <KeyRound size={15} />
              </span>
              <span className="team-member-main">
                <span className="team-member-name">
                  {k.name}
                  {k.revokedAt && <span className="team-tag">Révoquée</span>}
                </span>
                <span className="team-member-meta">
                  <code>{k.prefix}…</code> · créée le {dateFormat.format(new Date(k.createdAt))}
                </span>

                {editingWebhook?.id === k.id ? (
                  <span className="apikey-webhook-edit">
                    <input
                      autoFocus
                      placeholder="https://mon-site.fr/webhooks/lylo"
                      value={editingWebhook.value}
                      onChange={(e) => setEditingWebhook({ id: k.id, value: e.target.value })}
                    />
                    <button
                      type="button"
                      className="team-icon-btn"
                      disabled={busy}
                      aria-label="Enregistrer"
                      onClick={() =>
                        run(async () => {
                          replace(await updateApiKey(k.id, { webhookUrl: editingWebhook.value.trim() || null }))
                          setEditingWebhook(null)
                        })
                      }
                    >
                      <Check size={15} />
                    </button>
                    <button type="button" className="team-icon-btn" onClick={() => setEditingWebhook(null)} aria-label="Annuler">
                      <X size={15} />
                    </button>
                  </span>
                ) : (
                  <span className="team-member-meta">
                    Webhook : {k.webhookUrl ?? <em>aucun</em>}
                    {!k.revokedAt && (
                      <button
                        type="button"
                        className="team-icon-btn"
                        aria-label="Modifier le webhook"
                        onClick={() => setEditingWebhook({ id: k.id, value: k.webhookUrl ?? '' })}
                      >
                        <Pencil size={13} />
                      </button>
                    )}
                  </span>
                )}

                {k.webhookUrl && !k.revokedAt && (
                  <span className="team-member-meta">
                    Secret de signature :{' '}
                    <code>{shownSecret === k.id ? k.webhookSecret : '••••••••••••'}</code>
                    <button
                      type="button"
                      className="team-icon-btn"
                      aria-label={shownSecret === k.id ? 'Masquer' : 'Afficher'}
                      onClick={() => setShownSecret(shownSecret === k.id ? null : k.id)}
                    >
                      {shownSecret === k.id ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                    <button
                      type="button"
                      className="team-icon-btn"
                      aria-label="Copier le secret"
                      onClick={() => handleCopy(`secret-${k.id}`, k.webhookSecret)}
                    >
                      {copied === `secret-${k.id}` ? <Check size={13} /> : <Copy size={13} />}
                    </button>
                  </span>
                )}
              </span>

              {!k.revokedAt &&
                (confirmRevokeId === k.id ? (
                  <span className="team-remove-confirm">
                    <button
                      type="button"
                      className="team-remove-yes"
                      disabled={busy}
                      onClick={() =>
                        run(async () => {
                          replace(await revokeApiKey(k.id))
                          setConfirmRevokeId(null)
                        })
                      }
                    >
                      Révoquer
                    </button>
                    <button type="button" className="team-icon-btn" onClick={() => setConfirmRevokeId(null)} aria-label="Annuler">
                      <X size={15} />
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    className="team-icon-btn"
                    title="Révoquer la clé"
                    aria-label={`Révoquer ${k.name}`}
                    onClick={() => setConfirmRevokeId(k.id)}
                  >
                    <Trash2 size={15} />
                  </button>
                ))}
            </li>
          ))}
        </ul>
      )}

      {creating ? (
        <form
          className="apikey-form"
          onSubmit={(e) => {
            e.preventDefault()
            if (!name.trim()) return
            run(async () => {
              const result = await createApiKey(name.trim(), webhookUrl.trim())
              setCreated(result)
              setKeys((list) => [result, ...list])
              setName('')
              setWebhookUrl('')
              setCreating(false)
            })
          }}
        >
          <input autoFocus placeholder="Nom (ex. Gestionnaire de tâches)" value={name} onChange={(e) => setName(e.target.value)} />
          <input placeholder="URL du webhook (optionnel)" value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} />
          <button type="submit" className="btn btn-outline" disabled={busy || !name.trim()}>
            <Check size={15} /> Créer
          </button>
          <button type="button" className="team-icon-btn" onClick={() => setCreating(false)} aria-label="Annuler">
            <X size={15} />
          </button>
        </form>
      ) : (
        <button type="button" className="btn btn-outline apikey-new" onClick={() => setCreating(true)}>
          <Plus size={15} /> Nouvelle clé API
        </button>
      )}
    </section>
  )
}
