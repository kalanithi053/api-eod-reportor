import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/guards/jwt-auth.guard";
import { UsersService } from "./users.service";

@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get("revoke/zoho")
  @UseGuards(JwtAuthGuard)
  revokeZohoRefreshToken(@Req() req: any) {
    return this.usersService.revokeZohoRefreshToken(req?.user?._id);
  }
}
