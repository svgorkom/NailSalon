import { ContactShadows, Environment, Lightformer, OrbitControls } from '@react-three/drei';
import { Canvas, type ThreeEvent } from '@react-three/fiber';
import { type Design, type Finger, FINGERS, type Finish } from '../core';

interface HandSceneProps {
  readonly design: Design;
  readonly selected: Finger | null;
  readonly onSelect: (finger: Finger) => void;
}

/** Placeholder fingers until the realistic hand model arrives (phase 2). x offset and length per finger, in scene units. */
const FINGER_LAYOUT: Readonly<Record<Finger, { x: number; length: number; tilt: number }>> = {
  thumb: { x: -1.25, length: 1.2, tilt: 0.5 },
  index: { x: -0.6, length: 1.9, tilt: 0.08 },
  middle: { x: 0, length: 2.1, tilt: 0 },
  ring: { x: 0.6, length: 1.95, tilt: -0.06 },
  little: { x: 1.15, length: 1.5, tilt: -0.14 },
};

const FINGER_RADIUS = 0.24;
const SKIN = '#e9b9a0';

const FINISH_MATERIAL: Readonly<Record<Finish, { roughness: number; metalness: number; clearcoat: number }>> = {
  gloss: { roughness: 0.25, metalness: 0, clearcoat: 1 },
  matte: { roughness: 0.85, metalness: 0, clearcoat: 0 },
  glitter: { roughness: 0.35, metalness: 0.6, clearcoat: 1 },
  metallic: { roughness: 0.3, metalness: 0.8, clearcoat: 0.6 },
  chrome: { roughness: 0.05, metalness: 1, clearcoat: 1 },
};

export function HandScene({ design, selected, onSelect }: HandSceneProps) {
  return (
    <Canvas frameloop="demand" dpr={[1, 2]} gl={{ alpha: true }} camera={{ position: [0, 1.5, 6], fov: 40 }} data-testid="hand-scene">
      <ambientLight intensity={0.3} />
      <directionalLight position={[3, 5, 4]} intensity={1.6} />
      <Environment resolution={256}>
        <Lightformer form="rect" intensity={2} position={[0, 4, 3]} scale={[6, 2, 1]} />
        <Lightformer form="rect" intensity={1} position={[-4, 1, 2]} scale={[2, 4, 1]} />
        <Lightformer form="ring" intensity={1.5} position={[4, 2, 2]} scale={2} />
      </Environment>
      <group position={[0, -1, 0]}>
        <mesh position={[0, -0.4, 0]}>
          <boxGeometry args={[2.9, 1.6, 0.6]} />
          <meshStandardMaterial color={SKIN} roughness={0.6} />
        </mesh>
        {FINGERS.map((finger) => (
          <PlaceholderFinger
            key={finger}
            finger={finger}
            design={design}
            isSelected={finger === selected}
            onSelect={onSelect}
          />
        ))}
      </group>
      <ContactShadows position={[0, -2.3, 0]} opacity={0.35} blur={2.5} scale={10} />
      <OrbitControls makeDefault enablePan={false} minDistance={3} maxDistance={10} />
    </Canvas>
  );
}

interface PlaceholderFingerProps {
  readonly finger: Finger;
  readonly design: Design;
  readonly isSelected: boolean;
  readonly onSelect: (finger: Finger) => void;
}

function PlaceholderFinger({ finger, design, isSelected, onSelect }: PlaceholderFingerProps) {
  const { x, length, tilt } = FINGER_LAYOUT[finger];
  const nail = design.nails[finger];
  const material = FINISH_MATERIAL[nail.finish];

  const select = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    onSelect(finger);
  };

  return (
    <group position={[x, 0.4, 0]} rotation={[0, 0, tilt]}>
      <mesh position={[0, length / 2, 0]} onClick={select}>
        <capsuleGeometry args={[FINGER_RADIUS, length, 8, 24]} />
        <meshStandardMaterial color={SKIN} roughness={0.6} />
      </mesh>
      <mesh position={[0, length + 0.02, FINGER_RADIUS * 0.75]} scale={[1, 1.3 + nail.length, 0.35]} onClick={select}>
        <sphereGeometry args={[FINGER_RADIUS * 0.85, 32, 16]} />
        <meshPhysicalMaterial
          color={nail.color}
          roughness={material.roughness}
          metalness={material.metalness}
          clearcoat={material.clearcoat}
          emissive={isSelected ? '#ffffff' : '#000000'}
          emissiveIntensity={isSelected ? 0.15 : 0}
        />
      </mesh>
    </group>
  );
}
