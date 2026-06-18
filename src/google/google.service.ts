import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { google, sheets_v4 } from "googleapis";
import * as nodemailer from "nodemailer";
import { recipent } from "src/common/recipent";

@Injectable()
export class GoogleService {
  private readonly logger = new Logger(GoogleService.name);

  constructor(private readonly configService: ConfigService) {}

  private getConfig(key: string): string {
    return this.configService.getOrThrow<string>(key);
  }

  private getOAuth2Client(refreshToken: string) {
    const oauth2Client = new google.auth.OAuth2(
      this.getConfig("GOOGLE_CLIENT_ID"),
      this.getConfig("GOOGLE_CLIENT_SECRET"),
      this.getConfig("GOOGLE_OAUTH_API"),
    );
    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });
    return oauth2Client;
  }

  private getSheetsClient(refreshToken: string): sheets_v4.Sheets {
    const auth = this.getOAuth2Client(refreshToken);
    return google.sheets({ version: "v4", auth });
  }

  async configTransporter(refreshToken: string, email: string) {
    const oauth2Client = this.getOAuth2Client(refreshToken);
    const accessTokenResult = await oauth2Client.getAccessToken();

    if (!accessTokenResult.token) {
      throw new Error("Unable to generate access token");
    }

    const clientId = this.getConfig("GOOGLE_CLIENT_ID");
    const clientSecret = this.getConfig("GOOGLE_CLIENT_SECRET");

    return nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        type: "OAuth2",
        user: email,
        clientId,
        clientSecret,
        refreshToken,
        accessToken: accessTokenResult.token,
      },
    });
  }

  async sendMail(
    accessToken: string,
    email:string,
    subject: string,
    html: string,
  ): Promise<void> {
    const transporter = await this.configTransporter(accessToken, email);
    const nodeEnv = this.getConfig("NODE_ENV");
    await transporter.verify();

    const emails = recipent[nodeEnv as keyof typeof recipent] ?? recipent.DEV;
    const result = await transporter.sendMail({
      ...emails,
      from: emails.sender,
      subject,
      html,
    });

    this.logger.log(`Email sent. MessageId: ${result.messageId}`);
  }

  async getSheetRows(
    accessToken: string,
    range: string = "Sheet1!A:C",
  ): Promise<{ task: string; duration: number }[]> {
    const sheets = this.getSheetsClient(accessToken);
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: this.getConfig("GOOGLE_SHEETS_ID"),
      range,
    });

    const [_header, ...rows] = (response.data.values as string[][]) ?? [];
    const today = new Date().toISOString().split("T")[0];

    const rowResult = rows
      .filter(
        (row) =>
          row.length > 0 &&
          row[2] === today &&
          Boolean(row[0]) &&
          !isNaN(Number(String(row[1]).trim())),
      )
      .map((row) => ({
        task: row[0],
        duration: Number(String(row[1]).trim()),
      }));
    this.logger.debug(`respoonse from sheets ${JSON.stringify(rowResult)}`);
    return rowResult;
  }
}
