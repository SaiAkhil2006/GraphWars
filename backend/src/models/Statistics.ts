import mongoose, { Schema, Document } from 'mongoose';

export interface IStatistics extends Document {
  odId: string;
  totalDamage: number;
  totalShots: number;
  totalHits: number;
  favoriteFunction: string;
  functionUsage: Record<string, number>;
  placements: number[];
  averagePlacement: number;
  accuracy: number;
}

const StatisticsSchema = new Schema<IStatistics>({
  odId: { type: String, required: true, unique: true, index: true },
  totalDamage: { type: Number, default: 0 },
  totalShots: { type: Number, default: 0 },
  totalHits: { type: Number, default: 0 },
  favoriteFunction: { type: String, default: 'x' },
  functionUsage: { type: Map, of: Number, default: {} },
  placements: { type: [Number], default: [] },
  averagePlacement: { type: Number, default: 0 },
  accuracy: { type: Number, default: 0 },
});

export const Statistics = mongoose.model<IStatistics>('Statistics', StatisticsSchema);
