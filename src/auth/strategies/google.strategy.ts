import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy, StrategyOptions, VerifyCallback } from "passport-google-oauth20";
import { GoogleProfile } from "../interfaces/google-profile.interface";

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, "google") {
  constructor(configService: ConfigService) {
    const options: StrategyOptions & {
      accessType?: string;
      prompt?: string;
    } = {
      clientID: configService.get<string>("GOOGLE_CLIENT_ID", ""),
      clientSecret: configService.get<string>("GOOGLE_CLIENT_SECRET", ""),
      callbackURL: configService.get<string>("GOOGLE_CALLBACK_URL", ""),
      scope: [
        "email",
        "profile",
        "https://mail.google.com/",
        "https://www.googleapis.com/auth/drive",
        "https://www.googleapis.com/auth/drive.file",
        "https://www.googleapis.com/auth/spreadsheets",
      ],
      accessType: "offline",
      prompt: "consent",
    };
    super(options);
  }

  async validate(
    _accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<void> {
    const { id, name, emails, photos, displayName } = profile;

    const googleUser: GoogleProfile & { refreshToken?: string } = {
      googleId: id,
      email: emails?.[0]?.value ?? "",
      name: name
        ? `${name.givenName ?? ""} ${name.familyName ?? ""}`.trim()
        : displayName ?? "",
      picture: photos?.[0]?.value,
      refreshToken,
    };

    done(null, googleUser);
  }
}
