import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { AuthModule } from "./auth/auth.module";
import { CommonModule } from "./common/common.module";
import { UsersModule } from "./users/users.module";
import { ZohoModule } from "./zoho/zoho.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>(
          "MONGODB_URI",
          "mongodb://localhost:27017/nest-auth-app",
        ),
      }),
    }),
    UsersModule,
    AuthModule,
    CommonModule,
    ZohoModule,
  ],
})
export class AppModule {}
