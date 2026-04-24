export interface SpatialPlantModel {
  id: string;
  plantId: string;
  position: { x: number; y: number };
  spacingCm: number;
}
