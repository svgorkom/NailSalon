/** The furniture around the customer, for a manicure (a table) or a pedicure (a chair and a footrest). Plain shapes and flat colours; lit by the lights of the scene. */
export function Salon({ part }: { readonly part: 'hand' | 'foot' }) {
  return part === 'foot' ? <PedicureSalon /> : <ManicureSalon />;
}

/**
 * A table whose top is at y = 0 (the customer model sits behind it with the lower body below the top), a towel under her hand, a wall and a lamp.
 */
function ManicureSalon() {
  return (
    <group>
      {/* Table: the front edge is just in front of her belly, so her body comes up out of the top. */}
      <mesh position={[0.15, -0.03, 0.55]} receiveShadow>
        <boxGeometry args={[1.6, 0.06, 1.3]} />
        <meshStandardMaterial color="#b98a5e" roughness={0.6} />
      </mesh>
      {/* Towel under the right hand. */}
      <mesh position={[0.0, 0.0015, 0.06]}>
        <boxGeometry args={[0.24, 0.003, 0.3]} />
        <meshStandardMaterial color="#f6efe6" roughness={0.95} />
      </mesh>
      {/* Wall behind the customer. */}
      <mesh position={[0.15, 0.6, -1.0]}>
        <planeGeometry args={[4, 2.4]} />
        <meshStandardMaterial color="#e9d9d0" roughness={1} />
      </mesh>
      <Lamp position={[-0.7, 0, -0.3]} />
    </group>
  );
}

/** Metres in the model of the pedicure customer: the footrest top is at y = 0, the floor lies this far below it, the seat of her chair this far above it. */
const FLOOR_Y = -0.146;
const SEAT_Y = 0.215;
const CHAIR_X = 0.12;
const CHAIR_COLOR = '#d9a5b3';

/** A low footrest with a towel under her right foot, her chair behind it, a floor and a wall. */
function PedicureSalon() {
  const seatDepth = 0.46;
  const legHeight = SEAT_Y - FLOOR_Y;
  return (
    <group>
      {/* Floor. */}
      <mesh position={[0.15, FLOOR_Y - 0.005, -0.3]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[4, 4]} />
        <meshStandardMaterial color="#cdb9a5" roughness={0.9} />
      </mesh>
      {/* Wall behind the customer. */}
      <mesh position={[0.15, 0.6, -1.5]}>
        <planeGeometry args={[4, 2.6]} />
        <meshStandardMaterial color="#e9d9d0" roughness={1} />
      </mesh>
      {/* Footrest: its top is where her heel rests; a towel on top. */}
      <mesh position={[0.02, (FLOOR_Y + 0) / 2 - 0.0015, 0.05]}>
        <boxGeometry args={[0.3, -FLOOR_Y - 0.003, 0.42]} />
        <meshStandardMaterial color="#b98a5e" roughness={0.6} />
      </mesh>
      <mesh position={[0.02, -0.0015, 0.05]}>
        <boxGeometry args={[0.28, 0.003, 0.4]} />
        <meshStandardMaterial color="#f6efe6" roughness={0.95} />
      </mesh>
      {/* Chair: a seat under her, four legs and a low back. */}
      <mesh position={[CHAIR_X, SEAT_Y - 0.02, -0.55]}>
        <boxGeometry args={[0.5, 0.04, seatDepth]} />
        <meshStandardMaterial color={CHAIR_COLOR} roughness={0.7} />
      </mesh>
      {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => (
        <mesh key={`${sx}${sz}`} position={[CHAIR_X + sx * 0.22, FLOOR_Y + (legHeight - 0.04) / 2, -0.55 + sz * 0.19]}>
          <boxGeometry args={[0.035, legHeight - 0.04, 0.035]} />
          <meshStandardMaterial color="#8a6b4a" roughness={0.6} />
        </mesh>
      )))}
      <mesh position={[CHAIR_X, SEAT_Y + 0.28, -0.8]}>
        <boxGeometry args={[0.5, 0.5, 0.03]} />
        <meshStandardMaterial color={CHAIR_COLOR} roughness={0.7} />
      </mesh>
      <Lamp position={[-0.7, FLOOR_Y, -0.2]} />
    </group>
  );
}

/** A lamp on an arm, to the left of the customer, standing on `position`. */
function Lamp({ position }: { readonly position: readonly [number, number, number] }) {
  return (
    <group position={[...position]}>
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.6, 12]} />
        <meshStandardMaterial color="#444" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0.1, 0.62, 0.05]} rotation={[0, 0, -0.5]}>
        <coneGeometry args={[0.09, 0.14, 24, 1, true]} />
        <meshStandardMaterial color="#f2b6c6" roughness={0.5} side={2} />
      </mesh>
      <pointLight position={[0.14, 0.56, 0.08]} intensity={0.6} distance={2} color="#fff1d8" />
    </group>
  );
}
