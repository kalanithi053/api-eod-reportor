import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ApiService } from "src/common/api.service";
import { GoogleService } from "src/google/google.service";
import { ZohoService } from "src/zoho/zoho.service";
import { User, UserSchema } from "./schemas/user.schema";
import { UsersController } from './users.controller';
import { UsersService } from "./users.service";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  providers: [UsersService, ZohoService, ApiService, GoogleService],
  exports: [UsersService],
  controllers: [UsersController],
})
export class UsersModule {}
