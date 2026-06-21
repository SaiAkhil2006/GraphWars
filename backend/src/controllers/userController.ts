import { Response } from 'express';
import { User } from '../models/User.js';
import { Match } from '../models/Match.js';
import { Statistics } from '../models/Statistics.js';
import { AuthRequest } from '../middleware/auth.js';
import { gameService } from '../services/gameService.js';

export async function getProfile(req: AuthRequest, res: Response): Promise<void> {
  const uid = req.user!.uid;
  let user = await User.findOne({ uid });

  if (!user) {
    user = await User.create({
      uid,
      username: req.body.username || `Player_${uid.slice(0, 6)}`,
      email: req.user!.email || '',
    });
    await Statistics.create({ odId: uid });
  }

  const stats = await Statistics.findOne({ odId: uid });
  const recentMatches = await Match.find({
    'players.odId': uid,
  }).sort({ createdAt: -1 }).limit(10);

  res.json({
    user: {
      uid: user.uid,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      level: user.level,
      xp: user.xp,
      wins: user.wins,
      losses: user.losses,
      matchesPlayed: user.matchesPlayed,
      elo: user.elo,
      createdAt: user.createdAt,
      winRate: user.matchesPlayed > 0
        ? Math.round((user.wins / user.matchesPlayed) * 100)
        : 0,
    },
    stats: stats ? {
      totalDamage: stats.totalDamage,
      accuracy: Math.round(stats.accuracy),
      favoriteFunction: stats.favoriteFunction,
      averagePlacement: Math.round(stats.averagePlacement * 10) / 10,
    } : null,
    recentMatches,
  });
}

export async function updateProfile(req: AuthRequest, res: Response): Promise<void> {
  const uid = req.user!.uid;
  const { username, avatar } = req.body;

  const updates: Record<string, string> = {};
  if (username) updates.username = username.slice(0, 20);
  if (avatar) updates.avatar = avatar;

  const user = await User.findOneAndUpdate({ uid }, updates, { new: true });
  res.json({ user });
}

export async function getLeaderboard(req: AuthRequest, res: Response): Promise<void> {
  const sort = (req.query.sort as string) || 'wins';
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

  let sortField: Record<string, -1 | 1> = { wins: -1 };
  if (sort === 'xp') sortField = { xp: -1 };
  else if (sort === 'elo') sortField = { elo: -1 };
  else if (sort === 'winRate') sortField = { wins: -1 };

  const users = await User.find()
    .sort(sortField)
    .limit(limit)
    .select('uid username avatar level xp wins losses matchesPlayed elo');

  const leaderboard = users.map((u, i) => ({
    rank: i + 1,
    uid: u.uid,
    username: u.username,
    avatar: u.avatar,
    level: u.level,
    xp: u.xp,
    wins: u.wins,
    losses: u.losses,
    matchesPlayed: u.matchesPlayed,
    elo: u.elo,
    winRate: u.matchesPlayed > 0
      ? Math.round((u.wins / u.matchesPlayed) * 100)
      : 0,
  }));

  if (sort === 'winRate') {
    leaderboard.sort((a, b) => b.winRate - a.winRate);
    leaderboard.forEach((entry, i) => { entry.rank = i + 1; });
  }

  res.json({ leaderboard });
}

export async function getMatchHistory(req: AuthRequest, res: Response): Promise<void> {
  const uid = req.user!.uid;
  const matches = await Match.find({ 'players.odId': uid })
    .sort({ createdAt: -1 })
    .limit(20);
  res.json({ matches });
}

export async function getPublicRooms(_req: AuthRequest, res: Response): Promise<void> {
  const rooms = gameService.getPublicRooms().map(r => ({
    id: r.id,
    code: r.code,
    playerCount: r.players.filter(p => !p.isBot).length,
    maxPlayers: r.config.maxPlayers,
    mode: r.config.mode,
    host: r.players.find(p => p.isHost)?.username ?? 'Unknown',
  }));
  res.json({ rooms });
}
