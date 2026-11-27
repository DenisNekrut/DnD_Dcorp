import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { CharactersModule } from './characters/characters.module';
import { PrismaModule } from './prisma/prisma.module';
import { RulesModule } from './rules/rules.module';
import { DiceModule } from './dice/dice.module';
import { UsersModule } from './users/users.module';
import { TabletopModule } from './tabletop/tabletop.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    CampaignsModule,
    CharactersModule,
    RulesModule,
    DiceModule,
    TabletopModule,
    AdminModule,
  ],
})
export class AppModule {}
