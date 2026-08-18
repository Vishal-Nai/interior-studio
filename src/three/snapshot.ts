import * as THREE from 'three';
import type { Project, Room } from '../types';
import { buildFurniture, buildRoomShell, disposeGroup } from './builders';
import { pickCameraCorner } from './view';

/**
 * Offscreen renderer used for PDF snapshots. Rebuilds each room/apartment
 * scene from project data with the same builders the live editor uses.
 */

let renderer: THREE.WebGLRenderer | null = null;

function getRenderer(width: number, height: number): THREE.WebGLRenderer {
  if (!renderer) {
    renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, alpha: false });
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
  }
  renderer.setSize(width, height, false);
  renderer.setPixelRatio(1);
  return renderer;
}

function addLights(scene: THREE.Scene, span: number, center: THREE.Vector3) {
  const hemi = new THREE.HemisphereLight('#ffffff', '#b9b0a2', 0.85);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight('#fff4e0', 2.0);
  sun.position.set(center.x + span * 0.7, span * 1.4, center.z + span * 0.55);
  sun.target.position.copy(center);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const s = span * 1.2;
  sun.shadow.camera.left = -s;
  sun.shadow.camera.right = s;
  sun.shadow.camera.top = s;
  sun.shadow.camera.bottom = -s;
  sun.shadow.camera.far = span * 6;
  sun.shadow.bias = -0.0004;
  scene.add(sun);
  scene.add(sun.target);
  const fill = new THREE.DirectionalLight('#dfe8ff', 0.55);
  fill.position.set(center.x - span, span * 0.9, center.z - span * 0.7);
  scene.add(fill);
}

function renderScene(
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  width: number,
  height: number,
): string {
  const r = getRenderer(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  r.render(scene, camera);
  const url = r.domElement.toDataURL('image/jpeg', 0.92);
  scene.traverse((obj) => {
    if (obj instanceof THREE.Group) disposeGroup(obj);
  });
  return url;
}

/** Render a single room from an isometric corner angle, near walls hidden. */
export function renderRoomSnapshot(room: Room, width = 1280, height = 900): string {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#f2efe9');

  const shell = buildRoomShell(room);
  scene.add(shell);
  for (const item of room.items) {
    const g = buildFurniture(item);
    g.position.set(item.x - room.width / 2, 0, item.z - room.depth / 2);
    g.rotation.y = -THREE.MathUtils.degToRad(item.rotation);
    scene.add(g);
  }

  const span = Math.max(room.width, room.depth);
  const center = new THREE.Vector3(0, room.wallHeight * 0.22, 0);
  addLights(scene, span, new THREE.Vector3(0, 0, 0));

  const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 500);
  // View from the least-obstructed corner; hide the two walls facing the camera.
  const corner = pickCameraCorner(room);
  camera.position.set(corner.sx * span * 1.05, span * 0.95, corner.sz * span * 1.25);
  camera.lookAt(center);

  const camDir = new THREE.Vector3();
  camera.getWorldDirection(camDir);
  shell.children.forEach((child) => {
    const n = child.userData.outNormal as THREE.Vector3 | undefined;
    if (n && n.dot(camDir) < -0.25) child.visible = false;
  });

  return renderScene(scene, camera, width, height);
}

/** Render the whole apartment as a cutaway dollhouse from above. */
export function renderOverviewSnapshot(project: Project, width = 1600, height = 1100): string {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#eceae4');

  const rooms = project.rooms;
  if (rooms.length === 0) return '';
  const minX = Math.min(...rooms.map((r) => r.x));
  const minZ = Math.min(...rooms.map((r) => r.z));
  const maxX = Math.max(...rooms.map((r) => r.x + r.width));
  const maxZ = Math.max(...rooms.map((r) => r.z + r.depth));
  const cx = (minX + maxX) / 2;
  const cz = (minZ + maxZ) / 2;
  const span = Math.max(maxX - minX, maxZ - minZ);

  // Base plinth under the whole flat
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(maxX - minX + 4, 0.6, maxZ - minZ + 4),
    new THREE.MeshStandardMaterial({ color: '#d8d3c8', roughness: 0.9 }),
  );
  base.position.set(cx, -0.62, cz);
  base.receiveShadow = true;
  scene.add(base);

  for (const room of rooms) {
    const shell = buildRoomShell(room, { wallHeight: Math.min(room.wallHeight, 6) });
    shell.position.set(room.x + room.width / 2, 0, room.z + room.depth / 2);
    scene.add(shell);
    for (const item of room.items) {
      const g = buildFurniture(item);
      g.position.set(room.x + item.x, 0, room.z + item.z);
      g.rotation.y = -THREE.MathUtils.degToRad(item.rotation);
      scene.add(g);
    }
  }

  addLights(scene, span, new THREE.Vector3(cx, 0, cz));

  const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
  camera.position.set(cx + span * 0.55, span * 1.35, cz + span * 1.05);
  camera.lookAt(new THREE.Vector3(cx, -span * 0.05, cz));

  return renderScene(scene, camera, width, height);
}
