export function SceneLights({ span, center = [0, 0, 0] as [number, number, number] }: { span: number; center?: [number, number, number] }) {
  return (
    <>
      <hemisphereLight color="#ffffff" groundColor="#b9b0a2" intensity={0.85} />
      <directionalLight
        color="#fff4e0"
        intensity={2.0}
        position={[center[0] + span * 0.7, span * 1.4, center[2] + span * 0.55]}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-span * 1.2}
        shadow-camera-right={span * 1.2}
        shadow-camera-top={span * 1.2}
        shadow-camera-bottom={-span * 1.2}
        shadow-camera-far={span * 6}
        shadow-bias={-0.0004}
      />
      <directionalLight
        color="#dfe8ff"
        intensity={0.55}
        position={[center[0] - span, span * 0.9, center[2] - span * 0.7]}
      />
    </>
  );
}
