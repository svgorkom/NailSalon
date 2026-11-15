import { Environment, Lightformer, OrbitControls, useGLTF } from '@react-three/drei';
import { Canvas, createPortal, type ThreeEvent, useThree } from '@react-three/fiber';
import { Fragment, useEffect, useMemo } from 'react';
import { type BufferGeometry, CanvasTexture, LinearSRGBColorSpace, MeshStandardMaterial, type Object3D, SkinnedMesh, SRGBColorSpace, Vector3 } from 'three';
import { type Design, type Finger, FINGERS, type Finish, type Gem, type GemKind, type Nail } from '../core';
import { skinTint } from '../ui/skin';
import { SCENE_LIGHT, type Theme } from '../ui/theme';
import { CLEAR_GEM, createGemGeometries, GEM_MATERIALS, gemOrientation } from './gems';
import { findNailAnchors, type NailAnchor, type NailBed } from './nailBed';
import { createNailGeometry, surfaceFrame } from './nailGeometry';
import type { NailPaint } from './nailPaint';
import { nearestFinger, type Point } from './picking';

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

const HAND_URL = `${import.meta.env.BASE_URL}assets/hand/hand.glb`;

/** The model is in metres, with the wrist at the origin, fingers along +y and the back of the hand towards +z. */
const HAND_SCALE = 12;
/** Looking at the middle of the hand; the arm runs off the bottom of the view. */
const VIEW_TARGET = [0, 1, 0] as const;
const VIEW_POSITION = [0, 1, 4.6] as const;

/** A tap on the skin selects the finger whose nail is within this distance (metres): the nail itself is small on a phone. */
const PICK_DISTANCE = 0.03;

const FINISH_MATERIAL: Readonly<Record<Finish, { roughness: number; metalness: number; clearcoat: number }>> = {
  gloss: { roughness: 0.25, metalness: 0, clearcoat: 1 },
  matte: { roughness: 0.85, metalness: 0, clearcoat: 0 },
  glitter: { roughness: 0.35, metalness: 0.6, clearcoat: 1 },
  metallic: { roughness: 0.3, metalness: 0.8, clearcoat: 0.6 },
  chrome: { roughness: 0.05, metalness: 1, clearcoat: 1 },
};

useGLTF.preload(HAND_URL);

export function HandScene({ design, selected, theme, skin, paint, onSelect }: HandSceneProps) {
  return (
    <Canvas frameloop="demand" dpr={[1, 2]} gl={{ alpha: true }} camera={{ position: VIEW_POSITION, fov: 40 }} data-testid="hand-scene">
      <ambientLight intensity={0.3} color={SCENE_LIGHT[theme].sky} />
      <directionalLight position={[3, 5, 4]} intensity={1.6} color={SCENE_LIGHT[theme].sun} />
      <Environment resolution={256}>
        <Lightformer form="rect" intensity={2} position={[0, 4, 3]} scale={[6, 2, 1]} />
        <Lightformer form="rect" intensity={1} position={[-4, 1, 2]} scale={[2, 4, 1]} />
        <Lightformer form="ring" intensity={1.5} position={[4, 2, 2]} scale={2} />
      </Environment>
      <Hand design={design} selected={selected} skin={skin} paint={paint} onSelect={onSelect} />
      <OrbitControls makeDefault enablePan={false} target={VIEW_TARGET} minDistance={1.2} maxDistance={9} />
    </Canvas>
  );
}

interface HandProps {
  readonly design: Design;
  readonly selected: Finger | null;
  readonly skin: string;
  readonly paint: NailPaint;
  readonly onSelect: (finger: Finger) => void;
}

function Hand({ design, selected, skin, paint, onSelect }: HandProps) {
  const { scene } = useGLTF(HAND_URL);
  const invalidate = useThree((state) => state.invalidate);
  const anchors = useMemo(() => findNailAnchors(scene), [scene]);
  const gemGeometries = useMemo(() => createGemGeometries(), []);
  useEffect(() => () => Object.values(gemGeometries).forEach((geometry) => geometry.dispose()), [gemGeometries]);

  useEffect(() => {
    const [r, g, b] = skinTint(skin);
    scene.traverse((object) => {
      if (object instanceof SkinnedMesh && object.material instanceof MeshStandardMaterial) {
        object.material.color.setRGB(r, g, b, LinearSRGBColorSpace);
      }
    });
    invalidate();
  }, [scene, skin, invalidate]);

  const pick = (event: ThreeEvent<MouseEvent>) => {
    const local = scene.worldToLocal(event.point.clone());
    const nails = Object.fromEntries(FINGERS.map((finger) => [finger, positionIn(scene, anchors[finger].node)])) as Record<Finger, Point>;
    const finger = nearestFinger([local.x, local.y, local.z], nails, PICK_DISTANCE);
    if (finger) onSelect(finger);
  };

  return (
    <group scale={HAND_SCALE}>
      <primitive object={scene} onClick={pick} />
      {FINGERS.map((finger) => (
        <Fragment key={finger}>
          {createPortal(
            <>
              <NailMesh finger={finger} nail={design.nails[finger]} anchor={anchors[finger]} paint={paint} isSelected={finger === selected} onSelect={() => onSelect(finger)} />
              {design.nails[finger].gems.map((gem) => (
                <GemMesh key={`${gem.id}-${gem.clear}`} gem={gem} nail={design.nails[finger]} bed={anchors[finger].bed} geometries={gemGeometries} onSelect={() => onSelect(finger)} />
              ))}
            </>,
            anchors[finger].node,
          )}
        </Fragment>
      ))}
    </group>
  );
}

/** Position of `node` in the frame of `root`. */
function positionIn(root: Object3D, node: Object3D): Point {
  const position = root.worldToLocal(node.getWorldPosition(new Vector3()));
  return [position.x, position.y, position.z];
}

interface NailMeshProps {
  readonly finger: Finger;
  readonly nail: Nail;
  readonly paint: NailPaint;
  readonly anchor: NailAnchor;
  readonly isSelected: boolean;
  readonly onSelect: () => void;
}

function NailMesh({ finger, nail, paint, anchor, isSelected, onSelect }: NailMeshProps) {
  const invalidate = useThree((state) => state.invalidate);
  const geometry = useMemo(() => createNailGeometry(nail.shape, nail.length, anchor.bed), [nail.shape, nail.length, anchor.bed]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const material = FINISH_MATERIAL[nail.finish];

  // The same canvas as on the drawing pad: base colour, drawing and stickers. Its UV top is the free edge.
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

  return (
    <mesh
      geometry={geometry}
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
    >
      <meshPhysicalMaterial
        map={texture}
        roughness={material.roughness}
        metalness={material.metalness}
        clearcoat={material.clearcoat}
        emissive={isSelected ? '#ffffff' : '#000000'}
        emissiveIntensity={isSelected ? 0.15 : 0}
      />
    </mesh>
  );
}

interface GemMeshProps {
  readonly gem: Gem;
  readonly nail: Nail;
  readonly bed: NailBed;
  readonly geometries: Readonly<Record<GemKind, BufferGeometry>>;
  readonly onSelect: () => void;
}

/** A gem standing on the nail at its texture position. Its size is a fraction of the nail width, as on the pad. */
function GemMesh({ gem, nail, bed, geometries, onSelect }: GemMeshProps) {
  // The texture y runs from the free edge down; the mesh v from the cuticle up.
  const frame = useMemo(() => surfaceFrame(nail.shape, nail.length, bed, gem.x, 1 - gem.y), [nail.shape, nail.length, bed, gem.x, gem.y]);
  const quaternion = useMemo(() => gemOrientation(frame, gem.rotation), [frame, gem.rotation]);
  const material = gem.clear ? CLEAR_GEM : GEM_MATERIALS[gem.kind];
  return (
    <mesh
      geometry={geometries[gem.kind]}
      position={frame.position}
      quaternion={quaternion}
      scale={gem.size * bed.width}
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
    >
      <meshPhysicalMaterial
        color={gem.color}
        metalness={material.metalness}
        roughness={material.roughness}
        clearcoat={material.clearcoat}
        iridescence={material.iridescence}
        sheen={material.sheen}
        sheenColor="#ffffff"
        flatShading={material.flatShading}
        transmission={material.transmission}
        ior={material.ior}
        thickness={gem.size * bed.width * material.thickness}
        envMapIntensity={1.6}
      />
    </mesh>
  );
}
