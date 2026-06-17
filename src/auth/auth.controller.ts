import { Controller, Get, Logger, Req, Res, UseGuards } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Response } from "express";
import { AuthService } from "./auth.service";
import { GoogleAuthGuard } from "./guards/google-auth.guard";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";

@Controller("auth")
export class AuthController {
  private readonly logger = new Logger(AuthController.name);
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Step 1: kicks off the Google OAuth consent flow.
   * GoogleAuthGuard does the redirect; nothing to do in the handler.
   */
  @Get("google")
  @UseGuards(GoogleAuthGuard)
  googleLogin() {}

  @Get("google/callback")
  @UseGuards(GoogleAuthGuard)
  async googleCallback(@Req() req: any, @Res() res: Response) {
    this.logger.debug(JSON.stringify(req.query));
    const { accessToken, user } = await this.authService.loginWithGoogle({
      ...req.user,
    });

    const frontendUrl = this.configService.get<string>("FRONTEND_REDIRECT_URL");

    if (frontendUrl) {
      return res.redirect(`${frontendUrl}/connect?token=${accessToken}`);
    }
    return res.json({ accessToken, user });
  }

  @Get("profile")
  @UseGuards(JwtAuthGuard)
  getProfile(@Req() req: any) {
    return req.user;
  }
}
