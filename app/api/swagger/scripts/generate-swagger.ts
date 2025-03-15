import swaggerJsdoc from "swagger-jsdoc";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { swaggerDefinition } from "../swaggerConfig.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const options = {
  definition: swaggerDefinition,
  apis: [path.join(process.cwd(), "app", "api", "auth", "**", "route.ts")],
};

const swaggerSpec = swaggerJsdoc(options);
const outputPath = path.resolve(process.cwd(), "public/openapi.json");
await fs.writeFile(outputPath, JSON.stringify(swaggerSpec, null, 2));

console.log("✅ Swagger documentation generated at:", outputPath);
