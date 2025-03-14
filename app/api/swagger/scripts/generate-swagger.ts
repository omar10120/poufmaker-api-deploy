const swaggerJsdoc = require("swagger-jsdoc");
const fs = require("fs");
const path = require("path");
const swaggerConfig = require("../swaggerConfig"); // Import as CommonJS

const swaggerSpec = swaggerJsdoc(swaggerConfig);

const outputPath = path.resolve(process.cwd(), "public/openapi.json");
fs.writeFileSync(outputPath, JSON.stringify(swaggerSpec, null, 2));

console.log("✅ Swagger documentation generated at:", outputPath);
