import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';
import type { FurnitureItem, Project, Room, Route } from '../types';
import { uid } from '../utils/id';
import { autoFurnish, defaultOpenings, DEFAULT_TRIM, ROOM_FINISHES } from '../data/presets';
import { CATALOG_MAP } from '../data/catalog';
import { createSampleProject } from '../data/seed';

const idbStorage: StateStorage = {
  getItem: async (name) => (await idbGet(name)) ?? null,
  setItem: async (name, value) => idbSet(name, value),
  removeItem: async (name) => idbDel(name),
};

export interface NewRoomInput {
  name: string;
  type: Room['type'];
  x: number;
  z: number;
  width: number;
  depth: number;
  furnish: boolean;
}

interface StoreState {
  projects: Project[];
  route: Route;
  selectedItemId: string | null;
  hydrated: boolean;

  /** Dollhouse cutaway wall height (feet) for the 3D overview. */
  overviewCut: number;
  overviewLabels: boolean;

  navigate: (route: Route) => void;
  selectItem: (id: string | null) => void;
  setHydrated: () => void;
  setOverviewCut: (h: number) => void;
  setOverviewLabels: (v: boolean) => void;

  createProject: (name: string, client: string, notes: string) => string;
  createSample: () => string;
  deleteProject: (id: string) => void;
  duplicateProject: (id: string) => void;
  updateProject: (id: string, patch: Partial<Project>) => void;

  addRoom: (projectId: string, input: NewRoomInput) => string;
  updateRoom: (projectId: string, roomId: string, patch: Partial<Room>) => void;
  deleteRoom: (projectId: string, roomId: string) => void;
  refurnishRoom: (projectId: string, roomId: string) => void;

  addItem: (projectId: string, roomId: string, item: FurnitureItem) => void;
  updateItem: (projectId: string, roomId: string, itemId: string, patch: Partial<FurnitureItem>) => void;
  removeItem: (projectId: string, roomId: string, itemId: string) => void;
  duplicateItem: (projectId: string, roomId: string, itemId: string) => void;
}

function touch(p: Project): Project {
  return { ...p, updatedAt: Date.now() };
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      projects: [],
      route: { view: 'dashboard' },
      selectedItemId: null,
      hydrated: false,
      overviewCut: 6,
      overviewLabels: true,

      navigate: (route) => set({ route, selectedItemId: null }),
      selectItem: (id) => set({ selectedItemId: id }),
      setHydrated: () => set({ hydrated: true }),
      setOverviewCut: (h) => set({ overviewCut: h }),
      setOverviewLabels: (v) => set({ overviewLabels: v }),

      createProject: (name, client, notes) => {
        const id = uid('p_');
        const project: Project = {
          id,
          name,
          client,
          notes,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          planImage: null,
          pixelsPerFoot: 20,
          rooms: [],
        };
        set((s) => ({ projects: [project, ...s.projects] }));
        return id;
      },

      createSample: () => {
        const project = createSampleProject();
        set((s) => ({ projects: [project, ...s.projects] }));
        return project.id;
      },

      deleteProject: (id) =>
        set((s) => ({
          projects: s.projects.filter((p) => p.id !== id),
          route: { view: 'dashboard' },
        })),

      duplicateProject: (id) =>
        set((s) => {
          const src = s.projects.find((p) => p.id === id);
          if (!src) return s;
          const copy: Project = {
            ...structuredClone(src),
            id: uid('p_'),
            name: `${src.name} (Copy)`,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          return { projects: [copy, ...s.projects] };
        }),

      updateProject: (id, patch) =>
        set((s) => ({
          projects: s.projects.map((p) => (p.id === id ? touch({ ...p, ...patch }) : p)),
        })),

      addRoom: (projectId, input) => {
        const roomId = uid('r_');
        const finishes = ROOM_FINISHES[input.type];
        const room: Room = {
          id: roomId,
          name: input.name,
          type: input.type,
          x: input.x,
          z: input.z,
          width: input.width,
          depth: input.depth,
          wallHeight: 9,
          wallColor: finishes.wallColor,
          trimColor: DEFAULT_TRIM,
          floorColor: finishes.floorColor,
          floorStyle: finishes.floorStyle,
          openings: defaultOpenings(input.type, input.width),
          items: input.furnish ? autoFurnish(input.type, input.width, input.depth) : [],
          approved: false,
          notes: '',
        };
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === projectId ? touch({ ...p, rooms: [...p.rooms, room] }) : p,
          ),
        }));
        return roomId;
      },

      updateRoom: (projectId, roomId, patch) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === projectId
              ? touch({
                  ...p,
                  rooms: p.rooms.map((r) => (r.id === roomId ? { ...r, ...patch } : r)),
                })
              : p,
          ),
        })),

      deleteRoom: (projectId, roomId) =>
        set((s) => {
          const route = get().route;
          const leavingRoom =
            route.view === 'project' && route.tab === 'room' && route.roomId === roomId;
          return {
            projects: s.projects.map((p) =>
              p.id === projectId ? touch({ ...p, rooms: p.rooms.filter((r) => r.id !== roomId) }) : p,
            ),
            ...(leavingRoom ? { route: { view: 'project', projectId, tab: 'plan' } as Route } : {}),
          };
        }),

      refurnishRoom: (projectId, roomId) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === projectId
              ? touch({
                  ...p,
                  rooms: p.rooms.map((r) =>
                    r.id === roomId
                      ? { ...r, items: autoFurnish(r.type, r.width, r.depth), approved: false }
                      : r,
                  ),
                })
              : p,
          ),
        })),

      addItem: (projectId, roomId, item) =>
        set((s) => ({
          selectedItemId: item.id,
          projects: s.projects.map((p) =>
            p.id === projectId
              ? touch({
                  ...p,
                  rooms: p.rooms.map((r) =>
                    r.id === roomId ? { ...r, items: [...r.items, item], approved: false } : r,
                  ),
                })
              : p,
          ),
        })),

      updateItem: (projectId, roomId, itemId, patch) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === projectId
              ? touch({
                  ...p,
                  rooms: p.rooms.map((r) =>
                    r.id === roomId
                      ? {
                          ...r,
                          items: r.items.map((it) => (it.id === itemId ? { ...it, ...patch } : it)),
                        }
                      : r,
                  ),
                })
              : p,
          ),
        })),

      removeItem: (projectId, roomId, itemId) =>
        set((s) => ({
          selectedItemId: s.selectedItemId === itemId ? null : s.selectedItemId,
          projects: s.projects.map((p) =>
            p.id === projectId
              ? touch({
                  ...p,
                  rooms: p.rooms.map((r) =>
                    r.id === roomId
                      ? { ...r, items: r.items.filter((it) => it.id !== itemId), approved: false }
                      : r,
                  ),
                })
              : p,
          ),
        })),

      duplicateItem: (projectId, roomId, itemId) =>
        set((s) => {
          let newId: string | null = null;
          const projects = s.projects.map((p) => {
            if (p.id !== projectId) return p;
            return touch({
              ...p,
              rooms: p.rooms.map((r) => {
                if (r.id !== roomId) return r;
                const src = r.items.find((it) => it.id === itemId);
                if (!src) return r;
                newId = uid('f_');
                const copy: FurnitureItem = { ...src, id: newId, x: src.x + 1, z: src.z + 1 };
                return { ...r, items: [...r.items, copy], approved: false };
              }),
            });
          });
          return { projects, selectedItemId: newId ?? s.selectedItemId };
        }),
    }),
    {
      name: 'acme-interior-studio',
      version: 2,
      storage: createJSONStorage(() => idbStorage),
      partialize: (s) => ({ projects: s.projects }),
      migrate: (persisted) => {
        // v2 added room.openings/trimColor and item.elevation.
        const state = persisted as { projects?: Project[] };
        for (const project of state.projects ?? []) {
          for (const room of project.rooms) {
            room.openings ??= defaultOpenings(room.type, room.width);
            room.trimColor ??= DEFAULT_TRIM;
            for (const item of room.items) {
              item.elevation ??= CATALOG_MAP[item.catalogId]?.elevation ?? 0;
            }
          }
        }
        return state;
      },
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    },
  ),
);

export function useProject(projectId: string | null): Project | null {
  return useStore((s) => (projectId ? s.projects.find((p) => p.id === projectId) ?? null : null));
}
