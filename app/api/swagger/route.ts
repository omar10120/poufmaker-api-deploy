import { NextRequest, NextResponse } from "next/server";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerConfig from "./swaggerConfig";
import fs from "fs";
import path from "path";

/**
 * @swagger
 * /api/swagger:
 *   get:
 *     summary: Get OpenAPI specification
 *     responses:
 *       200:
 *         description: OpenAPI specification in JSON format
 */
export async function GET(request: NextRequest) {
  try {
    // Generate Swagger spec
    const swaggerSpec = swaggerJsdoc({
      ...swaggerConfig,
      apis: swaggerConfig.apis.map(pattern => 
        pattern.replace(/\\/g, '/') // Ensure forward slashes for glob patterns
      ),
    });

    // Always save spec to public directory
    const publicDir = path.join(process.cwd(), 'public');
    fs.writeFileSync(
      path.join(publicDir, 'openapi.json'),
      JSON.stringify(swaggerSpec, null, 2)
    );

    return NextResponse.json(swaggerSpec, {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("Error generating swagger spec:", error);
    return NextResponse.json(
      { error: "Failed to generate API documentation" },
      { status: 500 }
    );
  }
}
