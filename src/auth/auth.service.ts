import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { DatabaseService } from '../database/database.service';
import { AuthDto } from './dto/auth.dto';

const SALT_ROUNDS = 10;

export interface AuthUserPayload {
  id: number;
  email: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly database: DatabaseService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: AuthDto) {
    const existing = this.database.findUserByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = this.database.createUser(dto.email, passwordHash);

    return {
      id: user.id,
      email: user.email,
      createdAt: user.created_at,
    };
  }

  async login(dto: AuthDto) {
    const user = this.database.findUserByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
    });

    return { accessToken };
  }

  validateJwtPayload(payload: { sub: number; email: string }): AuthUserPayload {
    return { id: payload.sub, email: payload.email };
  }
}
