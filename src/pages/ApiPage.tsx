import { Plug } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { API_URL } from '../data/api'
import ApiKeysSection from '../components/ApiKeysSection'
import './TeamPage.css'
import './ApiPage.css'

const BASE = `${API_URL}/api/v1`

const CREATE_EXAMPLE = `curl -X POST ${BASE}/formulation-requests \\
  -H "X-Api-Key: lylo_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "externalRef": "task-42",
    "requesterName": "Camille Martin",
    "requesterEmail": "camille@exemple.fr",
    "perfumeName": "Soleil d'hiver",
    "description": "Un ambré solaire, sillage modéré, budget 80 €/kg",
    "forClient": true,
    "clientCompany": "Maison Exemple",
    "projectName": "Collection 2027"
  }'`

const REQUEST_OBJECT = `{
  "id": "6f1c…",
  "externalRef": "task-42",
  "status": "in_progress",
  "perfumeName": "Soleil d'hiver",
  "description": "Un ambré solaire…",
  "requester": { "name": "Camille Martin", "email": "camille@exemple.fr" },
  "forClient": true,
  "client": { "company": "Maison Exemple", "firstName": null, "lastName": null },
  "projectName": "Collection 2027",
  "createdAt": "2026-11-17T10:00:00.000Z",
  "updatedAt": "2026-11-17T10:05:00.000Z",
  "assignedTo": { "name": "Dwain", "email": "…" },
  "assignedAt": "2026-11-17T10:05:00.000Z",
  "completedBy": null,
  "completedAt": null
}`

const WEBHOOK_BODY = `{
  "id": "b7e2…",            // identifiant unique de la livraison
  "event": "formulation_request.completed",
  "createdAt": "2026-11-20T16:30:00.000Z",
  "data": { …la demande, même format que l'API… }
}`

const VERIFY_EXAMPLE = `import { createHmac, timingSafeEqual } from 'node:crypto'

// rawBody : le corps brut de la requête, AVANT tout JSON.parse
function verifyLyloSignature(rawBody, header, secret) {
  const { t, v1 } = Object.fromEntries(header.split(',').map((p) => p.split('=')))
  // Refuse les messages de plus de 5 minutes (protection contre le rejeu)
  if (Math.abs(Date.now() / 1000 - Number(t)) > 300) return false
  const expected = createHmac('sha256', secret).update(\`\${t}.\${rawBody}\`).digest('hex')
  return expected.length === v1.length && timingSafeEqual(Buffer.from(expected), Buffer.from(v1))
}`

const ENDPOINTS: { method: string; path: string; desc: string }[] = [
  { method: 'GET', path: '/ping', desc: 'Vérifie que la clé fonctionne. Renvoie { ok: true, apiKey: "<nom>" }.' },
  { method: 'POST', path: '/formulation-requests', desc: 'Crée une demande de formulation. Renvoie la demande (statut pending).' },
  { method: 'GET', path: '/formulation-requests', desc: 'Liste les demandes envoyées avec cette clé (200 max, les plus récentes d\'abord). Filtre optionnel : ?status=pending' },
  { method: 'GET', path: '/formulation-requests/:id', desc: 'Détail d\'une demande envoyée avec cette clé.' },
  { method: 'POST', path: '/formulation-requests/:id/cancel', desc: 'Annule une demande. Possible uniquement tant qu\'elle est en attente (sinon 409).' },
]

const FIELDS: { name: string; required?: boolean; desc: string }[] = [
  { name: 'requesterName', required: true, desc: 'Nom de la personne qui fait la demande.' },
  { name: 'requesterEmail', required: true, desc: 'Son e-mail.' },
  { name: 'description', required: true, desc: 'Tout ce que le parfumeur doit savoir : ambiance, notes, contraintes, budget… (20 000 caractères max).' },
  { name: 'externalRef', desc: 'Votre identifiant (ex. numéro de tâche), renvoyé dans l\'API et les webhooks.' },
  { name: 'perfumeName', desc: 'Nom du parfum souhaité.' },
  { name: 'projectName', desc: 'Nom du projet chez le client.' },
  { name: 'forClient', desc: 'true si la demande concerne un client. Il faut alors clientCompany ou clientLastName.' },
  { name: 'clientCompany, clientFirstName, clientLastName, clientEmail, clientPhone', desc: 'Coordonnées du client, ignorées si forClient vaut false.' },
]

const STATUSES: { name: string; desc: string }[] = [
  { name: 'pending', desc: 'Reçue, personne ne s\'en occupe encore. Seul statut où l\'annulation est possible.' },
  { name: 'in_progress', desc: 'Un parfumeur l\'a prise en charge : une formule est en cours.' },
  { name: 'completed', desc: 'Une version de la formule a été désignée comme finale.' },
  { name: 'cancelled', desc: 'Annulée par la plateforme via l\'API.' },
]

const EVENTS: { name: string; desc: string }[] = [
  { name: 'formulation_request.taken', desc: 'Un parfumeur prend la demande en charge (statut in_progress).' },
  { name: 'formulation_request.started', desc: 'Le parfumeur commence à travailler sur la formule.' },
  { name: 'formulation_request.completed', desc: 'La version finale de la formule est choisie : la demande est terminée.' },
]

const ERRORS: { code: string; desc: string }[] = [
  { code: '400', desc: 'Corps invalide (champ manquant, e-mail incorrect…). Le message détaille le problème.' },
  { code: '401', desc: 'Clé absente, invalide ou révoquée.' },
  { code: '404', desc: 'Demande introuvable, ou envoyée avec une autre clé.' },
  { code: '409', desc: 'Action impossible dans l\'état actuel (ex. annuler une demande déjà prise).' },
  { code: '429', desc: 'Plus de 60 requêtes par minute avec cette clé. Attendez le délai indiqué par Retry-After.' },
]

const SECTIONS = [
  ['keys', 'Clés API'],
  ['start', 'Démarrage'],
  ['endpoints', 'Endpoints'],
  ['create', 'Créer une demande'],
  ['lifecycle', 'Statuts'],
  ['webhooks', 'Webhooks'],
  ['errors', 'Erreurs & limites'],
] as const

export default function ApiPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  return (
    <div className="team-page api-page">
      <header className="team-header">
        <h1>
          <Plug size={22} /> API &amp; documentation
        </h1>
        <p>
          Connectez une autre plateforme (gestionnaire de tâches, CRM…) pour envoyer des demandes de
          formulation à Lylo-Lab et suivre leur avancement.
        </p>
      </header>

      <nav className="api-toc" aria-label="Sommaire">
        {SECTIONS.map(([id, label]) => (
          <a key={id} href={`#api-${id}`}>
            {label}
          </a>
        ))}
      </nav>

      <div id="api-keys">
        {isAdmin ? (
          <ApiKeysSection />
        ) : (
          <section className="team-card">
            <h2>Clés API &amp; webhooks</h2>
            <p className="team-card-hint">
              Seul un administrateur de l'équipe peut créer ou révoquer des clés API. Demandez-lui
              d'en générer une pour votre plateforme.
            </p>
          </section>
        )}
      </div>

      <section className="team-card api-doc" id="api-start">
        <h2>Démarrage</h2>
        <p>
          Toutes les routes sont sous <code>{BASE}</code>. Chaque requête doit porter la clé dans le
          header <code>X-Api-Key</code>. Une clé n'a accès qu'aux demandes qu'elle a elle-même créées.
        </p>
        <pre>{`curl ${BASE}/ping -H "X-Api-Key: lylo_live_..."`}</pre>
        <p className="api-note">
          La clé n'est affichée qu'une seule fois, à sa création. Gardez-la côté serveur : ne
          l'exposez jamais dans un navigateur ou une application mobile.
        </p>
      </section>

      <section className="team-card api-doc" id="api-endpoints">
        <h2>Endpoints</h2>
        <table className="api-table">
          <tbody>
            {ENDPOINTS.map((e) => (
              <tr key={e.method + e.path}>
                <td className="api-endpoint">
                  <span className={`api-method api-method-${e.method.toLowerCase()}`}>{e.method}</span>
                  <code>{e.path}</code>
                </td>
                <td>{e.desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="team-card api-doc" id="api-create">
        <h2>Créer une demande</h2>
        <pre>{CREATE_EXAMPLE}</pre>
        <table className="api-table">
          <tbody>
            {FIELDS.map((f) => (
              <tr key={f.name}>
                <td>
                  <code>{f.name}</code>
                  {f.required && <span className="api-required">requis</span>}
                </td>
                <td>{f.desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p>Toutes les routes renvoient la demande sous cette forme :</p>
        <pre>{REQUEST_OBJECT}</pre>
      </section>

      <section className="team-card api-doc" id="api-lifecycle">
        <h2>Statuts d'une demande</h2>
        <p className="api-flow">
          <code>pending</code> → <code>in_progress</code> → <code>completed</code>
          <span> · ou </span>
          <code>pending</code> → <code>cancelled</code>
        </p>
        <table className="api-table">
          <tbody>
            {STATUSES.map((s) => (
              <tr key={s.name}>
                <td>
                  <code>{s.name}</code>
                </td>
                <td>{s.desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="team-card api-doc" id="api-webhooks">
        <h2>Webhooks</h2>
        <p>
          Si la clé a une URL de webhook, Lylo-Lab y envoie un <code>POST</code> JSON à chaque étape
          de la demande. Inutile d'interroger l'API en boucle.
        </p>
        <table className="api-table">
          <tbody>
            {EVENTS.map((e) => (
              <tr key={e.name}>
                <td>
                  <code>{e.name}</code>
                </td>
                <td>{e.desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <pre>{WEBHOOK_BODY}</pre>

        <h3>Headers</h3>
        <ul className="api-list">
          <li>
            <code>X-Lylo-Event</code> : le type d'événement.
          </li>
          <li>
            <code>X-Lylo-Delivery</code> : identifiant unique de la livraison. Servez-vous-en pour
            ignorer un message déjà traité.
          </li>
          <li>
            <code>X-Lylo-Signature</code> : <code>t=&lt;timestamp&gt;,v1=&lt;signature&gt;</code>.
          </li>
        </ul>

        <h3>Vérifier la signature</h3>
        <p>
          <code>v1</code> est un HMAC-SHA256, calculé avec le secret de signature de la clé, sur la
          chaîne <code>{'${t}.${corps brut}'}</code>. Vérifiez-la avant de faire confiance au message :
        </p>
        <pre>{VERIFY_EXAMPLE}</pre>

        <h3>Réponse et nouvelles tentatives</h3>
        <p>
          Répondez par un code 2xx en moins de 5 secondes. En cas d'erreur 5xx, 408, 429 ou de
          problème réseau, Lylo-Lab réessaie après 2 s puis 10 s (3 tentatives au total). Les autres
          codes 4xx ne sont pas retentés. Les redirections ne sont pas suivies. Si tous les envois
          échouent, l'état reste consultable via <code>GET /formulation-requests/:id</code>.
        </p>
      </section>

      <section className="team-card api-doc" id="api-errors">
        <h2>Erreurs &amp; limites</h2>
        <p>
          Les erreurs renvoient un JSON avec un champ <code>message</code>. Limite : 60 requêtes par
          minute et par clé.
        </p>
        <table className="api-table">
          <tbody>
            {ERRORS.map((e) => (
              <tr key={e.code}>
                <td>
                  <code>{e.code}</code>
                </td>
                <td>{e.desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}
