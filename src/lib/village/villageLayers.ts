/** Z-order layer della scena villaggio. */
export const LAYER_Z = {
  terrain: 0,
  paths: 1,
  fields: 2,
  walls: 3,
  objects: 4,
  buildings: 5,
  pikmin: 6,
  monsters: 7,
  effects: 8,
  interaction: 9,
  hud: 10,
} as const;

export type LayerName = keyof typeof LAYER_Z;
