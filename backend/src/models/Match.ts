import mongoose, { Schema, Document } from 'mongoose';

export interface IMatch extends Document {
  matchId: string;
  players: {
    odId: string;
    username: string;
    placement: number;
    damageDealt: number;
    isBot: boolean;
  }[];
  winner: string;
  winnerUsername: string;
  duration: number;
  moves: {
    playerId: string;
    equation: string;
    turn: number;
    timestamp: number;
    hits: { targetId: string; damage: number; position: { x: number; y: number }; distanceTravelled: number }[];
    damageDealt: number;
  }[];
  mode: string;
  createdAt: Date;
}

const MatchSchema = new Schema<IMatch>({
  matchId: { type: String, required: true, unique: true, index: true },
  players: [{
    odId: String,
    username: String,
    placement: Number,
    damageDealt: Number,
    isBot: Boolean,
  }],
  winner: { type: String, required: true },
  winnerUsername: { type: String, required: true },
  duration: { type: Number, default: 0 },
  moves: [{
    playerId: String,
    equation: String,
    turn: Number,
    timestamp: Number,
    hits: [{
      targetId: String,
      damage: Number,
      position: { x: Number, y: Number },
      distanceTravelled: Number,
    }],
    damageDealt: Number,
  }],
  mode: { type: String, default: 'multiplayer' },
  createdAt: { type: Date, default: Date.now },
});

export const Match = mongoose.model<IMatch>('Match', MatchSchema);
