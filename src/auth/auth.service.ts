import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { UserDocument } from "../users/schemas/user.schema";
import { UsersService } from "../users/users.service";
import { GoogleProfile } from "./interfaces/google-profile.interface";

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async loginWithGoogle(profile: GoogleProfile) {
    const user = await this.usersService.findOrCreateFromGoogle(profile);
    return this.signToken(user);
  }

  signToken(user: UserDocument) {
    const payload = { sub: user._id.toString(), email: user.email };
    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        userProfileUrl: user.userProfileUrl,
      },
    };
  }
}
