import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { UserRepository } from '../repositories/user.repository';
import { AppError } from '../middleware/error.middleware';
import { AuthUser } from '../types';

export class AuthService {
  private static generateTokens(user: AuthUser) {
    const accessToken = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn as any }
    );

    const refreshToken = jwt.sign(
      { id: user.id, email: user.email },
      config.jwt.refreshSecret,
      { expiresIn: config.jwt.refreshExpiresIn as any }
    );

    return { accessToken, refreshToken };
  }

  static async register(data: { name: string; email: string; password: string }) {
    const existing = await UserRepository.findByEmail(data.email.toLowerCase().trim());
    if (existing) {
      throw new AppError('An account with this email already exists.', 400);
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(data.password, salt);

    const user = await UserRepository.create({
      name: data.name.trim(),
      email: data.email.toLowerCase().trim(),
      password: hashedPassword,
    });

    const tokens = this.generateTokens(user);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      ...tokens,
    };
  }

  static async login(data: { email: string; password: string }) {
    const user = await UserRepository.findByEmail(data.email.toLowerCase().trim());
    if (!user) {
      throw new AppError('Invalid email or password.', 401);
    }

    const isMatch = await bcrypt.compare(data.password, user.password);
    if (!isMatch) {
      throw new AppError('Invalid email or password.', 401);
    }

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    const tokens = this.generateTokens(authUser);

    return {
      user: authUser,
      ...tokens,
    };
  }

  static async refresh(refreshToken: string) {
    try {
      const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret) as { id: string; email: string };
      const user = await UserRepository.findById(decoded.id);
      if (!user) {
        throw new AppError('User not found.', 401);
      }

      const tokens = this.generateTokens(user);
      return {
        user,
        ...tokens,
      };
    } catch {
      throw new AppError('Invalid or expired refresh token.', 401);
    }
  }

  static async getMe(userId: string) {
    const user = await UserRepository.findById(userId);
    if (!user) {
      throw new AppError('User not found.', 404);
    }
    return user;
  }
}
