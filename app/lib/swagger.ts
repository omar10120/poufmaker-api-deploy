import swaggerJsdoc from "swagger-jsdoc";

const swaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "Next.js API with Swagger",
    version: "1.0.0",
    description: "A simple API documentation using Swagger",
  },
  servers: [
    {
      url: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000",
      description: "API Server",
    },
  ],
};

const options: swaggerJsdoc.Options = {
  definition: swaggerDefinition,
  apis: ["./app/api/**/*.ts"], // Updated path to match App Router structure
};

export default options;
