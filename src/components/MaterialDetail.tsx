import { X } from 'lucide-react'
import type { Material } from '../data/materials'
import DescriptorRadar from './DescriptorRadar'
import './MaterialDetail.css'

interface MaterialDetailProps {
  material: Material
  onClose: () => void
}

export default function MaterialDetail({ material, onClose }: MaterialDetailProps) {
  const dominant = Object.entries(material.descriptors)
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)

  return (
    <div className="detail-overlay" onClick={onClose}>
      <div className="detail-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="detail-close" onClick={onClose}>
          <X size={18} />
        </button>

        <h2 className="detail-name">{material.name}</h2>
        {material.casNumber && (
          <div className="detail-meta">
            <span>CAS {material.casNumber}</span>
          </div>
        )}

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
                  {key} <strong>{value}</strong>
                </span>
              ))}
              {dominant.length === 0 && (
                <span className="detail-tags-empty">Aucun score renseigné.</span>
              )}
            </div>
          </div>
        </div>

        <MaterialRegulatorySection regulatory={material.regulatory} />
      </div>
    </div>
  )
}

function MaterialRegulatorySection({ regulatory }: { regulatory: Material['regulatory'] }) {
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

  const hasRecombiRisk = Boolean(recombi && recombi.trim().toLowerCase() !== 'no')

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

      <div className="detail-regulatory-badges">
        {isAllergen && (
          <span className="detail-badge detail-badge-warning">
            ⚠ Allergène UE{allergens.length > 0 ? ` : ${allergens.join(', ')}` : ' déclarable'}
          </span>
        )}
        {hasRecombiRisk && (
          <span className="detail-badge detail-badge-warning">⚠ Risque de cumul (Recombi)</span>
        )}
        {!isAllergen && !hasRecombiRisk && (
          <span className="detail-badge detail-badge-ok">Pas d'alerte connue</span>
        )}
      </div>

      {recombi && hasRecombiRisk && (
        <p className="detail-regulatory-note">{recombi}</p>
      )}

      {physicoChemicalIssue && (
        <p className="detail-regulatory-note">
          <strong>Stabilité :</strong> {physicoChemicalIssue}
          {triggeringConditions && ` — ${triggeringConditions}`}
          {impactResult && ` → ${impactResult}`}
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
