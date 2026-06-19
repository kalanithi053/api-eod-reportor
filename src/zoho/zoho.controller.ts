import { Controller, Get, Query, Req, Res, UseGuards } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Response } from "express";
import { JwtAuthGuard } from "../guards/jwt-auth.guard";
import { ZohoService } from "./zoho.service";

@Controller("zoho")
export class ZohoController {
  constructor(
    private readonly zohoService: ZohoService,
    private readonly configService: ConfigService,
  ) {}

  @Get("oauth")
  @UseGuards(JwtAuthGuard)
  login(@Req() req: any) {
    return this.zohoService.getAuthorizationUrl(req?.user?._id);
  }

  @Get("projects")
  @UseGuards(JwtAuthGuard)
  getProjects(@Req() req: any) {
    const projects = this.zohoService.fetchProjects(
      req?.user?.configuration?.portal?.id,
      req?.user?.configuration?.zohoRefreshToken,
      req?.user,
    );
    return projects;
  }

  @Get("callback")
  async callback(
    @Query("code") code: string,
    @Query("state") state: string,
    @Res() res: Response,
  ) {
    await this.zohoService.generateToken(code, state);
    const frontendUrl = this.configService.get<string>("FRONTEND_REDIRECT_URL");
    return res.redirect(
      `${frontendUrl}/connect?path=${encodeURIComponent("/settings?tab=oauth&status=success&Module=zoho")}`,
    );
  }
  @Get("log")
  @UseGuards(JwtAuthGuard)
  async getLog(@Req() req: any) {
    return await this.zohoService.getLog(req?.user);
  }

  @Get("log/draft-mail")
  @UseGuards(JwtAuthGuard)
  async getLogDraftMail(@Req() req: any) {
    return await this.zohoService.triggerJob(req.user);
  }
}
