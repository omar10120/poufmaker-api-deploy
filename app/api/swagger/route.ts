import { NextRequest, NextResponse } from "next/server";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerConfig from "./swaggerConfig";

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
    const swaggerSpec = swaggerJsdoc(swaggerConfig);
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
