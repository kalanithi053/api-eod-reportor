import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiService } from "src/common/api.service";
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
    this.logger.log("Zoho token response: ", response);
    if (!response) {
      throw new Error("Failed to generate Zoho token");
    }

    if (response.refresh_token) {
      await this.userService.updateZohoRefreshToken(id, response.refresh_token);
    }

    return response;
  }

  async generateAccessToken(refreshToken: string) {
    const accountsUrl = this.configService.get<string>("ZOHO_ACCOUNTS_URL");

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

    return response.data;
  }
}
