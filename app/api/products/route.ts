import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import jwt from "jsonwebtoken";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version',
  'Access-Control-Allow-Credentials': 'true',
};

// Validation schemas
const productCreateSchema = z.object({
  Title: z.string().min(1, "Title is required"),
  Description: z.string().optional(),
  Price: z.number().min(0).optional(),
  ImageUrl: z.string().url().optional(),
  Status: z.enum(["ai-generated", "pending", "approved", "rejected"]).default("ai-generated"),
  ManufacturerId: z.string().uuid().optional(),
});

const querySchema = z.object({
  page: z.string().transform(Number).default("1"),
  limit: z.string().transform(Number).default("10"),
  status: z.enum(["ai-generated", "pending", "approved", "rejected"]).optional(),
  creatorId: z.string().uuid().optional(),
  manufacturerId: z.string().uuid().optional(),
});

// Helper function to verify JWT token
async function verifyToken(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.split(" ")[1];
    if (!token) {
      throw new Error("No token provided");
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "") as { sub: string; role: string };
    return decoded;
  } catch (error) {
    throw new Error("Invalid token");
  }
}

/**
 * @swagger
 * /api/products:
 *   get:
 *     tags:
 *       - Products
 *     summary: List products
 *     description: Get a list of products with optional filtering and pagination
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ai-generated, pending, approved, rejected]
 *         description: Filter by status
 *       - in: query
 *         name: creatorId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by creator ID
 *       - in: query
 *         name: manufacturerId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by manufacturer ID
 *     responses:
 *       200:
 *         description: List of products
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 products:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *                     currentPage:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 *   post:
 *     tags:
 *       - Products
 *     summary: Create product
 *     description: Create a new product
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - Title
 *             properties:
 *               Title:
 *                 type: string
 *                 example: "Modern Pouf"
 *               Description:
 *                 type: string
 *                 example: "A comfortable modern pouf with premium fabric"
 *               Price:
 *                 type: number
 *                 format: float
 *                 example: 99.99
 *               ImageUrl:
 *                 type: string
 *                 format: uri
 *                 example: "https://example.com/pouf.jpg"
 *               Status:
 *                 type: string
 *                 enum: [ai-generated, pending, approved, rejected]
 *                 default: ai-generated
 *               ManufacturerId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       201:
 *         description: Product created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

export async function GET(request: NextRequest) {
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { headers: corsHeaders });
  }

  try {
    // Verify token
    const decoded = await verifyToken(request);

    // Parse query parameters
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams);
    const { page, limit, status, creatorId, manufacturerId } = querySchema.parse(queryParams);

    // Build where clause
    const where: any = {};
    if (status) where.Status = status;
    if (creatorId) where.CreatorId = creatorId;
    if (manufacturerId) where.ManufacturerId = manufacturerId;

    // Get total count
    const total = await prisma.products.count({ where });

    // Get products with pagination
    const products = await prisma.products.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        users_products_CreatorIdTousers: {
          select: {
            Id: true,
            FullName: true,
            Email: true,
          },
        },
        users_products_ManufacturerIdTousers: {
          select: {
            Id: true,
            FullName: true,
            Email: true,
          },
        },
        bids: true,
      },
    });

    // Calculate pagination info
    const pages = Math.ceil(total / limit);

    return NextResponse.json(
      {
        products,
        pagination: {
          total,
          pages,
          currentPage: page,
          limit,
        },
      },
      { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  } catch (error) {
    console.error("Error fetching products:", error);

    if (error instanceof Error && error.message === "Invalid token") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { 
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
}

export async function POST(request: NextRequest) {
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { headers: corsHeaders });
  }

  try {
    // Verify token
    const decoded = await verifyToken(request);

    // Parse and validate request body
    const body = await request.json();
    const validatedData = productCreateSchema.parse(body);

    // Create product
    const product = await prisma.products.create({
      data: {
        Id: uuidv4(),
        ...validatedData,
        CreatorId: decoded.sub,
        CreatedAt: new Date(),
        UpdatedAt: new Date(),
      },
      include: {
        users_products_CreatorIdTousers: {
          select: {
            Id: true,
            FullName: true,
            Email: true,
          },
        },
        users_products_ManufacturerIdTousers: {
          select: {
            Id: true,
            FullName: true,
            Email: true,
          },
        },
      },
    });

    return NextResponse.json(product, { 
      status: 201,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  } catch (error) {
    console.error("Error creating product:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { 
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    if (error instanceof Error && error.message === "Invalid token") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { 
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: corsHeaders });
}
