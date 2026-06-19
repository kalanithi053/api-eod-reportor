import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiService } from "../common/api.service";
import { GoogleService } from "../google/google.service";
import { StatusMailPayload } from "../types/report.interface";
import { UserDocument } from "../users/schemas/user.schema";
import { UsersService } from "../users/users.service";
import { getLogBuiilder, sendResponse } from "../utils/getLog.builder";
import { htmlGenerator } from "../utils/mail-template";
import { createOAuthAuthorizeUrl } from "../utils/oauth.util";
import { generateSubject } from "../utils/stringManipulation.helper";

interface ZohoTokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  api_domain?: string;
  token_type?: string;
}

@Injectable()
export class ZohoService {
  private readonly logger = new Logger(ZohoService.name);

  private readonly authUrl: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;
  private readonly scopes: string;
  private readonly projectApiBaseUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UsersService,
    private readonly apiService: ApiService,
    private readonly googleService: GoogleService,
  ) {
    this.authUrl = this.configService.getOrThrow<string>("ZOHO_AUTH_URL");
    this.clientId = this.configService.getOrThrow<string>("ZOHO_CLIENT_ID");
    this.clientSecret =
      this.configService.getOrThrow<string>("ZOHO_CLIENT_SECRET");
    this.redirectUri =
      this.configService.getOrThrow<string>("ZOHO_REDIRECT_URI");
    this.scopes = this.configService.getOrThrow<string>("ZOHO_OAUTH_SCOPES");
    this.projectApiBaseUrl = this.configService.getOrThrow<string>(
      "ZOHO_PROJECT_API_BASE_URL",
    );
  }

  getAuthorizationUrl(userId: string): string {
    this.logger.debug(`Generating Zoho auth URL for user: ${userId}`);

    return createOAuthAuthorizeUrl({
      baseUrl: this.authUrl,
      clientId: this.clientId,
      redirectUri: this.redirectUri,
      scope: this.scopes,
      state: userId,
    });
  }

  async generateToken(
    code: string,
    userId: string,
  ): Promise<ZohoTokenResponse> {
    const response = await this.exchangeToken({
      grant_type: "authorization_code",
      code,
      redirect_uri: this.redirectUri,
    });

    if (!response?.refresh_token || !response?.access_token) {
      throw new InternalServerErrorException("Failed to generate Zoho tokens");
    }

    this.logger.debug("Fetching Zoho portals");

    const portals: any = await this.fetchPortals(response.access_token);

    const defaultPortal = portals.find(
      (portal: any) => portal.portal_name === "amwhizcom",
    );

    await this.userService.udpateZohoDetails(
      userId,
      response.refresh_token,
      defaultPortal,
    );

    return response;
  }

  async generateAccessToken(refreshToken: string): Promise<string> {
    const response = await this.exchangeToken({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    });
    this.logger.debug("Zoho access token refreshed done");
    if (!response?.access_token) {
      throw new InternalServerErrorException("Failed to generate access token");
    }

    return response.access_token;
  }

  async requestZohoProject<T = unknown>(
    accessToken: string,
    options: {
      url: string;
      method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
      params?: Record<string, unknown>;
      data?: unknown;
      headers?: Record<string, string>;
    },
  ): Promise<T> {
    return this.apiService.request<T>({
      ...options,
      url: `${this.projectApiBaseUrl}${options.url}`,
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
        ...options.headers,
      },
    });
  }
  async fetchPortals(accessToken: string) {
    this.logger.debug("Fetching Zoho portals");

    return this.requestZohoProject(accessToken, {
      url: "portals",
      method: "GET",
    });
  }

  async fetchProjects(
    portalId: string,
    refreshToken: string,
    user: UserDocument,
  ) {
    this.logger.debug(`Fetching projects for portal: ${portalId}`);

    try {
      const accessToken = await this.generateAccessToken(refreshToken);

      const response: any = await this.requestZohoProject(accessToken, {
        url: `portal/${portalId}/projects`,
        method: "GET",
      });

      const zohoUserId = response
        .flatMap((item: any) => item.team_members)
        .find(
          (member: any) =>
            member.email?.toLowerCase() === user.email.toLowerCase(),
        )?.zpuid;

      if (zohoUserId) {
        await this.userService.udpateZohoUser(user._id.toString(), zohoUserId);
      }

      return response;
    } catch (error) {
      this.logger.error(
        `Failed to fetch projects for portal ${portalId}`,
        error instanceof Error ? error.stack : JSON.stringify(error),
      );

      throw new InternalServerErrorException("Failed to fetch Zoho projects");
    }
  }

  private async exchangeToken(
    params: Record<string, unknown>,
  ): Promise<ZohoTokenResponse> {
    return this.apiService.request<ZohoTokenResponse>({
      url: `${this.authUrl}/oauth/v2/token`,
      method: "POST",
      params: {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        ...params,
      },
    });
  }

  async getLog(user: UserDocument) {
    // const date = format(new Date(), "yyyy-MM-dd");
    const date = "2026-06-17";
    const { portal, zohoUserId, zohoRefreshToken } = user?.configuration;
    const accessToken = await this.generateAccessToken(zohoRefreshToken);
    const response: any = await this.requestZohoProject(accessToken, {
      url: `portal/${portal?.id}/timelogs`,
      method: "GET",
      params: getLogBuiilder(zohoUserId, date),
    });
    this.logger.log(
      `Total hours ${response.log_hours?.total_hours ?? 0} from ${date} for ${zohoUserId} - ${user.email}`,
    );
    return sendResponse(response);
  }

  async sendStatusMail(payload: StatusMailPayload, user: UserDocument) {
    this.logger.debug(`Send Mail ${JSON.stringify(payload)}`);

    if (!payload?.projects?.length) return;

    const htmlContent = htmlGenerator({
      ...payload,
      multipleProjects: payload.projects.length > 1,
      singleProject: payload.projects.length === 1,
    });

    const resourceName =
      payload.resourceName || payload.projects[0]?.logs?.[0]?.name || "";

    return await this.googleService.sendMail(
      user,
      generateSubject(resourceName, payload.reportDate),
      htmlContent,
    );
  }

  async triggerJob(user: UserDocument) {
    if (!user.configuration.zohoRefreshToken) {
      throw new InternalServerErrorException(
        "Your Zoho account is not connected",
      );
    }
    if (!user.configuration.zohoUserId) {
      throw new InternalServerErrorException(
        "Your Zoho Project's portal is not connected, update the portal details",
      );
    }
    if (!user.configuration.googleRefreshToken) {
      throw new InternalServerErrorException("Revalidate on Google OAuth");
    }
    if (!user.configuration.recipient?.eodMailTo?.length) {
      throw new InternalServerErrorException(
        "Atleast One Primary recipients of the daily summary is required",
      );
    }
    const logs = await this.getLog(user);
    return await this.sendStatusMail(logs as StatusMailPayload, user);
  }
}
