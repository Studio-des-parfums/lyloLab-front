import './DescriptorRadar.css'

const RADIUS = 150
const PADDING = 90
const SIZE = (RADIUS + PADDING) * 2
const CENTER = SIZE / 2
const DESCRIPTOR_MAX = 9

interface DescriptorRadarProps {
  descriptors: Record<string, number>
}

export default function DescriptorRadar({ descriptors }: DescriptorRadarProps) {
  const keys = Object.keys(descriptors)
  const total = keys.length
  if (total === 0) return null

  function pointFor(index: number, value: number) {
    const angle = (Math.PI * 2 * index) / total - Math.PI / 2
    const r = (value / DESCRIPTOR_MAX) * RADIUS
    return {
      x: CENTER + r * Math.cos(angle),
      y: CENTER + r * Math.sin(angle),
    }
  }

  const vertices = keys.map((key, i) => pointFor(i, descriptors[key] ?? 0))
  const polygonPoints = vertices.map((v) => `${v.x},${v.y}`).join(' ')

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="descriptor-radar-svg">
      {[0.33, 0.66, 1].map((fraction) => {
        const r = RADIUS * fraction
        const pts = keys
          .map((_, i) => {
            const angle = (Math.PI * 2 * i) / total - Math.PI / 2
            return `${CENTER + r * Math.cos(angle)},${CENTER + r * Math.sin(angle)}`
          })
          .join(' ')
        return (
          <polygon
            key={fraction}
            points={pts}
            fill="none"
            stroke="#e3ddcd"
            strokeWidth={1}
          />
        )
      })}

      {keys.map((_, i) => {
        const angle = (Math.PI * 2 * i) / total - Math.PI / 2
        const x = CENTER + RADIUS * Math.cos(angle)
        const y = CENTER + RADIUS * Math.sin(angle)
        return (
          <line
            key={i}
            x1={CENTER}
            y1={CENTER}
            x2={x}
            y2={y}
            stroke="#e3ddcd"
            strokeWidth={0.5}
          />
        )
      })}

      <polygon
        points={polygonPoints}
        fill="#e8c874"
        fillOpacity={0.45}
        stroke="#c9a24a"
        strokeWidth={1.5}
      />

      {keys.map((key, i) => {
        const value = descriptors[key] ?? 0
        if (value === 0) return null
        const angle = (Math.PI * 2 * i) / total - Math.PI / 2
        const labelR = RADIUS + 22
        const x = CENTER + labelR * Math.cos(angle)
        const y = CENTER + labelR * Math.sin(angle)
        const cos = Math.cos(angle)
        const textAnchor = cos > 0.3 ? 'start' : cos < -0.3 ? 'end' : 'middle'
        return (
          <text
            key={key}
            x={x}
            y={y}
            textAnchor={textAnchor}
            fontSize={11}
            fill="#5c5647"
          >
            {key}
          </text>
        )
      })}
    </svg>
  )
}
