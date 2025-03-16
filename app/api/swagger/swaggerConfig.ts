import { SwaggerDefinition } from "swagger-jsdoc";
import path from "path";

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
      RegisterRequest: {
        type: "object",
        required: ["Email", "Password", "FullName"],
        properties: {
          Email: {
            type: "string",
            format: "email",
            example: "user@example.com"
          },
          Password: {
            type: "string",
            format: "password",
            minLength: 8,
            example: "Test@123456"
          },
          FullName: {
            type: "string",
            example: "John Doe"
          },
          PhoneNumber: {
            type: "string",
            example: "1234567890"
          },
          Role: {
            type: "string",
            enum: ["client", "admin", "upholsterer"],
            default: "client"
          }
        }
      },
      LoginRequest: {
        type: "object",
        required: ["Email", "Password"],
        properties: {
          Email: {
            type: "string",
            format: "email",
            example: "user@example.com"
          },
          Password: {
            type: "string",
            format: "password",
            example: "Test@123456"
          }
        }
      },
      User: {
        type: "object",
        properties: {
          Id: { type: "string" },
          Email: { type: "string", format: "email" },
          FullName: { type: "string" },
          PhoneNumber: { type: "string" },
          Role: { type: "string", enum: ["client", "admin", "upholsterer"] }
        }
      },
      AuthResponse: {
        type: "object",
        properties: {
          message: { type: "string" },
          user: { $ref: "#/components/schemas/User" },
          token: { type: "string" }
        }
      },
      Error: {
        type: "object",
        properties: {
          error: { type: "string" }
        }
      }
    },
    responses: {
      UnauthorizedError: {
        description: "Authentication failed",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Error" }
          }
        }
      },
      ValidationError: {
        description: "Validation failed",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Error" }
          }
        }
      },
      ServerError: {
        description: "Internal server error",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Error" }
          }
        }
      }
    }
  },
  security: [
    {
      bearerAuth: []
    }
  ]
};

const options = {
  definition: swaggerDefinition,
  apis: [path.join(process.cwd(), "app/api/**/*.ts")]
};

export default options;
