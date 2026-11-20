import { useFrame, useThree } from '@react-three/fiber';
import { Suspense, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Vector3 } from 'three';
import { apply, createDesign, type Design } from '../core';
import { type CameraView, ModelScene } from '../scene/ModelScene';
import { NailPaint } from '../scene/nailPaint';
import { loadTheme } from './theme';

/** Proof page for the customer model of the salon game, at `/#/proto`. Not linked from the normal screens. */

const VIEWS = {
  salon: { label: 'Salon', view: { position: [0.12, 0.42, 1.2], target: [0.12, 0.25, 0] } },
  closeup: { label: 'Close-up', view: { position: [0.02, 0.3, 0.5], target: [0.02, 0, 0.09] } },
  wrist: { label: 'Pols', view: { position: [-0.22, 0.14, 0.3], target: [0, 0.03, 0.02] } },
} as const satisfies Record<string, { label: string; view: CameraView }>;

type ViewId = keyof typeof VIEWS;

const BENCHMARK_SECONDS = 5;

interface Measurement {
  readonly averageFps: number;
  /** Frame time that 95% of the frames stay under. */
  readonly p95Ms: number;
  readonly geometries: number;
  readonly textures: number;
  readonly triangles: number;
}

/** The nails of the proof: one colour and finish, so the nail meshes on the customer are easy to see. */
function proofDesign(): Design {
  let design = createDesign('Proef');
  design = apply(design, { type: 'setColor', target: 'fingers', color: '#d6336c' });
  design = apply(design, { type: 'setFinish', target: 'fingers', finish: 'gloss' });
  return apply(design, { type: 'setLength', target: 'fingers', length: 0.6 });
}

/** Turns the camera around its target for a few seconds, asking for a frame each time, and reports how smooth that was. */
function Benchmark({ onDone }: { readonly onDone: (measurement: Measurement) => void }) {
  const { camera, gl, invalidate, controls } = useThree();
  const run = useRef({ deltas: [] as number[], elapsed: 0, done: false });
  const centre = useMemo(() => new Vector3(), []);

  useFrame((_, delta) => {
    const state = run.current;
    if (state.done) return;
    state.deltas.push(delta * 1000);
    state.elapsed += delta;
    const target = (controls as { target?: Vector3 } | null)?.target ?? centre;
    camera.position.sub(target).applyAxisAngle(new Vector3(0, 1, 0), delta * 0.5).add(target);
    camera.lookAt(target);
    if (state.elapsed < BENCHMARK_SECONDS) {
      invalidate();
      return;
    }
    state.done = true;
    // The first frames include shader compilation; they are part of what a player sees, so they stay in the average but not in p95.
    const sorted = state.deltas.slice(5).sort((a, b) => a - b);
    const p95 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))] ?? 0;
    const { memory, render } = gl.info;
    onDone({ averageFps: state.deltas.length / state.elapsed, p95Ms: p95, geometries: memory.geometries, textures: memory.textures, triangles: render.triangles });
  });

  return null;
}

export function ProtoViewer() {
  const [viewId, setViewId] = useState<ViewId>('salon');
  const [measuring, setMeasuring] = useState(false);
  const [measurement, setMeasurement] = useState<Measurement | null>(null);
  const design = useMemo(() => proofDesign(), []);
  const paint = useMemo(() => new NailPaint(), []);
  useLayoutEffect(() => paint.sync(design), [paint, design]);

  return (
    <main className="proto">
      <div className="proto-bar">
        {(Object.keys(VIEWS) as ViewId[]).map((id) => (
          <button key={id} type="button" aria-pressed={id === viewId} onClick={() => setViewId(id)}>
            {VIEWS[id].label}
          </button>
        ))}
        <button
          type="button"
          disabled={measuring}
          onClick={() => {
            setMeasurement(null);
            setMeasuring(true);
          }}
        >
          {measuring ? 'Meten…' : `Meet ${BENCHMARK_SECONDS} s`}
        </button>
        {measurement && (
          <output>
            {measurement.averageFps.toFixed(0)} fps, p95 {measurement.p95Ms.toFixed(1)} ms, {measurement.triangles.toLocaleString('nl-NL')} driehoeken, {measurement.geometries} geometrieën, {measurement.textures} texturen
          </output>
        )}
      </div>
      <div className="proto-scene">
        <Suspense fallback={<p>Laden…</p>}>
          <ModelScene part="customer" design={design} selected={null} theme={loadTheme()} skin="#dba388" paint={paint} onSelect={() => undefined} view={VIEWS[viewId].view}>
            {measuring && (
              <Benchmark
                onDone={(result) => {
                  setMeasurement(result);
                  setMeasuring(false);
                }}
              />
            )}
          </ModelScene>
        </Suspense>
      </div>
    </main>
  );
}
