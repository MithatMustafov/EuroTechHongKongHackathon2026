import { Module } from '@nestjs/common';
import { FxService } from './fx.service';

@Module({
  providers: [FxService],
  exports: [FxService],
})
export class FxModule {}
