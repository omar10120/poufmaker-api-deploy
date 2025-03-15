import { type Options } from "swagger-jsdoc";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const swaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "Poufmaker API",
    version: "1.0.0",
    description: "API documentation for Poufmaker authentication endpoints",
  },
  servers: [
    {
      url: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000",
      description: "Development server",
    },
  ],
  tags: [
    {
      name: "Auth",
      description: "Authentication endpoints for user registration and login",
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
  },
};

const options: Options = {
  definition: swaggerDefinition,
  apis: [
    join(__dirname, "..", "api", "auth", "**", "route.ts"),
  ],
};

export { swaggerDefinition, options };
