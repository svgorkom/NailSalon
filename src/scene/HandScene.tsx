import { ContactShadows, Environment, Lightformer, OrbitControls } from '@react-three/drei';
import { Canvas, type ThreeEvent, useThree } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import { CanvasTexture, DoubleSide, PlaneGeometry, SRGBColorSpace } from 'three';
import { type Design, type Finger, FINGERS, type Finish } from '../core';
import { SCENE_LIGHT, type Theme } from '../ui/theme';
import type { NailPaint } from './nailPaint';

interface HandSceneProps {
  readonly design: Design;
  readonly selected: Finger | null;
  readonly theme: Theme;
  /** Base colour of the skin. */
  readonly skin: string;
  /** Holds the texture of each nail: base colour, drawing and stickers. */
  readonly paint: NailPaint;
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

/** Placeholder nail plate: it follows the curve of the finger. Its UV covers the nail texture: top is the free edge. */
const NAIL_WIDTH = 0.4;

function createNailPlate(): PlaneGeometry {
  const plate = new PlaneGeometry(NAIL_WIDTH, 1, 12, 16);
  const position = plate.getAttribute('position');
  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index);
    position.setZ(index, Math.sqrt(FINGER_RADIUS ** 2 - x ** 2) + 0.015);
  }
  plate.computeVertexNormals();
  return plate;
}

const FINISH_MATERIAL: Readonly<Record<Finish, { roughness: number; metalness: number; clearcoat: number }>> = {
  gloss: { roughness: 0.25, metalness: 0, clearcoat: 1 },
  matte: { roughness: 0.85, metalness: 0, clearcoat: 0 },
  glitter: { roughness: 0.35, metalness: 0.6, clearcoat: 1 },
  metallic: { roughness: 0.3, metalness: 0.8, clearcoat: 0.6 },
  chrome: { roughness: 0.05, metalness: 1, clearcoat: 1 },
};

export function HandScene({ design, selected, theme, skin, paint, onSelect }: HandSceneProps) {
  return (
    <Canvas frameloop="demand" dpr={[1, 2]} gl={{ alpha: true }} camera={{ position: [0, 1.5, 6], fov: 40 }} data-testid="hand-scene">
      <ambientLight intensity={0.3} color={SCENE_LIGHT[theme].sky} />
      <directionalLight position={[3, 5, 4]} intensity={1.6} color={SCENE_LIGHT[theme].sun} />
      <Environment resolution={256}>
        <Lightformer form="rect" intensity={2} position={[0, 4, 3]} scale={[6, 2, 1]} />
        <Lightformer form="rect" intensity={1} position={[-4, 1, 2]} scale={[2, 4, 1]} />
        <Lightformer form="ring" intensity={1.5} position={[4, 2, 2]} scale={2} />
      </Environment>
      <group position={[0, -1, 0]}>
        <mesh position={[0, -0.4, 0]}>
          <boxGeometry args={[2.9, 1.6, 0.6]} />
          <meshStandardMaterial color={skin} roughness={0.6} />
        </mesh>
        {FINGERS.map((finger) => (
          <PlaceholderFinger
            key={finger}
            finger={finger}
            design={design}
            skin={skin}
            paint={paint}
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
  readonly skin: string;
  readonly paint: NailPaint;
  readonly isSelected: boolean;
  readonly onSelect: (finger: Finger) => void;
}

function PlaceholderFinger({ finger, design, skin, paint, isSelected, onSelect }: PlaceholderFingerProps) {
  const { x, length, tilt } = FINGER_LAYOUT[finger];
  const nail = design.nails[finger];
  const material = FINISH_MATERIAL[nail.finish];
  const invalidate = useThree((state) => state.invalidate);

  const plate = useMemo(() => createNailPlate(), []);
  useEffect(() => () => plate.dispose(), [plate]);

  const texture = useMemo(() => {
    const created = new CanvasTexture(paint.canvas(finger));
    created.colorSpace = SRGBColorSpace;
    created.anisotropy = 4;
    return created;
  }, [paint, finger]);
  useEffect(() => () => texture.dispose(), [texture]);

  useEffect(
    () =>
      paint.subscribe((changed) => {
        if (changed !== finger) return;
        texture.needsUpdate = true;
        invalidate();
      }),
    [paint, finger, texture, invalidate],
  );

  const select = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    onSelect(finger);
  };

  return (
    <group position={[x, 0.4, 0]} rotation={[0, 0, tilt]}>
      <mesh position={[0, length / 2, 0]} onClick={select}>
        <capsuleGeometry args={[FINGER_RADIUS, length, 8, 24]} />
        <meshStandardMaterial color={skin} roughness={0.6} />
      </mesh>
      <mesh geometry={plate} position={[0, length - 0.1, 0]} scale={[1, 0.45 + 0.25 * nail.length, 1]} onClick={select}>
        <meshPhysicalMaterial
          map={texture}
          alphaTest={0.5}
          side={DoubleSide}
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
