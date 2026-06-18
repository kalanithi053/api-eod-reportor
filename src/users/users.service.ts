import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { GoogleProfile } from "../auth/interfaces/google-profile.interface";
import { Portal, User, UserDocument } from "./schemas/user.schema";

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}
  findAll(){
    return this.userModel.find().exec();
  }

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
          validatedGoogle: !!refreshToken,
          googleRefreshToken: refreshToken || null,
        },
      });
      return user.save();
    }

    user.configuration.validatedGoogle = !!refreshToken;
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

  async udpateZohoDetails(
    id: string,
    refreshToken: string,
    portalDetails: { id: string; portal_name: string },
  ) {
    let user = await this.findById(id);
    this.logger.debug(
      "Fetched default portal details",
      JSON.stringify(portalDetails),
    );

    if (!user) throw new NotFoundException("user not found");

    user.configuration.validatedZoho = true;
    user.configuration.zohoRefreshToken = refreshToken;
    user.configuration.portal = {
      id: portalDetails?.id,
      name: portalDetails?.portal_name,
    };

    return user.save();
  }

  async udpateZohoUser(id: string, zohoUserId: string) {
    let user = await this.findById(id);
    this.logger.debug("Fetched default zohoUserId", JSON.stringify(zohoUserId));

    if (!user) throw new NotFoundException("user not found");

    user.configuration.zohoUserId = zohoUserId;

    return user.save();
  }

  async revokeZohoRefreshToken(id: string): Promise<UserDocument> {
    this.logger.debug("revokeZohoRefreshToken", id);
    let user = await this.findById(id);

    if (!user) throw new NotFoundException("user not found");

    user.configuration.validatedZoho = false;
    user.configuration.zohoRefreshToken = "";
    user.configuration.portal = null;
    user.configuration.projects = [];
    return user.save();
  }

  async updateUserDetails(id: string, userData: User) {
    this.logger.debug("updateUserDetails", id, JSON.stringify(userData));
    const user = await this.userModel
      .findByIdAndUpdate(id, { ...userData }, { new: true })
      .exec();
    if (!user) {
      throw new NotFoundException("user not found");
    }
    return user;
  }

  async updateZohoProject(
    id: string,
    projects: Portal[],
    defaultProject: Portal,
  ) {
    this.logger.debug("updateZohoProject", id);
    this.logger.debug(`Selected Projects ${JSON.stringify(projects)}`);
    this.logger.debug(`Default Projects ${JSON.stringify(defaultProject)}`);
    let user = await this.findById(id);
    if (!user) throw new NotFoundException("user not found");
    user.configuration.projects = projects;
    user.configuration.defaultProject = defaultProject;
    return user.save();
  }
}
