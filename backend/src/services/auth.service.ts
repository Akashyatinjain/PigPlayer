import { createHash, randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';
import { config } from '../config/env';
import { UserRepository } from '../repositories/user.repository';
import { AppError } from '../middleware/error.middleware';
import { AuthUser } from '../types';

const issuer = 'pigplayer';
// A fixed valid hash keeps the bcrypt work comparable for unknown accounts.
const dummyHash = '$2a$10$9VyadSgcldnjcJD4xDKM.un7qEGCFkpaOCd7wvYRD63TnPS.uxnXa';
const authUserSelect = { id: true, email: true, name: true, role: true } as const;

function hashRefreshToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function readToken(token: string, type: 'access' | 'refresh') {
  try {
    const key = type === 'access' ? config.jwt.secret : config.jwt.refreshSecret;
    const claims = jwt.verify(token, key, { algorithms: ['HS256'], issuer, audience: type });
    if (typeof claims === 'object' && typeof claims.sid === 'string' &&
        typeof claims.sub === 'string' && typeof claims.exp === 'number') {
      return { sessionId: claims.sid, userId: claims.sub };
    }
  } catch {
    // Verification failures all use the same public response.
  }
  throw new AppError('Invalid or expired session token.', 401);
}

export class AuthService {
  private static generateTokens(userId: string, sessionId: string, expiresAt: Date) {
    const exp = Math.floor(expiresAt.getTime() / 1000);
    const options = { algorithm: 'HS256', issuer, subject: userId } as const;
    const accessToken = jwt.sign(
      { sid: sessionId, exp: Math.min(exp, Math.floor(Date.now() / 1000) + config.jwt.accessSeconds) },
      config.jwt.secret,
      { ...options, audience: 'access' }
    );
    const refreshToken = jwt.sign(
      { sid: sessionId, exp },
      config.jwt.refreshSecret,
      { ...options, audience: 'refresh', jwtid: randomUUID() }
    );
    return { accessToken, refreshToken };
  }

  private static async startSession(user: AuthUser) {
    const id = randomUUID();
    const expiresAt = new Date(Date.now() + config.jwt.sessionSeconds * 1000);
    const tokens = this.generateTokens(user.id, id, expiresAt);
    const { id: userId, email, name, role } = user;
    await prisma.$transaction([
      prisma.authSession.deleteMany({ where: { userId, expiresAt: { lte: new Date() } } }),
      prisma.authSession.create({
        data: { id, userId, expiresAt, refreshHash: hashRefreshToken(tokens.refreshToken) },
      }),
    ]);
    return { user: { id: userId, email, name, role }, ...tokens };
  }

  static async register(data: { name: string; email: string; password: string }) {
    const email = data.email.toLowerCase().trim();
    if (email === config.guestEmail) throw new AppError('This email is reserved.', 400);
    const existing = await UserRepository.findByEmail(email);
    if (existing) throw new AppError('An account with this email already exists.', 409);
    const user = await UserRepository.create({
      name: data.name.trim(),
      email,
      password: await bcrypt.hash(data.password, 10),
    });
    return this.startSession(user);
  }

  static async login(data: { email: string; password: string }) {
    const email = data.email.toLowerCase().trim();
    const user = await UserRepository.findByEmail(email);
    const matches = await bcrypt.compare(data.password, user?.password ?? dummyHash);
    const legacyPassword = config.env === 'production' &&
      ((data.password === 'soundify' && (email === 'local@soundify.app' || email === config.localUser.email)) ||
       (data.password === 'password123' && /^demo@(piggyplayer|soundify)\.app$/.test(email)));
    if (!user || email === config.guestEmail || !matches || legacyPassword) {
      throw new AppError('Invalid email or password.', 401);
    }
    return this.startSession(user);
  }

  static async authenticate(accessToken: string) {
    const { sessionId, userId } = readToken(accessToken, 'access');
    const session = await prisma.authSession.findUnique({
      where: { id: sessionId, userId, expiresAt: { gt: new Date() } },
      select: { user: { select: authUserSelect } },
    });
    if (!session) throw new AppError('Invalid or expired session token.', 401);
    return { user: session.user, sessionId };
  }

  static async refresh(refreshToken: string) {
    const { sessionId, userId } = readToken(refreshToken, 'refresh');
    const where = {
      userId,
      refreshHash: hashRefreshToken(refreshToken),
      expiresAt: { gt: new Date() },
    };
    const session = await prisma.authSession.findUnique({
      where: { id: sessionId, ...where },
      select: { expiresAt: true, user: { select: authUserSelect } },
    });
    if (!session) throw new AppError('Invalid or expired refresh token.', 401);

    const tokens = this.generateTokens(userId, sessionId, session.expiresAt);
    const updated = await prisma.authSession.updateMany({
      where: { id: sessionId, ...where },
      data: { refreshHash: hashRefreshToken(tokens.refreshToken) },
    });
    if (updated.count !== 1) throw new AppError('Invalid or expired refresh token.', 401);
    return { user: session.user, ...tokens };
  }

  static async logout(sessionId: string) {
    await prisma.authSession.deleteMany({ where: { id: sessionId } });
  }

  static async getMe(userId: string) {
    const user = await UserRepository.findById(userId);
    if (!user) throw new AppError('User not found.', 404);
    return user;
  }
}
