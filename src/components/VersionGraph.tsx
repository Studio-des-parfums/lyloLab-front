import { layoutLineage, type LineageVersion } from '../data/lineageApi'
import './VersionGraph.css'

interface Props {
  versions: LineageVersion[]
  finalVersionId: string | null
  selectedId: string | null
  onSelect: (id: string) => void
}

// Une couleur par branche, assez contrastées sur fond clair.
const LANE_COLORS = ['#c9a24a', '#5b7fbf', '#b5577a', '#3f9b8f', '#8a63c4', '#d07a3a', '#5f8f3e']
const STEP_X = 120
const LANE_Y = 64
const PAD_X = 50
const PAD_Y = 36
const R = 15

/** Graphique à branches : chaque version est un nœud relié à celle dont elle est issue. */
export default function VersionGraph({ versions, finalVersionId, selectedId, onSelect }: Props) {
  const nodes = layoutLineage(versions)
  if (nodes.length === 0) return null
  const byId = new Map(nodes.map((n) => [n.version.id, n]))
  const maxStep = Math.max(...nodes.map((n) => n.step))
  const maxLane = Math.max(...nodes.map((n) => n.lane))
  const width = PAD_X * 2 + maxStep * STEP_X
  const height = PAD_Y * 2 + maxLane * LANE_Y + 24
  const pos = (n: { step: number; lane: number }) => ({ x: PAD_X + n.step * STEP_X, y: PAD_Y + n.lane * LANE_Y })
  const color = (lane: number) => LANE_COLORS[lane % LANE_COLORS.length]

  return (
    <div className="version-graph">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Arbre des versions">
        {nodes.map((n) => {
          const parent = n.parentId ? byId.get(n.parentId) : undefined
          if (!parent) return null
          const a = pos(parent)
          const b = pos(n)
          // Courbe douce quand on change de ligne (départ d'une branche).
          const d =
            a.y === b.y
              ? `M ${a.x} ${a.y} L ${b.x} ${b.y}`
              : `M ${a.x} ${a.y} C ${a.x + STEP_X * 0.55} ${a.y}, ${b.x - STEP_X * 0.55} ${b.y}, ${b.x} ${b.y}`
          return <path key={`e-${n.version.id}`} d={d} className="vg-edge" stroke={color(n.lane)} />
        })}

        {nodes.map((n) => {
          const { x, y } = pos(n)
          const v = n.version
          const isFinal = v.id === finalVersionId
          const isSelected = v.id === selectedId
          const c = color(n.lane)
          return (
            <g
              key={v.id}
              className={`vg-node${isSelected ? ' selected' : ''}`}
              transform={`translate(${x} ${y})`}
              onClick={() => onSelect(v.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') onSelect(v.id)
              }}
            >
              <title>
                {`${v.code ?? `v${v.version}`} · ${v.status === 'completed' ? 'Finalisée' : 'Brouillon'}${isFinal ? ' · Version finale' : ''}`}
              </title>
              {isFinal && <circle r={R + 7} className="vg-final-ring" />}
              {isSelected && <circle r={R + 4} fill="none" stroke={c} strokeWidth={2} strokeDasharray="3 3" />}
              <circle
                r={R}
                fill={v.status === 'completed' ? c : '#fff'}
                stroke={c}
                strokeWidth={3}
              />
              {isFinal && (
                <path d="M -6 0 L -2 4 L 6 -5" className="vg-check" />
              )}
              <text y={R + 16} className="vg-label">
                {v.code ? v.code.split('-').slice(2).join('-') : `v${v.version}`}
              </text>
            </g>
          )
        })}
      </svg>
      <div className="vg-legend">
        <span><i className="vg-dot vg-dot-draft" /> Brouillon</span>
        <span><i className="vg-dot vg-dot-done" /> Finalisée</span>
        <span><i className="vg-dot vg-dot-final" /> Version finale</span>
        <span className="vg-legend-hint">Une couleur par branche</span>
      </div>
    </div>
  )
}
