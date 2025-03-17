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
      Product: {
        type: "object",
        properties: {
          Id: { type: "string", format: "uuid" },
          Title: { type: "string" },
          Description: { type: "string" },
          Price: { type: "number", format: "float" },
          ImageUrl: { type: "string", format: "uri" },
          Status: { 
            type: "string", 
            enum: ["ai-generated", "pending", "approved", "rejected"],
            default: "ai-generated"
          },
          CreatorId: { type: "string", format: "uuid" },
          ManufacturerId: { type: "string", format: "uuid" },
          CreatedAt: { type: "string", format: "date-time" },
          UpdatedAt: { type: "string", format: "date-time" },
          users_products_CreatorIdTousers: { $ref: "#/components/schemas/User" },
          users_products_ManufacturerIdTousers: { $ref: "#/components/schemas/User" },
          bids: {
            type: "array",
            items: { $ref: "#/components/schemas/Bid" }
          }
        }
      },
      Bid: {
        type: "object",
        properties: {
          Id: { type: "string", format: "uuid" },
          ProductId: { type: "string", format: "uuid" },
          UpholstererId: { type: "string", format: "uuid" },
          Amount: { type: "number", format: "float" },
          Status: { 
            type: "string",
            enum: ["pending", "accepted", "rejected"],
            default: "pending"
          },
          Notes: { type: "string" },
          CreatedAt: { type: "string", format: "date-time" },
          UpdatedAt: { type: "string", format: "date-time" }
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
  ],
  tags: [
    {
      name: "Auth",
      description: "Authentication endpoints"
    },
    {
      name: "Products",
      description: "Product management endpoints"
    }
  ]
};

const options = {
  definition: swaggerDefinition,
  apis: [path.join(process.cwd(), "app/api/**/*.ts")]
};

export default options;
