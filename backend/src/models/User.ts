import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  uid: string;
  username: string;
  email: string;
  avatar?: string;
  level: number;
  xp: number;
  wins: number;
  losses: number;
  matchesPlayed: number;
  elo: number;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>({
  uid: { type: String, required: true, unique: true, index: true },
  username: { type: String, required: true },
  email: { type: String, required: true },
  avatar: { type: String },
  level: { type: Number, default: 1 },
  xp: { type: Number, default: 0 },
  wins: { type: Number, default: 0 },
  losses: { type: Number, default: 0 },
  matchesPlayed: { type: Number, default: 0 },
  elo: { type: Number, default: 1000 },
  createdAt: { type: Date, default: Date.now },
});

export const User = mongoose.model<IUser>('User', UserSchema);
