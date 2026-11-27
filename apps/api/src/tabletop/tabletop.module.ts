import { Module } from '@nestjs/common';
import { TabletopController } from './tabletop.controller';
import { TabletopService } from './tabletop.service';

@Module({
  controllers: [TabletopController],
  providers: [TabletopService],
  exports: [TabletopService],
})
export class TabletopModule {}
