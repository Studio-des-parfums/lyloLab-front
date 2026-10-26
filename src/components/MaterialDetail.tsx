import { useEffect, useState } from 'react'
import {
  X,
  FlaskConical,
  Leaf,
  ArrowUpRight,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import {
  createMaterialStock,
  deleteMaterialStock,
  fetchMaterial,
  formatGrams,
  materialNature,
  totalStockGrams,
  updateMaterial,
  updateMaterialStock,
  type CreateMaterialStockPayload,
  type Material,
  type MaterialOrigin,
  type MaterialRecipeLine,
  type MaterialStock,
  type UpdateMaterialPayload,
} from '../data/materials'
import { FACETS } from '../data/facetMapping'
import { useFormula } from '../context/FormulaContext'
import DescriptorRadar from './DescriptorRadar'
import './MaterialDetail.css'

interface MaterialDetailProps {
  material: Material
  onClose: () => void
  onGoToFormula: (formulaId: string) => void
}

interface MaterialFormState {
  name: string
  casNumber: string
  family: string
  sensation: string
  origin: MaterialOrigin
  nature: '' | MaterialOrigin
  weight: string
  subjectivePower: string
  ifraCat4: string
  cosmeticRegulation: string
  allergens: string
  flavor: string
  flavorRestriction: string
  descriptors: Record<string, string>
  regulatoryJson: string
}

interface StockFormState {
  label: string
  supplier: string
  producer: string
  location: string
  stockGrams: string
  stockNote: string
}

const EMPTY_STOCK_FORM: StockFormState = {
  label: '',
  supplier: '',
  producer: '',
  location: '',
  stockGrams: '',
  stockNote: '',
}

function textOrNull(value: string): string | null {
  const text = value.trim()
  return text ? text : null
}

function numberOrNull(value: string): number | null {
  const text = value.trim().replace(',', '.')
  if (!text) return null
  const number = Number(text)
  return Number.isFinite(number) ? number : null
}

function formFromMaterial(material: Material): MaterialFormState {
  const descriptorKeys = [
    ...new Set([...FACETS, ...Object.keys(material.descriptors)]),
  ]
  return {
    name: material.name,
    casNumber: material.casNumber ?? '',
    family: material.family ?? '',
    sensation: material.sensation ?? '',
    origin: material.origin,
    nature: material.nature ?? '',
    weight: material.weight !== null ? String(material.weight) : '',
    subjectivePower:
      material.subjectivePower !== null ? String(material.subjectivePower) : '',
    ifraCat4: material.ifraCat4 ?? '',
    cosmeticRegulation: material.cosmeticRegulation ?? '',
    allergens: material.allergens ?? '',
    flavor: material.flavor ?? '',
    flavorRestriction: material.flavorRestriction ?? '',
    descriptors: Object.fromEntries(
      descriptorKeys.map((key) => [
        key,
        material.descriptors[key] !== undefined
          ? String(material.descriptors[key])
          : '',
      ]),
    ),
    regulatoryJson: material.regulatory
      ? JSON.stringify(material.regulatory, null, 2)
      : '',
  }
}

function buildMaterialPayload(form: MaterialFormState): UpdateMaterialPayload | null {
  const descriptors: Record<string, number> = {}
  for (const [key, rawValue] of Object.entries(form.descriptors)) {
    const value = numberOrNull(rawValue)
    if (value !== null && value > 0) descriptors[key] = value
  }

  let regulatory: UpdateMaterialPayload['regulatory'] = null
  if (form.regulatoryJson.trim()) {
    try {
      regulatory = JSON.parse(form.regulatoryJson) as UpdateMaterialPayload['regulatory']
    } catch {
      return null
    }
  }

  return {
    name: form.name.trim(),
    casNumber: textOrNull(form.casNumber),
    family: textOrNull(form.family),
    sensation: textOrNull(form.sensation),
    origin: form.origin,
    nature: form.nature === '' ? null : form.nature,
    weight: numberOrNull(form.weight),
    subjectivePower: numberOrNull(form.subjectivePower),
    ifraCat4: textOrNull(form.ifraCat4),
    cosmeticRegulation: textOrNull(form.cosmeticRegulation),
    allergens: textOrNull(form.allergens),
    flavor: textOrNull(form.flavor),
    flavorRestriction: textOrNull(form.flavorRestriction),
    descriptors,
    regulatory,
  }
}

export default function MaterialDetail({
  material: initialMaterial,
  onClose,
  onGoToFormula,
}: MaterialDetailProps) {
  const { refreshCatalog } = useFormula()
  const [material, setMaterial] = useState<Material>(initialMaterial)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<MaterialFormState>(() =>
    formFromMaterial(initialMaterial),
  )
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const [stockForm, setStockForm] = useState<StockFormState | null>(null)
  const [editingStockId, setEditingStockId] = useState<number | null>(null)
  const [stockSaving, setStockSaving] = useState(false)

  const dominant = Object.entries(material.descriptors)
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)

  const [recipe, setRecipe] = useState<{
    formulaId: string
    formulaName: string
    lines: MaterialRecipeLine[]
  } | null>(null)
  const [recipeLoading, setRecipeLoading] = useState(false)
  const [recipeError, setRecipeError] = useState<string | null>(null)

  useEffect(() => {
    if (material.origin !== 'synthetic') {
      setRecipe(null)
      return
    }

    let cancelled = false
    setRecipeLoading(true)
    setRecipeError(null)

    fetchMaterial(material.id)
      .then((detail) => {
        if (cancelled) return
        if (detail.sourceFormula) {
          setRecipe({
            formulaId: detail.sourceFormula.id,
            formulaName: detail.sourceFormula.name,
            lines: detail.sourceFormula.lines,
          })
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setRecipeError(err instanceof Error ? err.message : 'Erreur inconnue')
        }
      })
      .finally(() => {
        if (!cancelled) setRecipeLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [material.id, material.origin])

  function startEditing() {
    setForm(formFromMaterial(material))
    setActionError(null)
    setEditing(true)
  }

  async function handleSaveMaterial() {
    if (!form.name.trim()) {
      setActionError('Le nom de la matière est obligatoire.')
      return
    }

    const payload = buildMaterialPayload(form)
    if (!payload) {
      setActionError('Le JSON des données réglementaires est invalide.')
      return
    }

    setSaving(true)
    setActionError(null)
    try {
      const updated = await updateMaterial(material.id, payload)
      setMaterial(updated)
      setEditing(false)
      await refreshCatalog()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setSaving(false)
    }
  }

  function startCreateStock() {
    setEditingStockId(null)
    setStockForm(EMPTY_STOCK_FORM)
    setActionError(null)
  }

  function startEditStock(stock: MaterialStock) {
    setEditingStockId(stock.id)
    setStockForm({
      label: stock.label,
      supplier: stock.supplier ?? '',
      producer: stock.producer ?? '',
      location: stock.location ?? '',
      stockGrams: stock.stockGrams !== null ? String(stock.stockGrams) : '',
      stockNote: stock.stockNote ?? '',
    })
    setActionError(null)
  }

  async function handleSaveStock() {
    if (!stockForm) return
    if (!stockForm.label.trim()) {
      setActionError('La désignation du lot est obligatoire.')
      return
    }

    const payload: CreateMaterialStockPayload = {
      label: stockForm.label.trim(),
      supplier: textOrNull(stockForm.supplier),
      producer: textOrNull(stockForm.producer),
      location: textOrNull(stockForm.location),
      stockGrams: numberOrNull(stockForm.stockGrams),
      stockNote: textOrNull(stockForm.stockNote),
    }

    setStockSaving(true)
    setActionError(null)
    try {
      const updated =
        editingStockId === null
          ? await createMaterialStock(material.id, payload)
          : await updateMaterialStock(material.id, editingStockId, payload)
      setMaterial(updated)
      setStockForm(null)
      setEditingStockId(null)
      await refreshCatalog()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setStockSaving(false)
    }
  }

  async function handleDeleteStock(stock: MaterialStock) {
    if (!window.confirm(`Supprimer le lot "${stock.label}" ?`)) return

    setStockSaving(true)
    setActionError(null)
    try {
      const updated = await deleteMaterialStock(material.id, stock.id)
      setMaterial(updated)
      if (editingStockId === stock.id) {
        setEditingStockId(null)
        setStockForm(null)
      }
      await refreshCatalog()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setStockSaving(false)
    }
  }

  return (
    <div className="detail-overlay" onClick={onClose}>
      <div className="detail-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="detail-close" onClick={onClose}>
          <X size={18} />
        </button>

        {editing ? (
          <MaterialEditForm
            form={form}
            setForm={setForm}
            saving={saving}
            error={actionError}
            onSave={handleSaveMaterial}
            onCancel={() => {
              setEditing(false)
              setActionError(null)
            }}
          />
        ) : (
          <>
            <div className="detail-header-row">
              <h2 className="detail-name">{material.name}</h2>
              <button
                type="button"
                className="detail-edit-toggle"
                onClick={startEditing}
              >
                <Pencil size={14} /> Modifier
              </button>
            </div>

            <div className="detail-meta">
              {material.casNumber && <span>CAS {material.casNumber}</span>}
              {materialNature(material) === 'synthetic' ? (
                <span className="detail-origin-tag detail-origin-synthetic">
                  <FlaskConical size={13} /> Synthétique
                </span>
              ) : (
                <span className="detail-origin-tag detail-origin-natural">
                  <Leaf size={13} /> Naturelle
                </span>
              )}
            </div>

            {material.sensation && (
              <p className="detail-sensation">{material.sensation}</p>
            )}

            <div className="detail-body">
              <DescriptorRadar descriptors={material.descriptors} />

              <div className="detail-tags">
                <h4>Descripteurs dominants</h4>
                <div className="detail-tags-list">
                  {dominant.map(([key, value]) => (
                    <span key={key} className="detail-tag">
                      {key} <strong>{Math.round(value * 100) / 100}</strong>
                    </span>
                  ))}
                  {dominant.length === 0 && (
                    <span className="detail-tags-empty">
                      Aucun score renseigné.
                    </span>
                  )}
                </div>
              </div>
            </div>

            <MaterialLabInfoSection material={material} />
          </>
        )}

        <MaterialStockSection
          material={material}
          stockForm={stockForm}
          editingStockId={editingStockId}
          saving={stockSaving}
          setStockForm={setStockForm}
          onStartCreate={startCreateStock}
          onStartEdit={startEditStock}
          onCancel={(() => {
            setStockForm(null)
            setEditingStockId(null)
            setActionError(null)
          })}
          onSave={handleSaveStock}
          onDelete={handleDeleteStock}
          error={editing ? null : actionError}
        />

        {material.origin === 'synthetic' && (
          <div className="detail-recipe">
            <div className="detail-recipe-header">
              <h4>Formule de reconstitution</h4>
              {recipe && (
                <button
                  type="button"
                  className="detail-recipe-link"
                  onClick={() => onGoToFormula(recipe.formulaId)}
                >
                  Voir la formule <ArrowUpRight size={14} />
                </button>
              )}
            </div>
            {recipeLoading && (
              <p className="detail-tags-empty">Chargement de la formule...</p>
            )}
            {recipeError && (
              <p className="detail-tags-empty">
                Impossible de charger la formule : {recipeError}
              </p>
            )}
            {!recipeLoading && !recipeError && !recipe && (
              <p className="detail-tags-empty">
                La formule d'origine n'existe plus.
              </p>
            )}
            {recipe && (
              <table className="detail-recipe-table">
                <thead>
                  <tr>
                    <th>Matière première</th>
                    <th>%</th>
                  </tr>
                </thead>
                <tbody>
                  {recipe.lines.map((line) => (
                    <tr key={line.material.id}>
                      <td>{line.material.name}</td>
                      <td>{line.quantity.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        <MaterialRegulatorySection
          regulatory={material.regulatory}
          isSynthetic={material.origin === 'synthetic'}
        />
      </div>
    </div>
  )
}

function MaterialEditForm({
  form,
  setForm,
  saving,
  error,
  onSave,
  onCancel,
}: {
  form: MaterialFormState
  setForm: React.Dispatch<React.SetStateAction<MaterialFormState>>
  saving: boolean
  error: string | null
  onSave: () => void
  onCancel: () => void
}) {
  function set<K extends keyof MaterialFormState>(
    key: K,
    value: MaterialFormState[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function setDescriptor(key: string, value: string) {
    setForm((prev) => ({
      ...prev,
      descriptors: { ...prev.descriptors, [key]: value },
    }))
  }

  return (
    <div className="detail-edit-form">
      <h2 className="detail-edit-title">Modifier la matière première</h2>

      <div className="detail-edit-grid">
        <label className="detail-edit-field">
          Nom *
          <input
            type="text"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
          />
        </label>
        <label className="detail-edit-field">
          CAS
          <input
            type="text"
            value={form.casNumber}
            onChange={(e) => set('casNumber', e.target.value)}
          />
        </label>
        <label className="detail-edit-field">
          Famille
          <input
            type="text"
            value={form.family}
            onChange={(e) => set('family', e.target.value)}
          />
        </label>
        <label className="detail-edit-field">
          Origine (catalogue / formule)
          <select
            value={form.origin}
            onChange={(e) => set('origin', e.target.value as MaterialOrigin)}
          >
            <option value="natural">Naturelle</option>
            <option value="synthetic">Synthétique</option>
          </select>
        </label>
        <label className="detail-edit-field">
          Nature chimique
          <select
            value={form.nature}
            onChange={(e) =>
              set('nature', e.target.value as '' | MaterialOrigin)
            }
          >
            <option value="">Non renseignée</option>
            <option value="natural">Naturelle</option>
            <option value="synthetic">Synthétique</option>
          </select>
        </label>
        <label className="detail-edit-field">
          Poids
          <input
            type="number"
            step="any"
            value={form.weight}
            onChange={(e) => set('weight', e.target.value)}
          />
        </label>
        <label className="detail-edit-field">
          Puissance subjective
          <input
            type="number"
            step="any"
            value={form.subjectivePower}
            onChange={(e) => set('subjectivePower', e.target.value)}
          />
        </label>
      </div>

      <label className="detail-edit-field">
        Sensation
        <textarea
          rows={2}
          value={form.sensation}
          onChange={(e) => set('sensation', e.target.value)}
        />
      </label>

      <div className="detail-edit-section">
        <h4>Descripteurs olfactifs (0 à 9)</h4>
        <div className="detail-edit-descriptors">
          {Object.keys(form.descriptors).map((facet) => (
            <label key={facet} className="detail-edit-field">
              {facet}
              <input
                type="number"
                min="0"
                max="9"
                step="0.1"
                value={form.descriptors[facet]}
                onChange={(e) => setDescriptor(facet, e.target.value)}
              />
            </label>
          ))}
        </div>
      </div>

      <div className="detail-edit-section">
        <h4>Informations laboratoire</h4>
        <div className="detail-edit-grid">
          <label className="detail-edit-field detail-edit-field-wide">
            IFRA Cat. 4
            <textarea
              rows={2}
              value={form.ifraCat4}
              onChange={(e) => set('ifraCat4', e.target.value)}
            />
          </label>
          <label className="detail-edit-field detail-edit-field-wide">
            Règlement cosmétique
            <textarea
              rows={2}
              value={form.cosmeticRegulation}
              onChange={(e) => set('cosmeticRegulation', e.target.value)}
            />
          </label>
          <label className="detail-edit-field detail-edit-field-wide">
            Allergènes
            <textarea
              rows={2}
              value={form.allergens}
              onChange={(e) => set('allergens', e.target.value)}
            />
          </label>
          <label className="detail-edit-field">
            Flavor
            <textarea
              rows={2}
              value={form.flavor}
              onChange={(e) => set('flavor', e.target.value)}
            />
          </label>
          <label className="detail-edit-field">
            Restriction flavor
            <textarea
              rows={2}
              value={form.flavorRestriction}
              onChange={(e) => set('flavorRestriction', e.target.value)}
            />
          </label>
        </div>
      </div>

      <label className="detail-edit-field">
        Données réglementaires (JSON)
        <textarea
          rows={6}
          spellCheck={false}
          value={form.regulatoryJson}
          onChange={(e) => set('regulatoryJson', e.target.value)}
        />
      </label>

      {error && <p className="detail-edit-error">{error}</p>}

      <div className="detail-edit-actions">
        <button
          type="button"
          className="detail-save-button"
          disabled={saving}
          onClick={onSave}
        >
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
        <button
          type="button"
          className="detail-cancel-button"
          onClick={onCancel}
        >
          Annuler
        </button>
      </div>
    </div>
  )
}

function MaterialStockSection({
  material,
  stockForm,
  editingStockId,
  saving,
  setStockForm,
  onStartCreate,
  onStartEdit,
  onCancel,
  onSave,
  onDelete,
  error,
}: {
  material: Material
  stockForm: StockFormState | null
  editingStockId: number | null
  saving: boolean
  setStockForm: React.Dispatch<React.SetStateAction<StockFormState | null>>
  onStartCreate: () => void
  onStartEdit: (stock: MaterialStock) => void
  onCancel: () => void
  onSave: () => void
  onDelete: (stock: MaterialStock) => void
  error: string | null
}) {
  const total = totalStockGrams(material)

  function setField<K extends keyof StockFormState>(
    key: K,
    value: StockFormState[K],
  ) {
    setStockForm((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  return (
    <div className="detail-recipe">
      <div className="detail-recipe-header">
        <h4>Stock au labo</h4>
        <div className="detail-stock-header-actions">
          {total !== null && (
            <span className="detail-stock-total">Total : {formatGrams(total)}</span>
          )}
          {!stockForm && (
            <button
              type="button"
              className="detail-recipe-link"
              onClick={onStartCreate}
            >
              <Plus size={14} /> Ajouter un lot
            </button>
          )}
        </div>
      </div>

      {material.stocks.length === 0 ? (
        <p className="detail-tags-empty">Aucun lot en stock.</p>
      ) : (
        <table className="detail-recipe-table">
          <thead>
            <tr>
              <th>Désignation</th>
              <th>Fournisseur</th>
              <th>Producteur</th>
              <th>Emplacement</th>
              <th>Stock</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {material.stocks.map((stock) => (
              <tr key={stock.id}>
                <td>{stock.label}</td>
                <td>{stock.supplier ?? '—'}</td>
                <td>{stock.producer ?? '—'}</td>
                <td>{stock.location ?? '—'}</td>
                <td>
                  {stock.stockGrams !== null
                    ? formatGrams(stock.stockGrams)
                    : (stock.stockNote ?? '—')}
                </td>
                <td>
                  <div className="detail-stock-actions">
                    <button
                      type="button"
                      className="detail-icon-button"
                      onClick={() => onStartEdit(stock)}
                      aria-label="Modifier le lot"
                      title="Modifier le lot"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      className="detail-icon-button detail-icon-button-danger"
                      onClick={() => onDelete(stock)}
                      disabled={saving}
                      aria-label="Supprimer le lot"
                      title="Supprimer le lot"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {stockForm && (
        <div className="detail-stock-form">
          <h5>
            {editingStockId === null ? 'Nouveau lot' : 'Modifier le lot'}
          </h5>
          <div className="detail-edit-grid">
            <label className="detail-edit-field">
              Désignation *
              <input
                type="text"
                value={stockForm.label}
                onChange={(e) => setField('label', e.target.value)}
              />
            </label>
            <label className="detail-edit-field">
              Fournisseur
              <input
                type="text"
                value={stockForm.supplier}
                onChange={(e) => setField('supplier', e.target.value)}
              />
            </label>
            <label className="detail-edit-field">
              Producteur
              <input
                type="text"
                value={stockForm.producer}
                onChange={(e) => setField('producer', e.target.value)}
              />
            </label>
            <label className="detail-edit-field">
              Emplacement
              <input
                type="text"
                value={stockForm.location}
                onChange={(e) => setField('location', e.target.value)}
              />
            </label>
            <label className="detail-edit-field">
              Stock (grammes)
              <input
                type="number"
                min="0"
                step="any"
                value={stockForm.stockGrams}
                onChange={(e) => setField('stockGrams', e.target.value)}
              />
            </label>
            <label className="detail-edit-field">
              Note de stock
              <input
                type="text"
                placeholder="ex : Vide, 2*500g"
                value={stockForm.stockNote}
                onChange={(e) => setField('stockNote', e.target.value)}
              />
            </label>
          </div>
          {error && <p className="detail-edit-error">{error}</p>}
          <div className="detail-edit-actions">
            <button
              type="button"
              className="detail-save-button"
              disabled={saving}
              onClick={onSave}
            >
              {saving ? 'Enregistrement...' : 'Enregistrer le lot'}
            </button>
            <button
              type="button"
              className="detail-cancel-button"
              onClick={onCancel}
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function MaterialLabInfoSection({ material }: { material: Material }) {
  const rows = (
    [
      ['IFRA Cat. 4 (fiche labo)', material.ifraCat4],
      ['Règlement cosmétique', material.cosmeticRegulation],
      ['Allergènes', material.allergens],
      ['Flavor', material.flavor],
      ['Restriction flavor', material.flavorRestriction],
    ] as [string, string | null][]
  ).filter(([, value]) => Boolean(value))

  if (rows.length === 0) return null

  return (
    <div className="detail-regulatory">
      <h4>Informations laboratoire</h4>
      <dl className="detail-regulatory-grid">
        {rows.map(([label, value]) => (
          <div key={label} className="detail-regulatory-row">
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function MaterialRegulatorySection({
  regulatory,
  isSynthetic,
}: {
  regulatory: Material['regulatory']
  isSynthetic: boolean
}) {
  if (!regulatory) return null

  const {
    ifraLimit,
    rciiiRestriction,
    isAllergen,
    allergens = [],
    recombi,
    physicoChemicalIssue,
    triggeringConditions,
    impactResult,
    usaMocra,
    californiaProp65,
    chinaCsar,
    menaGso,
  } = regulatory

  const hasRecombiRisk = Boolean(
    recombi && recombi.trim().toLowerCase() !== 'no',
  )

  const rows: [string, string | undefined][] = [
    ['Limite IFRA (Cat. 4)', ifraLimit],
    ['Restriction RCIII', rciiiRestriction],
    ['USA (MoCRA)', usaMocra],
    ['Californie (Prop 65 / CFFIRKA)', californiaProp65],
    ['Chine (CSAR)', chinaCsar],
    ['MENA (GSO 1943)', menaGso],
  ].filter(([, value]) => Boolean(value)) as [string, string][]

  return (
    <div className="detail-regulatory">
      <h4>Conformité &amp; stabilité</h4>

      {isSynthetic && (
        <p className="detail-regulatory-disclaimer">
          Données calculées à partir des matières premières de la formule de
          reconstitution (limite IFRA la plus restrictive, allergènes cumulés).
        </p>
      )}

      <div className="detail-regulatory-badges">
        {isAllergen && (
          <span className="detail-badge detail-badge-warning">
            ⚠ Allergène UE
            {allergens.length > 0 ? ` : ${allergens.join(', ')}` : ' déclarable'}
          </span>
        )}
        {hasRecombiRisk && (
          <span className="detail-badge detail-badge-warning">
            ⚠ Risque de cumul (Recombi)
          </span>
        )}
        {!isAllergen && !hasRecombiRisk && (
          <span className="detail-badge detail-badge-ok">
            Pas d'alerte connue
          </span>
        )}
      </div>

      {recombi && hasRecombiRisk && (
        <p className="detail-regulatory-note">{recombi}</p>
      )}

      {physicoChemicalIssue && (
        <p className="detail-regulatory-note">
          <strong>Stabilité :</strong> {physicoChemicalIssue}
        </p>
      )}
      {triggeringConditions && (
        <p className="detail-regulatory-note">
          <strong>Conditions déclenchantes :</strong> {triggeringConditions}
        </p>
      )}
      {impactResult && (
        <p className="detail-regulatory-note">
          <strong>Impact :</strong> {impactResult}
        </p>
      )}

      {rows.length > 0 && (
        <dl className="detail-regulatory-grid">
          {rows.map(([label, value]) => (
            <div key={label} className="detail-regulatory-row">
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  )
}
