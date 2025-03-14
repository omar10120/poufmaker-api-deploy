import fs from "fs";
import path from "path";
import swaggerJSDoc from "swagger-jsdoc";
import swaggerConfig from "../api/swagger/swaggerConfig"; // Adjust the path if needed

const swaggerSpec = swaggerJSDoc(swaggerConfig);

// Ensure `public/` exists
const outputPath = path.resolve(process.cwd(), "public/openapi.json");
fs.writeFileSync(outputPath, JSON.stringify(swaggerSpec, null, 2));

console.log("✅ Swagger documentation generated successfully!");
