import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { FurnitureItem, Room } from '../../types';
import { buildFurniture, buildRoomShell, disposeGroup } from '../../three/builders';
import { pickCameraCorner, type CameraCorner } from '../../three/view';
import { useStore } from '../../store/useStore';
import { clamp } from '../../utils/units';
import { SceneLights } from './SceneLights';

export interface ViewRequest {
  mode: 'top' | 'corner';
  nonce: number;
}

const FLOOR_PLANE = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

function RoomShell({ room }: { room: Room }) {
  const shell = useMemo(
    () => buildRoomShell(room),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      room.width,
      room.depth,
      room.wallHeight,
      room.wallColor,
      room.trimColor,
      room.floorColor,
      room.floorStyle,
      room.openings,
      room.type,
    ],
  );

  useEffect(() => () => disposeGroup(shell), [shell]);

  // Hide walls between the camera and the room interior.
  useFrame(({ camera }) => {
    const dir = camera.position.clone().setY(0).normalize();
    for (const child of shell.children) {
      const n = child.userData.outNormal as THREE.Vector3 | undefined;
      if (n) child.visible = n.dot(dir) < 0.35;
    }
  });

  return <primitive object={shell} />;
}

function FurnitureObject({
  item,
  room,
  projectId,
  selected,
}: {
  item: FurnitureItem;
  room: Room;
  projectId: string;
  selected: boolean;
}) {
  const selectItem = useStore((s) => s.selectItem);
  const updateItem = useStore((s) => s.updateItem);
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null;

  const group = useMemo(
    () => buildFurniture(item),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [item.catalogId, item.w, item.d, item.h, item.color, item.accent, item.elevation > 0.5],
  );

  const drag = useRef<{ offX: number; offZ: number } | null>(null);
  const hit = useMemo(() => new THREE.Vector3(), []);

  // Rotated axis-aligned footprint half-extents for wall clamping.
  const rad = THREE.MathUtils.degToRad(item.rotation);
  const halfW = (Math.abs(Math.cos(rad)) * item.w + Math.abs(Math.sin(rad)) * item.d) / 2;
  const halfD = (Math.abs(Math.sin(rad)) * item.w + Math.abs(Math.cos(rad)) * item.d) / 2;

  const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    selectItem(item.id);
    (e.target as Element).setPointerCapture(e.pointerId);
    if (e.ray.intersectPlane(FLOOR_PLANE, hit)) {
      drag.current = {
        offX: item.x - room.width / 2 - hit.x,
        offZ: item.z - room.depth / 2 - hit.z,
      };
    }
    if (controls) controls.enabled = false;
  };

  const onPointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!drag.current) return;
    e.stopPropagation();
    if (!e.ray.intersectPlane(FLOOR_PLANE, hit)) return;
    const nx = clamp(hit.x + drag.current.offX + room.width / 2, halfW, room.width - halfW);
    const nz = clamp(hit.z + drag.current.offZ + room.depth / 2, halfD, room.depth - halfD);
    updateItem(projectId, room.id, item.id, { x: Math.round(nx * 20) / 20, z: Math.round(nz * 20) / 20 });
  };

  const endDrag = (e: ThreeEvent<PointerEvent>) => {
    if (drag.current) {
      drag.current = null;
      (e.target as Element).releasePointerCapture(e.pointerId);
    }
    if (controls) controls.enabled = true;
  };

  return (
    <group
      position={[item.x - room.width / 2, item.elevation, item.z - room.depth / 2]}
      rotation={[0, -rad, 0]}
    >
      <primitive
        object={group}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      />
      {selected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04 - item.elevation, 0]}>
          <planeGeometry args={[item.w + 0.5, item.d + 0.5]} />
          <meshBasicMaterial color="#d9a95c" transparent opacity={0.4} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}

function ViewController({
  request,
  span,
  corner,
}: {
  request: ViewRequest | null;
  span: number;
  corner: CameraCorner;
}) {
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null;
  const camera = useThree((s) => s.camera);

  useEffect(() => {
    if (!request || !controls) return;
    if (request.mode === 'top') {
      camera.position.set(0.02, span * 2.1, 0.02);
      controls.target.set(0, 0, 0);
    } else {
      camera.position.set(corner.sx * span * 1.05, span * 0.95, corner.sz * span * 1.25);
      controls.target.set(0, 2, 0);
    }
    controls.update();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request?.nonce, controls]);

  return null;
}

export function RoomScene({
  room,
  projectId,
  viewRequest,
}: {
  room: Room;
  projectId: string;
  viewRequest: ViewRequest | null;
}) {
  const selectedItemId = useStore((s) => s.selectedItemId);
  const selectItem = useStore((s) => s.selectItem);
  const span = Math.max(room.width, room.depth);
  // Initial camera corner: chosen once per room so the view doesn't jump while editing.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const corner = useMemo(() => pickCameraCorner(room), [room.id]);

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{
        position: [corner.sx * span * 1.05, span * 0.95, corner.sz * span * 1.25],
        fov: 45,
        near: 0.1,
        far: 600,
      }}
      onPointerMissed={() => selectItem(null)}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
    >
      <color attach="background" args={['#20232a']} />
      <fog attach="fog" args={['#20232a', span * 4, span * 12]} />
      <SceneLights span={span} />
      <RoomShell room={room} />
      {room.items.map((item) => (
        <FurnitureObject
          key={item.id}
          item={item}
          room={room}
          projectId={projectId}
          selected={item.id === selectedItemId}
        />
      ))}
      {/* ground far below the room for visual context */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.32, 0]} receiveShadow>
        <circleGeometry args={[span * 4, 48]} />
        <meshStandardMaterial color="#2a2d34" roughness={1} />
      </mesh>
      <OrbitControls
        makeDefault
        target={[0, 2, 0]}
        maxPolarAngle={Math.PI / 2 - 0.04}
        minDistance={3}
        maxDistance={span * 4}
        enableDamping
      />
      <ViewController request={viewRequest} span={span} corner={corner} />
    </Canvas>
  );
}
