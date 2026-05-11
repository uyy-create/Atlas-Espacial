import { Stars } from '@react-three/drei'

export function Starfield() {
  return (
    <>
      <Stars
        radius={220}
        depth={80}
        count={6000}
        factor={4}
        saturation={0}
        fade
        speed={0.4}
      />
      <Stars
        radius={120}
        depth={40}
        count={1200}
        factor={2}
        saturation={0}
        fade
        speed={0.8}
      />
    </>
  )
}
