import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ApiService } from "src/common/api.service";
import { GoogleService } from "src/google/google.service";
import { User, UserSchema } from "src/users/schemas/user.schema";
import { UsersService } from "src/users/users.service";
import { ZohoController } from "./zoho.controller";
import { ZohoService } from "./zoho.service";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  providers: [ZohoService, UsersService, ApiService, GoogleService],
  controllers: [ZohoController],
})
export class ZohoModule {}
