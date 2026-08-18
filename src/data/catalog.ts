export type CatalogCategory =
  | 'Seating'
  | 'Tables'
  | 'Bedroom'
  | 'Storage'
  | 'Electronics'
  | 'Kitchen'
  | 'Bathroom'
  | 'Utility'
  | 'Decor';

export interface CatalogEntry {
  id: string;
  label: string;
  category: CatalogCategory;
  /** Default dimensions in feet: width, depth, height. */
  w: number;
  d: number;
  h: number;
  color: string;
  accent: string;
  /** Default height of the item's base above the floor (wall-mounted/hung items). */
  elevation?: number;
}

export const CATALOG: CatalogEntry[] = [
  // Seating
  { id: 'sofa3', label: '3-Seater Sofa', category: 'Seating', w: 7, d: 3, h: 2.6, color: '#8a9a5b', accent: '#6f7d49' },
  { id: 'sofa2', label: '2-Seater Sofa', category: 'Seating', w: 5, d: 3, h: 2.6, color: '#b0846a', accent: '#8d6a55' },
  { id: 'armchair', label: 'Armchair', category: 'Seating', w: 2.8, d: 2.8, h: 2.6, color: '#c98d5f', accent: '#a17049' },
  { id: 'diningChair', label: 'Dining Chair', category: 'Seating', w: 1.5, d: 1.6, h: 3, color: '#7b5b3f', accent: '#5e442f' },
  { id: 'stool', label: 'Stool / Pouffe', category: 'Seating', w: 1.5, d: 1.5, h: 1.4, color: '#9a8262', accent: '#7d6a50' },

  // Tables
  { id: 'coffeeTable', label: 'Coffee Table', category: 'Tables', w: 3.5, d: 2, h: 1.4, color: '#6b4f36', accent: '#4f3a27' },
  { id: 'sideTable', label: 'Side Table', category: 'Tables', w: 1.5, d: 1.5, h: 1.7, color: '#6b4f36', accent: '#4f3a27' },
  { id: 'diningTable', label: 'Dining Table', category: 'Tables', w: 5, d: 3, h: 2.5, color: '#6b4f36', accent: '#4f3a27' },
  { id: 'desk', label: 'Study Desk', category: 'Tables', w: 4, d: 2, h: 2.5, color: '#7a5c40', accent: '#5c452f' },

  // Bedroom
  { id: 'bedDouble', label: 'Double Bed', category: 'Bedroom', w: 6, d: 6.8, h: 2.9, color: '#7a5c40', accent: '#d8cfc2' },
  { id: 'bedSingle', label: 'Single Bed', category: 'Bedroom', w: 3.5, d: 6.5, h: 2.9, color: '#7a5c40', accent: '#d8cfc2' },
  { id: 'wardrobe', label: 'Wardrobe', category: 'Bedroom', w: 6, d: 2, h: 7.5, color: '#8a6c4e', accent: '#6d5439' },
  { id: 'dresser', label: 'Dresser + Mirror', category: 'Bedroom', w: 3, d: 1.5, h: 5.5, color: '#8a6c4e', accent: '#bcd2d8' },

  // Storage
  { id: 'bookshelf', label: 'Bookshelf', category: 'Storage', w: 3, d: 1.2, h: 6, color: '#6d5439', accent: '#54402b' },
  { id: 'tvUnit', label: 'TV Unit', category: 'Storage', w: 5, d: 1.5, h: 1.6, color: '#5c452f', accent: '#43331f' },
  { id: 'shoeRack', label: 'Shoe Rack', category: 'Storage', w: 3, d: 1.2, h: 3, color: '#6d5439', accent: '#54402b' },
  { id: 'shelvingUnit', label: 'Shelving Unit', category: 'Storage', w: 3, d: 1.5, h: 6, color: '#8f8f8f', accent: '#6f6f6f' },

  // Electronics
  { id: 'tv', label: 'Television', category: 'Electronics', w: 4, d: 0.6, h: 2.4, color: '#1c1c1e', accent: '#3a3a3c' },
  { id: 'fridge', label: 'Refrigerator', category: 'Electronics', w: 2.5, d: 2.3, h: 5.8, color: '#a9adb3', accent: '#8b8f96' },
  { id: 'washingMachine', label: 'Washing Machine', category: 'Electronics', w: 2, d: 2, h: 2.9, color: '#dde0e3', accent: '#3f4750' },

  // Kitchen
  { id: 'kitchenCounter', label: 'Kitchen Counter', category: 'Kitchen', w: 6, d: 2, h: 2.9, color: '#7d6752', accent: '#2f2f30' },
  { id: 'stove', label: 'Hob Counter', category: 'Kitchen', w: 3, d: 2, h: 2.9, color: '#7d6752', accent: '#1d1d1f' },
  { id: 'kitchenSink', label: 'Sink Counter', category: 'Kitchen', w: 3, d: 2, h: 2.9, color: '#7d6752', accent: '#b9bcbf' },

  // Bathroom
  { id: 'wc', label: 'Toilet (WC)', category: 'Bathroom', w: 1.5, d: 2.3, h: 2.6, color: '#f2f1ec', accent: '#dcdad2' },
  { id: 'washbasin', label: 'Wash Basin', category: 'Bathroom', w: 1.8, d: 1.5, h: 2.8, color: '#f2f1ec', accent: '#c9c6bc' },
  { id: 'shower', label: 'Shower Area', category: 'Bathroom', w: 3, d: 3, h: 6.8, color: '#cfd8da', accent: '#9fb2b6' },
  { id: 'bathtub', label: 'Bathtub', category: 'Bathroom', w: 5.5, d: 2.5, h: 1.8, color: '#f2f1ec', accent: '#d8d5ca' },

  // Utility
  { id: 'utilitySink', label: 'Utility Sink', category: 'Utility', w: 2, d: 1.6, h: 2.8, color: '#c8cccf', accent: '#9aa0a5' },

  // Decor
  { id: 'rug', label: 'Rug', category: 'Decor', w: 6, d: 4, h: 0.06, color: '#b56d54', accent: '#8f5340' },
  { id: 'plant', label: 'Indoor Plant', category: 'Decor', w: 1.4, d: 1.4, h: 4, color: '#4c7a43', accent: '#8b5a3c' },
  { id: 'floorLamp', label: 'Floor Lamp', category: 'Decor', w: 1.3, d: 1.3, h: 5.2, color: '#d9c08f', accent: '#3b3b3d' },
  { id: 'wallArt', label: 'Wall Art / Frame', category: 'Decor', w: 2.5, d: 0.15, h: 2, color: '#9a7b4f', accent: '#e7e2d6', elevation: 3.6 },
  { id: 'curtainPanel', label: 'Curtain Panel', category: 'Decor', w: 4, d: 0.3, h: 7.5, color: '#b9a98c', accent: '#a09173' },
  { id: 'pendantLight', label: 'Pendant Light', category: 'Decor', w: 1.2, d: 1.2, h: 1.6, color: '#2f2f31', accent: '#f3e3bd', elevation: 6.4 },
];

export const CATALOG_MAP: Record<string, CatalogEntry> = Object.fromEntries(
  CATALOG.map((c) => [c.id, c]),
);

export const CATEGORIES: CatalogCategory[] = [
  'Seating',
  'Tables',
  'Bedroom',
  'Storage',
  'Electronics',
  'Kitchen',
  'Bathroom',
  'Utility',
  'Decor',
];
