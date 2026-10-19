import { useRef } from 'react'
import { FACETS } from '../data/facetMapping'
import { FACET_DISPLAY } from '../data/facetDisplay'
import { useFormula } from '../context/FormulaContext'
import './OlfactiveRadar.css'

const SIZE = 360
const CENTER = SIZE / 2
const RADIUS = 110
const LEVELS = 5

function pointOnAxis(index: number, total: number, value: number) {
  const angle = (Math.PI * 2 * index) / total - Math.PI / 2
  const r = (value / 100) * RADIUS
  return {
    x: CENTER + r * Math.cos(angle),
    y: CENTER + r * Math.sin(angle),
    angle,
  }
}

export default function OlfactiveRadar() {
  const { facets, setFacetValue } = useFormula()
  const svgRef = useRef<SVGSVGElement>(null)
  const draggingIndex = useRef<number | null>(null)
  const total = FACETS.length

  function valueFromPointer(clientX: number, clientY: number, index: number) {
    const svg = svgRef.current
    if (!svg) return null
    const rect = svg.getBoundingClientRect()
    const scale = SIZE / rect.width
    const x = (clientX - rect.left) * scale
    const y = (clientY - rect.top) * scale

    const angle = (Math.PI * 2 * index) / total - Math.PI / 2
    const axisX = Math.cos(angle)
    const axisY = Math.sin(angle)

    const dx = x - CENTER
    const dy = y - CENTER
    const projection = dx * axisX + dy * axisY

    const value = Math.round((projection / RADIUS) * 100)
    return Math.min(100, Math.max(0, value))
  }

  function updateValue(index: number, clientX: number, clientY: number) {
    const value = valueFromPointer(clientX, clientY, index)
    if (value === null) return
    setFacetValue(FACETS[index], value)
  }

  function handlePointerDown(index: number) {
    return (e: React.PointerEvent) => {
      e.preventDefault()
      draggingIndex.current = index
      ;(e.target as Element).setPointerCapture?.(e.pointerId)
    }
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (draggingIndex.current === null) return
    updateValue(draggingIndex.current, e.clientX, e.clientY)
  }

  function handlePointerUp() {
    draggingIndex.current = null
  }

  const values = FACETS.map((f) => facets[f])
  const vertices = values.map((v, i) => pointOnAxis(i, total, v))
  const polygonPoints = vertices.map((v) => `${v.x},${v.y}`).join(' ')

  return (
    <div className="radar-wrapper">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="radar-svg"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {/* grid levels */}
        {Array.from({ length: LEVELS }).map((_, levelIndex) => {
          const r = (RADIUS * (levelIndex + 1)) / LEVELS
          const pts = FACETS.map((_, i) => {
            const angle = (Math.PI * 2 * i) / total - Math.PI / 2
            return `${CENTER + r * Math.cos(angle)},${CENTER + r * Math.sin(angle)}`
          }).join(' ')
          return (
            <polygon
              key={levelIndex}
              points={pts}
              fill="none"
              stroke="#e3ddcd"
              strokeWidth={1}
            />
          )
        })}

        {/* axes */}
        {FACETS.map((_, i) => {
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
              strokeWidth={1}
            />
          )
        })}

        {/* data polygon */}
        <polygon
          points={polygonPoints}
          fill="#e8c874"
          fillOpacity={0.45}
          stroke="#c9a24a"
          strokeWidth={2}
        />

        {/* draggable points */}
        {vertices.map((v, i) => (
          <circle
            key={i}
            cx={v.x}
            cy={v.y}
            r={7}
            fill="#c9a24a"
            stroke="#fff"
            strokeWidth={2}
            className="radar-point"
            onPointerDown={handlePointerDown(i)}
          />
        ))}

        {/* labels: facet name, emoji and value placed outside the circle */}
        {FACETS.map((facet, i) => {
          const angle = (Math.PI * 2 * i) / total - Math.PI / 2
          const labelR = RADIUS + 34
          const x = CENTER + labelR * Math.cos(angle)
          const y = CENTER + labelR * Math.sin(angle)
          const cos = Math.cos(angle)
          const textAnchor = cos > 0.3 ? 'start' : cos < -0.3 ? 'end' : 'middle'
          const display = FACET_DISPLAY[facet]

          return (
            <g key={i} className="radar-label">
              <text
                x={x}
                y={y - 10}
                textAnchor={textAnchor}
                fontSize={11}
                fill="#3a362c"
              >
                {i + 1}. {facet}
              </text>
              <text x={x} y={y + 8} textAnchor={textAnchor} fontSize={16}>
                {display.emoji}
              </text>
              <text
                x={x}
                y={y + 24}
                textAnchor={textAnchor}
                fontSize={11}
                fontWeight={600}
                fill={display.color}
              >
                {values[i]}%
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
