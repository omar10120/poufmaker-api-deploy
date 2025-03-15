import { SwaggerDefinition } from "swagger-jsdoc";

const swaggerDefinition: SwaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "Poufmaker API",
    version: "1.0.0",
    description: "API documentation for Poufmaker application",
    contact: {
      name: "API Support",
      email: "support@poufmaker.com",
    },
  },
  servers: [
    {
      url: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000",
      description: "API Server",
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
    schemas: {
      User: {
        type: "object",
        properties: {
          Id: { type: "string" },
          Email: { type: "string", format: "email" },
          FullName: { type: "string" },
          PhoneNumber: { type: "string" },
          Role: { type: "string", enum: ["client", "admin", "upholsterer"] },
          EmailConfirmed: { type: "boolean" },
          LastLoginDate: { type: "string", format: "date-time" },
          CreatedAt: { type: "string", format: "date-time" },
          UpdatedAt: { type: "string", format: "date-time" },
        },
      },
      Error: {
        type: "object",
        properties: {
          error: { type: "string" },
        },
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
};

const options = {
  definition: swaggerDefinition,
  apis: ["./app/api/**/*.ts"], // Path to the API routes
};

export default options;
