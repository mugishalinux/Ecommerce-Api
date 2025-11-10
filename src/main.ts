import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe, VersioningType } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import * as bodyParser from "body-parser";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  app.enableVersioning({
    type: VersioningType.URI,
    prefix: "api/v",
  });

  app.enableCors({
    origin: process.env.CLIENT_URL_DOMAIN || '*',
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  const config = new DocumentBuilder()
    .setTitle("E-Commerce API")
    .setDescription("REST API for e-commerce platform")
    .setVersion("1.0")
    .addTag("Authentication", "User registration and login endpoints")
    .addTag("Products", "Product management endpoints")
    .addTag("Orders", "Order placement and history endpoints")
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("", app, document);

  app.use(bodyParser.json({ limit: "50mb" }));
  app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));

  // const userService = app.get(UserService);
  // await userService.seedAdmin();

  const port = process.env.NODE_PORT || 3000;
  await app.listen(port);

  console.log(`                                                                                                                
  Project running on: http://localhost:${port}         
  API Documentation: http://localhost:${port}         
  Environment: ${process.env.NODE_ENV || 'development'}                                                                                        
  `);
}

bootstrap();
