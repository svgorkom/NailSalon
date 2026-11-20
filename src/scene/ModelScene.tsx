import { Environment, Lightformer, OrbitControls, useGLTF } from '@react-three/drei';
import { Canvas, createPortal, type ThreeEvent, useFrame, useThree } from '@react-three/fiber';
import { Fragment, type ReactNode, useEffect, useMemo, useRef } from 'react';
import { type BufferGeometry, CanvasTexture, LinearSRGBColorSpace, Mesh, MeshStandardMaterial, type Object3D, SkinnedMesh, SRGBColorSpace, Texture, Vector3 } from 'three';
import { type Design, type Digit, FINGERS, type Finish, type Gem, type GemKind, type Nail, nailAt, TOES } from '../core';
import { skinTint } from '../ui/skin';
import { SCENE_LIGHT, type Theme } from '../ui/theme';
import { CLEAR_GEM, createGemGeometries, GEM_MATERIALS, gemOrientation } from './gems';
import { findNailAnchors, type NailAnchor, type NailBed } from './nailBed';
import { createNailGeometry, surfaceFrame } from './nailGeometry';
import type { NailPaint } from './nailPaint';
import { nearestDigit, type Point } from './picking';

/** Which part of the body is shown. */
export type Part = 'hand' | 'foot';

/** What the scene can show: a part on its own, or the customer of the salon game (still a proof, see `ProtoViewer`). */
type ScenePart = Part | 'customer';

interface ModelSceneProps {
  readonly part: ScenePart;
  readonly design: Design;
  readonly selected: Digit | null;
  readonly theme: Theme;
  /** Base colour of the skin. */
  readonly skin: string;
  /** Holds the texture of each nail: base colour, drawing and stickers. */
  readonly paint: NailPaint;
  readonly onSelect: (digit: Digit) => void;
  /** The model file of a customer; needed for the part `customer`, ignored for the others. The previous customer is released when this changes. */
  readonly modelUrl?: string;
  /** Where the camera stands and looks, in scene units; the camera glides there when it changes. Without it the part's own view stays. */
  readonly view?: CameraView;
  /** Rendered inside the canvas, for tools that need the renderer or the frame loop. */
  readonly children?: ReactNode;
}

/** A camera position and the point it looks at. */
export interface CameraView {
  readonly position: readonly [number, number, number];
  readonly target: readonly [number, number, number];
}

interface PartSetup {
  /** Model file; a customer has none here because there are several (`modelUrl`). */
  readonly url: string | null;
  readonly digits: readonly Digit[];
  readonly scale: number;
  /** Where the camera looks, in scene units (the model scaled). */
  readonly target: readonly [number, number, number];
  /** A tap on the skin selects the digit whose nail is within this distance (metres): the nail itself is small on a phone. */
  readonly pickDistance: number;
  readonly camera: readonly [number, number, number];
  readonly minDistance: number;
  readonly maxDistance: number;
}

/**
 * Both models are in metres, with the wrist or ankle at the origin, fingers or toes along +y and the back of the hand or the top
 * of the foot towards +z. The hand is looked at in the middle with the arm running off the bottom; the foot is smaller, so it is
 * scaled less, and its middle is not at the origin: x runs from -3.6 to 5.1 cm and y from -7.7 to 18 cm.
 */
const SETUPS: Readonly<Record<ScenePart, PartSetup>> = {
  hand: { url: `${import.meta.env.BASE_URL}assets/hand/hand.glb`, digits: FINGERS, scale: 12, target: [0, 1, 0], pickDistance: 0.03, camera: [0, 1, 4.6], minDistance: 1.2, maxDistance: 9 },
  foot: { url: `${import.meta.env.BASE_URL}assets/foot/foot.glb`, digits: TOES, scale: 10, target: [0.07, 0.5, 0], pickDistance: 0.012, camera: [0.07, 0.5, 4.6], minDistance: 1.2, maxDistance: 9 },
  // In metres, origin on the table under the right wrist, the customer behind it facing +z; the player looks from +z.
  customer: { url: null, digits: FINGERS, scale: 1, target: [0.12, 0.25, 0], pickDistance: 0.025, camera: [0.12, 0.45, 1.2], minDistance: 0.15, maxDistance: 2.5 },
};

const FINISH_MATERIAL: Readonly<Record<Finish, { roughness: number; metalness: number; clearcoat: number }>> = {
  gloss: { roughness: 0.25, metalness: 0, clearcoat: 1 },
  matte: { roughness: 0.85, metalness: 0, clearcoat: 0 },
  glitter: { roughness: 0.35, metalness: 0.6, clearcoat: 1 },
  metallic: { roughness: 0.3, metalness: 0.8, clearcoat: 0.6 },
  chrome: { roughness: 0.05, metalness: 1, clearcoat: 1 },
};

useGLTF.preload(`${import.meta.env.BASE_URL}assets/hand/hand.glb`);
useGLTF.preload(`${import.meta.env.BASE_URL}assets/foot/foot.glb`);
// Customers are not preloaded: one is loaded at a time and released again.

export function ModelScene({ part, design, selected, theme, skin, paint, onSelect, modelUrl, view, children }: ModelSceneProps) {
  const setup = SETUPS[part];
  const url = setup.url ?? modelUrl;
  if (!url) throw new Error(`Part "${part}" needs a modelUrl.`);
  return (
    <Canvas key={part} frameloop="demand" dpr={[1, 2]} gl={{ alpha: true }} camera={{ position: [...setup.camera], fov: 40 }} data-testid={`${part}-scene`}>
      <ambientLight intensity={0.3} color={SCENE_LIGHT[theme].sky} />
      <directionalLight position={[3, 5, 4]} intensity={1.6} color={SCENE_LIGHT[theme].sun} />
      <Environment resolution={256}>
        <Lightformer form="rect" intensity={2} position={[0, 4, 3]} scale={[6, 2, 1]} />
        <Lightformer form="rect" intensity={1} position={[-4, 1, 2]} scale={[2, 4, 1]} />
        <Lightformer form="ring" intensity={1.5} position={[4, 2, 2]} scale={2} />
      </Environment>
      <Body setup={setup} url={url} release={setup.url === null} design={design} selected={selected} skin={skin} paint={paint} onSelect={onSelect} />
      <OrbitControls makeDefault zoomToCursor target={setup.target} minDistance={setup.minDistance} maxDistance={setup.maxDistance} />
      {view && <CameraGlide view={view} />}
      {children}
    </Canvas>
  );
}

const GLIDE_SECONDS = 0.6;

/** Moves the camera and the orbit target to `view` in a short glide. Frames are only requested while it moves. */
function CameraGlide({ view }: { readonly view: CameraView }) {
  const camera = useThree((state) => state.camera);
  const controls = useThree((state) => state.controls) as { target: Vector3; update: () => void } | null;
  const invalidate = useThree((state) => state.invalidate);
  const motion = useRef<{ from: Vector3; fromTarget: Vector3; elapsed: number } | null>(null);

  useEffect(() => {
    if (!controls) return;
    motion.current = { from: camera.position.clone(), fromTarget: controls.target.clone(), elapsed: 0 };
    invalidate();
  }, [view, camera, controls, invalidate]);

  useFrame((_, delta) => {
    const current = motion.current;
    if (!current || !controls) return;
    current.elapsed += delta;
    const t = Math.min(current.elapsed / GLIDE_SECONDS, 1);
    const eased = t * t * (3 - 2 * t);
    camera.position.lerpVectors(current.from, new Vector3(...view.position), eased);
    controls.target.lerpVectors(current.fromTarget, new Vector3(...view.target), eased);
    controls.update();
    if (t < 1) invalidate();
    else motion.current = null;
  });

  return null;
}

interface BodyProps {
  readonly setup: PartSetup;
  readonly url: string;
  /** Dispose the model's GPU resources and forget it when it goes away: for models that are swapped. */
  readonly release: boolean;
  readonly design: Design;
  readonly selected: Digit | null;
  readonly skin: string;
  readonly paint: NailPaint;
  readonly onSelect: (digit: Digit) => void;
}

function Body({ setup, url, release, design, selected, skin, paint, onSelect }: BodyProps) {
  const { scene } = useGLTF(url);
  const invalidate = useThree((state) => state.invalidate);
  const anchors = useMemo(() => findNailAnchors(scene, setup.digits), [scene, setup.digits]);
  const gemGeometries = useMemo(() => createGemGeometries(), []);

  useEffect(() => {
    if (!release) return undefined;
    return () => {
      scene.traverse((object) => {
        if (!(object instanceof Mesh)) return;
        object.geometry.dispose();
        if (object instanceof SkinnedMesh) object.skeleton.dispose();
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
          for (const value of Object.values(material)) if (value instanceof Texture) value.dispose();
          material.dispose();
        }
      });
      useGLTF.clear(url);
    };
  }, [scene, url, release]);

  useEffect(() => () => Object.values(gemGeometries).forEach((geometry) => geometry.dispose()), [gemGeometries]);

  useEffect(() => {
    const [r, g, b] = skinTint(skin);
    scene.traverse((object) => {
      if (object instanceof SkinnedMesh && object.material instanceof MeshStandardMaterial && object.material.name === 'Skin') {
        object.material.color.setRGB(r, g, b, LinearSRGBColorSpace);
      }
    });
    invalidate();
  }, [scene, skin, invalidate]);

  const pick = (event: ThreeEvent<MouseEvent>) => {
    const local = scene.worldToLocal(event.point.clone());
    const nails = Object.fromEntries(setup.digits.map((digit) => [digit, positionIn(scene, anchors[digit].node)])) as Record<Digit, Point>;
    const digit = nearestDigit([local.x, local.y, local.z], nails, setup.pickDistance);
    if (digit) onSelect(digit);
  };

  return (
    <group scale={setup.scale}>
      <primitive object={scene} onClick={pick} />
      {setup.digits.map((digit) => {
        const nail = nailAt(design, digit);
        return (
          <Fragment key={digit}>
            {createPortal(
              <>
                <NailMesh digit={digit} nail={nail} anchor={anchors[digit]} paint={paint} isSelected={digit === selected} onSelect={() => onSelect(digit)} />
                {nail.gems.map((gem) => (
                  <GemMesh key={`${gem.id}-${gem.clear}`} gem={gem} nail={nail} bed={anchors[digit].bed} geometries={gemGeometries} onSelect={() => onSelect(digit)} />
                ))}
              </>,
              anchors[digit].node,
            )}
          </Fragment>
        );
      })}
    </group>
  );
}

/** Position of `node` in the frame of `root`. */
function positionIn(root: Object3D, node: Object3D): Point {
  const position = root.worldToLocal(node.getWorldPosition(new Vector3()));
  return [position.x, position.y, position.z];
}

interface NailMeshProps {
  readonly digit: Digit;
  readonly nail: Nail;
  readonly paint: NailPaint;
  readonly anchor: NailAnchor;
  readonly isSelected: boolean;
  readonly onSelect: () => void;
}

function NailMesh({ digit, nail, paint, anchor, isSelected, onSelect }: NailMeshProps) {
  const invalidate = useThree((state) => state.invalidate);
  const geometry = useMemo(() => createNailGeometry(nail.shape, nail.length, anchor.bed), [nail.shape, nail.length, anchor.bed]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const material = FINISH_MATERIAL[nail.finish];

  // The same canvas as on the drawing pad: base colour, drawing and stickers. Its UV top is the free edge.
  const texture = useMemo(() => {
    const created = new CanvasTexture(paint.canvas(digit));
    created.colorSpace = SRGBColorSpace;
    created.anisotropy = 4;
    return created;
  }, [paint, digit]);
  useEffect(() => () => texture.dispose(), [texture]);

  useEffect(
    () =>
      paint.subscribe((changed) => {
        if (changed !== digit) return;
        texture.needsUpdate = true;
        invalidate();
      }),
    [paint, digit, texture, invalidate],
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
