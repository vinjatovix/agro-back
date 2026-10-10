import { DomainConflictException } from '../../../../shared/domain/errors/index.js';

export type ProposedPlacement = {
  position: { x: number; y: number };
  spacingCm: number;
};

export type ExistingCropSpatial = {
  id: string;
  position?: { x: number; y: number } | undefined;
  spacingCm: number;
};

export type ValidatePlacementParams = {
  bed: { width: number; height: number };
  proposed: ProposedPlacement;
  existingCrops: ExistingCropSpatial[];
  excludeCropId?: string | undefined;
};

export class CropSpatialService {
  validatePlacement({
    bed,
    proposed,
    existingCrops,
    excludeCropId
  }: ValidatePlacementParams): void {
    const { x, y } = proposed.position;

    if (x < 0 || x > bed.width || y < 0 || y > bed.height) {
      throw new DomainConflictException(
        `Crop position (${x}, ${y}) is outside bed boundaries (${bed.width}x${bed.height})`
      );
    }

    for (const crop of existingCrops) {
      if (excludeCropId && crop.id === excludeCropId) {
        continue;
      }

      if (!crop.position) {
        continue;
      }

      const dx = x - crop.position.x;
      const dy = y - crop.position.y;
      const distance = Math.hypot(dx, dy);
      const minRequired = Math.max(proposed.spacingCm, crop.spacingCm);

      if (distance < minRequired) {
        throw new DomainConflictException(
          `Crop at (${x}, ${y}) collides with existing crop at (${crop.position.x}, ${crop.position.y}): distance ${distance.toFixed(2)}cm is less than required ${minRequired}cm`
        );
      }
    }
  }
}
