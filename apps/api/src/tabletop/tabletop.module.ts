import { Module } from '@nestjs/common';
import { TabletopController } from './tabletop.controller';
import { TabletopService } from './tabletop.service';
import { MapStorageService } from './map-storage.service';

@Module({
  controllers: [TabletopController],
  providers: [TabletopService, MapStorageService],
  exports: [TabletopService],
})
export class TabletopModule {}
