import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { GoogleProfile } from "../auth/interfaces/google-profile.interface";
import { User, UserDocument } from "./schemas/user.schema";

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  findByEmail(email: string) {
    return this.userModel.findOne({ email: email.toLowerCase() }).exec();
  }

  findById(id: string) {
    return this.userModel.findById(id).exec();
  }

  async findOrCreateFromGoogle(
    profile: GoogleProfile & { refreshToken?: string },
  ): Promise<UserDocument> {
    const refreshToken = profile.refreshToken ?? "";

    let user = await this.findByEmail(profile.email);

    if (!user) {
      user = new this.userModel({
        name: profile.name || profile.email,
        email: profile.email,
        userProfileUrl: profile.picture ?? null,
        configuration: {
          validatedGoogle: true,
          googleRefreshToken: refreshToken || null,
        },
      });
      return user.save();
    }

    user.configuration.validatedGoogle = true;
    if (refreshToken) {
      user.configuration.googleRefreshToken = refreshToken;
    }
    return user.save();
  }

  async updateZohoRefreshToken(
    id: string,
    refreshToken: string,
  ): Promise<UserDocument> {
    let user = await this.findById(id);

    if (!user) throw new NotFoundException("user not found");

    user.configuration.validatedZoho = true;
    user.configuration.zohoRefreshToken = refreshToken;

    return user.save();
  }

  async revokeZohoRefreshToken(id: string): Promise<UserDocument> {
    this.logger.debug("revokeZohoRefreshToken", id);
    let user = await this.findById(id);

    if (!user) throw new NotFoundException("user not found");

    user.configuration.validatedZoho = false;
    user.configuration.zohoRefreshToken = "";

    return user.save();
  }
}
