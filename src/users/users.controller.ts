import { Controller, Get, Patch, Req, UseGuards } from "@nestjs/common";
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

  @Patch("")
  @UseGuards(JwtAuthGuard)
  updateUserDetails(@Req() req: any) {
    return this.usersService.updateUserDetails(req?.user?._id, req.body);
  }
  @Patch("zoho-projects")
  @UseGuards(JwtAuthGuard)
  updateZohoProject(@Req() req: any) {
    return this.usersService.updateZohoProject(
      req?.user?._id,
      req.body.projects,
      req.body.defaultProject,
    );
  }
}
