import { Injectable, NotFoundException } from '@nestjs/common';
import { UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(private readonly users: UsersRepository) {}

  async getPublicUser(id: string) {
    const user = await this.users.findById(id);
    if (!user) throw new NotFoundException('User not found.');
    return { id: user.id, email: user.email, createdAt: user.createdAt, updatedAt: user.updatedAt };
  }
}
