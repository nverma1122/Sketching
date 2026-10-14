// Illustrated references bundled with the app: the artist's own sketches and
// illustrations from their collection, each paired with the scenes it suits.
// Files live in public/refs/ and are served next to the app.

export type IllustratedKind = 'my-sketch' | 'illustration';

export interface IllustratedRef {
  id: string;
  title: string;
  kind: IllustratedKind;
  /** Scene IDs this reference suits, best match first. */
  scenes: string[];
}

export const ILLUSTRATED: IllustratedRef[] = [
  // The artist's own sketches
  { id: 'harbour', title: 'Lakeside village with moored boats', kind: 'my-sketch', scenes: ['sk-01', 'ln-11'] },
  { id: 'riverside', title: 'River embankment with lamp post and bridge', kind: 'my-sketch', scenes: ['sk-02', 'bk-22'] },
  { id: 'hill-street', title: 'Hill street down to the bay', kind: 'my-sketch', scenes: ['sk-03', 'fc-05'] },
  { id: 'doorway-bougainvillea', title: 'Door number 12 under bougainvillea', kind: 'my-sketch', scenes: ['sk-20', 'fc-02'] },
  { id: 'bookshop-ink', title: 'Japanese bookshop (書店) in ink', kind: 'my-sketch', scenes: ['bk-07', 'bk-01', 'bk-15'] },
  { id: 'corner-coffee-ink', title: 'Corner coffee house with utility pole', kind: 'my-sketch', scenes: ['sk-08', 'bk-23', 'cn-14'] },
  { id: 'kirana-ink', title: 'Kirana store (किराना स्टोर) in ink', kind: 'my-sketch', scenes: ['sf-02'] },
  { id: 'narrow-house-ink', title: 'Narrow timber house with tiled awning', kind: 'my-sketch', scenes: ['fc-17', 'fc-23', 'sk-11'] },
  { id: 'kerala-house', title: 'Kerala house with tiled roofs', kind: 'my-sketch', scenes: ['sk-05', 'fc-24'] },
  { id: 'stair-house', title: 'Blue house with an outside stair', kind: 'my-sketch', scenes: ['sk-04', 'ln-03'] },
  // Illustrations from the artist's collection
  { id: 'tea-stall', title: 'Tea stall under a tree', kind: 'illustration', scenes: ['st-01', 'st-05', 'cn-04'] },
  { id: 'mountain-bakery', title: 'Mountain town bakery and café', kind: 'illustration', scenes: ['sk-07', 'cn-21'] },
  { id: 'wc-japanese-tea-shop', title: 'Japanese tea shop', kind: 'illustration', scenes: ['sk-18', 'sf-22', 'sf-01'] },
  { id: 'wc-stationery-bookshop', title: 'Stationery and bookshop with a bicycle', kind: 'illustration', scenes: ['bk-04', 'bk-12'] },
  { id: 'wc-kirana', title: 'Sharma Kirana Store', kind: 'illustration', scenes: ['sf-02'] },
  { id: 'wc-kerala-cafe', title: 'Kerala-style café', kind: 'illustration', scenes: ['sk-06'] },
  { id: 'wc-mountain-bakery', title: 'Mountain bakery on stone steps', kind: 'illustration', scenes: ['sk-07'] },
  { id: 'wc-narrow-lane', title: 'Narrow old-city lane with a bookshop', kind: 'illustration', scenes: ['sk-19', 'ln-21'] },
  { id: 'ink-kamome-coffee', title: 'Kamome coffee roaster', kind: 'illustration', scenes: ['bk-23', 'bk-14'] },
  { id: 'ink-tea-house', title: 'Tea house with a noren', kind: 'illustration', scenes: ['sk-18', 'sf-01'] },
  { id: 'ink-stair-alley', title: 'Stair alley climbing through plants', kind: 'illustration', scenes: ['sk-13', 'cn-16'] },
  { id: 'ink-bicycle-shop', title: 'Shop with a bicycle and window box', kind: 'illustration', scenes: ['sk-17', 'fc-11'] },
  { id: 'ink-librairie', title: 'Librairie under a striped awning', kind: 'illustration', scenes: ['sk-15', 'bk-02'] },
  { id: 'ink-noren-doorway', title: 'Noren doorway under a vine', kind: 'illustration', scenes: ['sk-11', 'ln-16'] },
  { id: 'ink-cafe-de-flore', title: 'Bistro café front', kind: 'illustration', scenes: ['sk-16', 'bk-05'] },
  { id: 'ink-sento', title: 'Bathhouse (湯) with a noren', kind: 'illustration', scenes: ['sk-09'] },
  { id: 'ink-tofu-shop', title: 'Tofu shop with a kei truck', kind: 'illustration', scenes: ['sk-10'] },
  { id: 'ink-corner-coffee', title: 'Corner coffee house', kind: 'illustration', scenes: ['sk-08'] },
  { id: 'ink-lantern-steps', title: 'Lantern steps between tea houses', kind: 'illustration', scenes: ['sk-12', 'ln-08'] },
  { id: 'ink-kirana', title: 'Kirana store in ink', kind: 'illustration', scenes: ['sf-02'] },
  { id: 'ink-bicycle-lane', title: 'Quiet lane with a bicycle', kind: 'illustration', scenes: ['sk-14', 'ln-05'] },
  { id: 'ink-yamamoto-books', title: 'Yamamoto bookshop', kind: 'illustration', scenes: ['bk-07', 'bk-15'] },
];

export const illustratedSrc = (r: IllustratedRef) => `refs/${r.id}.jpg`;

/** Illustrated references for a scene, best matches first (own sketches before illustrations). */
export function illustratedFor(promptId: string): IllustratedRef[] {
  return ILLUSTRATED.filter((r) => r.scenes.includes(promptId)).sort(
    (a, b) => a.scenes.indexOf(promptId) - b.scenes.indexOf(promptId) || (a.kind === b.kind ? 0 : a.kind === 'my-sketch' ? -1 : 1),
  );
}

export const illustratedLabel = (k: IllustratedKind) => (k === 'my-sketch' ? 'Your sketch' : 'Illustration from your collection');
