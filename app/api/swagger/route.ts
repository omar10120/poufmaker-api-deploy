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
    // In production, use the pre-generated spec
    if (process.env.NODE_ENV === 'production') {
      const specPath = path.join(process.cwd(), 'public', 'openapi.json');
      if (fs.existsSync(specPath)) {
        const spec = JSON.parse(fs.readFileSync(specPath, 'utf-8'));
        return NextResponse.json(spec, {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "no-store, max-age=0",
          },
        });
      }
    }

    // Generate Swagger spec (for development)
    const swaggerSpec = swaggerJsdoc({
      ...swaggerConfig,
      apis: [
        path.join(process.cwd(), 'app/api/**/*.ts').replace(/\\/g, '/'),
      ],
    });

    // Save spec to public directory
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
