import { Module } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CharactersController } from './characters.controller';
import { CharactersService } from './characters.service';

@Module({
  controllers: [CharactersController],
  providers: [CharactersService, JwtAuthGuard],
})
export class CharactersModule {}
