import { SlidersHorizontal, FlaskConical, Beaker, ArrowRight } from 'lucide-react'
import './FormulationIntro.css'

interface FormulationIntroProps {
  onStart: () => void
}

const STEPS = [
  {
    icon: SlidersHorizontal,
    title: 'Réglez les 7 facettes de la parfumerie',
    description:
      'Ajustez les curseurs du radar olfactif selon vos goûts : plus de Floralité si vous aimez, moins de Boisé si vous n\'aimez pas. Les Ajustements rapides affinent ensuite la diffusion, la tenue, la puissance, la douceur et l\'originalité.',
  },
  {
    icon: FlaskConical,
    title: 'Choisissez vos matières premières favorites',
    description:
      'Parcourez le catalogue et ajoutez les notes que vous préférez à votre sélection — chacune a un profil olfactif réel qui influence le résultat final.',
  },
  {
    icon: Beaker,
    title: 'Obtenez votre formule indicative',
    description:
      'Le dosage de chaque matière première (en %) est calculé automatiquement selon vos préférences et vos matières choisies — vous pouvez ajuster à tout moment.',
  },
]

export default function FormulationIntro({ onStart }: FormulationIntroProps) {
  return (
    <div className="formulation-intro">
      <div className="formulation-intro-hero">
        <h1>Concevoir une formule sur mesure</h1>
        <p>
          Composez un accord unique en exprimant vos préférences olfactives.
          Voici comment se déroule la conception d'une formule.
        </p>
      </div>

      <div className="formulation-intro-steps">
        {STEPS.map((step, i) => (
          <div key={step.title} className="formulation-intro-step">
            <div className="formulation-intro-step-number">{i + 1}</div>
            <div className="formulation-intro-step-icon">
              <step.icon size={22} />
            </div>
            <h3>{step.title}</h3>
            <p>{step.description}</p>
          </div>
        ))}
      </div>

      <button type="button" className="formulation-intro-cta" onClick={onStart}>
        Créer une formule
        <ArrowRight size={18} />
      </button>
    </div>
  )
}
