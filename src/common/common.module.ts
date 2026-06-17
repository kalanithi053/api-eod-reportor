// common.module.ts

import { Module } from "@nestjs/common";
import { ApiService } from "./api.service";

@Module({
  providers: [ApiService],
  exports: [ApiService],
})
export class CommonModule {}
