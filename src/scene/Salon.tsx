/**
 * The furniture around the customer: a table whose top is at y = 0 (the customer model sits behind it with the lower body below the top),
 * a towel under her hand, a wall and a lamp. Plain shapes and flat colours; lit by the lights of the scene.
 */
export function Salon() {
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
      {/* Lamp on an arm over the table, to the left of the customer. */}
      <group position={[-0.7, 0, -0.3]}>
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
    </group>
  );
}
