import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { Project } from '../../types';
import { buildFurniture, buildRoomShell, disposeGroup } from '../../three/builders';
import { SceneLights } from './SceneLights';
import { useStore } from '../../store/useStore';

function makeLabelSprite(textContent: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  const font = '600 44px Helvetica, Arial, sans-serif';
  ctx.font = font;
  const w = Math.ceil(ctx.measureText(textContent).width) + 48;
  canvas.width = w;
  canvas.height = 76;
  ctx.font = font;
  ctx.fillStyle = 'rgba(24, 22, 19, 0.82)';
  ctx.beginPath();
  ctx.roundRect(0, 0, w, 76, 18);
  ctx.fill();
  ctx.fillStyle = '#f0e9da';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(textContent, w / 2, 40);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }),
  );
  const scale = 0.055;
  sprite.scale.set(w * scale * 0.1, 7.6 * scale, 1);
  return sprite;
}

function ApartmentModel({ project, cutHeight, showLabels }: { project: Project; cutHeight: number; showLabels: boolean }) {
  const group = useMemo(() => {
    const g = new THREE.Group();
    for (const room of project.rooms) {
      const shell = buildRoomShell(room, { wallHeight: Math.min(room.wallHeight, cutHeight) });
      shell.position.set(room.x + room.width / 2, 0, room.z + room.depth / 2);
      g.add(shell);
      for (const item of room.items) {
        // Skip hung items (pendants) that would float above cutaway walls.
        if (item.elevation >= cutHeight) continue;
        const f = buildFurniture(item);
        f.position.set(room.x + item.x, item.elevation, room.z + item.z);
        f.rotation.y = -THREE.MathUtils.degToRad(item.rotation);
        g.add(f);
      }
      if (showLabels) {
        const label = makeLabelSprite(room.name.toUpperCase());
        label.position.set(room.x + room.width / 2, Math.min(room.wallHeight, cutHeight) + 1.6, room.z + room.depth / 2);
        g.add(label);
      }
    }
    return g;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.updatedAt, cutHeight, showLabels]);

  useEffect(() => () => disposeGroup(group), [group]);

  return <primitive object={group} />;
}

export function OverviewScene({ project }: { project: Project }) {
  const overviewCut = useStore((s) => s.overviewCut);
  const overviewLabels = useStore((s) => s.overviewLabels);

  const rooms = project.rooms;
  const minX = Math.min(...rooms.map((r) => r.x));
  const minZ = Math.min(...rooms.map((r) => r.z));
  const maxX = Math.max(...rooms.map((r) => r.x + r.width));
  const maxZ = Math.max(...rooms.map((r) => r.z + r.depth));
  const cx = (minX + maxX) / 2;
  const cz = (minZ + maxZ) / 2;
  const span = Math.max(maxX - minX, maxZ - minZ);

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [cx + span * 0.55, span * 1.3, cz + span * 1.05], fov: 42, near: 0.5, far: 2000 }}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
    >
      <color attach="background" args={['#20232a']} />
      <SceneLights span={span} center={[cx, 0, cz]} />
      <ApartmentModel project={project} cutHeight={overviewCut} showLabels={overviewLabels} />
      <mesh position={[cx, -0.62, cz]} receiveShadow castShadow>
        <boxGeometry args={[maxX - minX + 5, 0.6, maxZ - minZ + 5]} />
        <meshStandardMaterial color="#3a3e44" roughness={0.95} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, -1, cz]} receiveShadow>
        <circleGeometry args={[span * 4, 48]} />
        <meshStandardMaterial color="#2a2d34" roughness={1} />
      </mesh>
      <OrbitControls
        makeDefault
        target={[cx, 0, cz]}
        maxPolarAngle={Math.PI / 2 - 0.05}
        minDistance={8}
        maxDistance={span * 4}
        enableDamping
      />
    </Canvas>
  );
}
