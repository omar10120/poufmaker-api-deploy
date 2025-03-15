import { NextRequest, NextResponse } from "next/server";
import { swaggerDefinition } from "./swaggerConfig";

/**
 * @swagger
 * /api/swagger:
 *   get:
 *     summary: Get OpenAPI specification
 *     description: Returns the OpenAPI specification for the API
 *     responses:
 *       200:
 *         description: OpenAPI specification in JSON format
 */
export async function GET(request: NextRequest) {
  return NextResponse.json(swaggerDefinition, {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
