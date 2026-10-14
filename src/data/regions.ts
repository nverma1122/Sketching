import type { GuideTemplate } from './types';

/** Region keys each template can focus on, with human labels. */
export const TEMPLATE_REGIONS: Record<GuideTemplate, Record<string, string>> = {
  shopfront: {
    shop: 'the whole shop at street level',
    entrance: 'the doorway and the shadow around it',
    sign: 'the signs and their brackets',
    display: 'the shop window and its display',
    upper: 'the upper-floor windows',
    roofline: 'the roofline and cornice against the sky',
  },
  corner: {
    corner: 'the corner edge where the two façades meet',
    shop: 'the shop at street level',
    upper: 'the upper-floor windows on both faces',
    balconies: 'the balconies and their shadows',
    entrance: 'the entrance and awning',
    roofline: 'the two rooflines meeting at the corner',
  },
  lane: {
    near: 'the nearest doorway and wall',
    windows: 'the rhythm of repeating windows',
    cables: 'the overhead cables and the strip of sky',
    far: 'the far end where the lane turns',
  },
  facade: {
    windows: 'one row of windows and shutters',
    balcony: 'a balcony with its plants and shadow',
    door: 'the street door and its surround',
    pipes: 'the drainpipe, cables and their shadows',
    roofline: 'the roofline and top-floor windows',
  },
  stall: {
    counter: 'the counter with kettle and stacked cups',
    roof: 'the awning and hanging signs',
    tree: 'the tree and the shadow it casts',
    seats: 'the stools, bench and the ground around them',
  },
  doorway: {
    door: 'the door itself and its panels',
    frame: 'the frame, arch and wall texture around it',
    plants: 'the plants and pots beside the door',
    step: 'the step, tiles and threshold',
  },
  street: {
    bench: 'the bench under the tree canopy',
    signpost: 'the signpost and lamp',
    shop: 'the shopfront in the background',
    pavement: 'the pavement joints leading in',
  },
  cafe: {
    window: 'the large window with chairs inside',
    entrance: 'the doorway framed by the climbing plant',
    plants: 'the climbing plant and pots',
    pavement: 'the irregular pavement and outdoor chair',
  },
  waterfront: {
    boats: 'the nearest boat, its mooring line and reflection',
    village: 'the village of houses and trees on the shore',
    water: 'the water and the boats floating on it',
    hills: 'the far hills and the horizon',
  },
  riverside: {
    lamp: 'the lamp post and railing in the foreground',
    bridge: 'the stone bridge and its arches',
    buildings: 'the row of buildings across the river',
    tower: 'the tower or spire against the sky',
  },
  vista: {
    left: 'the row houses on the left side',
    view: 'the bridge and water at the end of the street',
    street: 'the street, kerbs and parked cars',
    right: 'the row houses on the right side',
  },
  house: {
    stair: 'the outside stair and its shadow',
    door: 'the front door and its pots',
    roof: 'the tiled roof and chimney',
    balcony: 'the balcony with plants',
  },
  steps: {
    steps: 'the steps climbing away from you',
    near: 'the nearest wall, pots and plants',
    lantern: 'the hanging lantern or sign',
    top: 'the top of the steps where the alley turns',
  },
};

export const regionLabel = (t: GuideTemplate, key: string) => TEMPLATE_REGIONS[t][key] ?? key;
