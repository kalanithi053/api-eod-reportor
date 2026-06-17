import { ConsoleLogger, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/httpExceptionFilter";
import { ResponseInterceptor } from "./common/interceptor";
async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new ConsoleLogger({
      prefix: "Zoho-EOD",
    }),
  });
  const config = app.get(ConfigService);

  const port = config.get<number>("PORT") ?? 3000;
  const nodeEnv = config.get<string>("NODE_ENV") ?? "DEV";
  const cors = config.getOrThrow<string>("CORS").split(";");
  app.setGlobalPrefix("api/v1");
  app.enableCors({
    origin: cors,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  const swaggerConfig = new DocumentBuilder()
    .setTitle(`Zoho Eod App - (${nodeEnv})`)
    .setDescription("zoho-eod API Documentation")
    .setVersion("1.0")
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("/api/doc", app, document);

  app.useGlobalInterceptors(new ResponseInterceptor());
  await app.listen(port);
}
bootstrap();
