import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiService } from "src/common/api.service";
import { UserDocument } from "src/users/schemas/user.schema";
import { UsersService } from "src/users/users.service";
import { createOAuthAuthorizeUrl } from "src/utils/oauth.util";

@Injectable()
export class ZohoService {
  private readonly logger = new Logger(ZohoService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UsersService,
    private readonly apiService: ApiService,
  ) {}

  private async retry<T>(
    fn: () => Promise<T>,
    retries = 3,
    delay = 1000,
  ): Promise<T> {
    try {
      return await fn();
    } catch (error: any) {
      if (
        retries > 0 &&
        ["ECONNRESET", "ETIMEDOUT", "ECONNABORTED"].includes(error.code)
      ) {
        await new Promise((resolve) => setTimeout(resolve, delay));

        return this.retry(fn, retries - 1, delay * 2);
      }

      throw error;
    }
  }

  getAuthorizationUrl(id: string) {
    this.logger.debug(`Logger user id ${id}`);

    return createOAuthAuthorizeUrl({
      baseUrl: this.configService.getOrThrow("ZOHO_AUTH_URL"),
      clientId: this.configService.getOrThrow("ZOHO_CLIENT_ID"),
      redirectUri: this.configService.getOrThrow("ZOHO_REDIRECT_URI"),
      scope: this.configService.getOrThrow("ZOHO_OAUTH_SCOPES"),
      state: id,
    });
  }

  async generateToken(code: string, id: string) {
    const accountsUrl = this.configService.get<string>("ZOHO_AUTH_URL");

    const response = await this.apiService.request({
      url: `${accountsUrl}/oauth/v2/token`,
      method: "POST",
      params: {
        grant_type: "authorization_code",
        client_id: this.configService.get("ZOHO_CLIENT_ID"),
        client_secret: this.configService.get("ZOHO_CLIENT_SECRET"),
        redirect_uri: this.configService.get("ZOHO_REDIRECT_URI"),
        code,
      },
    });
    this.logger.log("Zoho token response: ", JSON.stringify(response));
    if (!response) {
      throw new Error("Failed to generate Zoho token");
    }
    if (response.refresh_token && response.access_token) {
      this.logger.debug(`Fetching list of portals available on zoho projects`);
      const portalDetials = await this.fetchPortals(response.access_token);
      this.logger.debug(
        `Fetched list of portals available on zoho projects ${JSON.stringify(portalDetials)}`,
      );
      await this.userService.udpateZohoDetails(
        id,
        response.refresh_token,
        portalDetials.find((portal: any) => portal.portal_name === "amwhizcom"),
      );
    }

    return response;
  }

  async generateAccessToken(refreshToken: string) {
    const accountsUrl = this.configService.get<string>("ZOHO_AUTH_URL");

    const response = await this.apiService.request({
      url: `${accountsUrl}/oauth/v2/token`,
      method: "POST",
      params: {
        grant_type: "refresh_token",
        client_id: this.configService.get("ZOHO_CLIENT_ID"),
        client_secret: this.configService.get("ZOHO_CLIENT_SECRET"),
        refresh_token: refreshToken,
      },
    });

    return response;
  }

  async fetchPortals(accessToken: string) {
    this.logger.debug("Fetching list of portals available on zoho projects");
    const response = await this.apiService.request({
      url: `${this.configService.getOrThrow("ZOHO_PROJECT_API_BASE_URL")}portals`,
      method: "GET",
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
      },
    });
    this.logger.debug(
      `Fetched list of portals available on zoho projects ${JSON.stringify(response)}`,
    );

    return response;
  }

  async fetchProjects(
    portalId: string,
    refreshToken: string,
    user: UserDocument,
  ) {
    this.logger.debug(
      "Fetching list of projects available on zoho projects",
      portalId,
    );
    const url = `${this.configService.getOrThrow("ZOHO_PROJECT_API_BASE_URL")}portal/${portalId}/projects`;
    this.logger.debug(
      "Fetching list of projects available on zoho projects via url",
      url,
    );
    const accessToken = (await this.generateAccessToken(refreshToken))
      ?.access_token;
    try {
      const response = await this.apiService.request({
        url,
        method: "GET",
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`,
        },
      });
      const { team_members } = response?.[0] ?? {};
      const zohoUserId = team_members?.find(
        (member: any) =>
          member.email?.toLowerCase() === user.email.toLowerCase(),
      )?.zpuid;
      await this.userService.udpateZohoUser(user._id.toString(), zohoUserId);

      return response;
    } catch (e: any) {
      this.logger.error(
        `Failed to fetch projects from zoho ${JSON.stringify(e)}`,
        JSON.stringify(e),
      );
    }
  }
}
