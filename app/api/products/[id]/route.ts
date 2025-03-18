import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { z } from "zod";
import jwt from "jsonwebtoken";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version',
  'Access-Control-Allow-Credentials': 'true',
};

// Validation schema
const productUpdateSchema = z.object({
  Title: z.string().min(1, "Title is required").optional(),
  Description: z.string().optional(),
  Price: z.number().min(0).optional(),
  ImageUrl: z.string().url().optional(),
  Status: z.enum(["ai-generated", "pending", "approved", "rejected"]).optional(),
  ManufacturerId: z.string().uuid().optional(),
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

type Context = {
  params: Promise<{ id: string }>;
};

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     tags:
 *       - Products
 *     summary: Get product details
 *     description: Get detailed information about a specific product
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Product not found
 *       500:
 *         description: Internal server error
 */
export async function GET(request: NextRequest, context: Context) {
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { headers: corsHeaders });
  }

  try {
    // Verify token
    await verifyToken(request);
    
    // Get params
    const { id } = await context.params;

    // Get product
    const product = await prisma.products.findUnique({
      where: { Id: id },
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

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { 
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    return NextResponse.json(product, { 
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  } catch (error) {
    console.error("Error fetching product:", error);

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

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     tags:
 *       - Products
 *     summary: Update product
 *     description: Update an existing product
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Product ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               Title:
 *                 type: string
 *                 example: "Updated Modern Pouf"
 *               Description:
 *                 type: string
 *                 example: "An updated comfortable modern pouf"
 *               Price:
 *                 type: number
 *                 format: float
 *                 example: 129.99
 *               ImageUrl:
 *                 type: string
 *                 format: uri
 *                 example: "https://example.com/updated-pouf.jpg"
 *               Status:
 *                 type: string
 *                 enum: [ai-generated, pending, approved, rejected]
 *               ManufacturerId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Product updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - user does not have permission
 *       404:
 *         description: Product not found
 *       500:
 *         description: Internal server error
 */
export async function PUT(request: NextRequest, context: Context) {
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { headers: corsHeaders });
  }

  try {
    // Verify token
    const decoded = await verifyToken(request);
    
    // Get params
    const { id } = await context.params;

    // Get existing product
    const existingProduct = await prisma.products.findUnique({
      where: { Id: id },
    });

    if (!existingProduct) {
      return NextResponse.json(
        { error: "Product not found" },
        { 
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    // Check permissions
    if (existingProduct.CreatorId !== decoded.sub && decoded.role !== 'admin') {
      return NextResponse.json(
        { error: "Forbidden - you don't have permission to update this product" },
        { 
          status: 403,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = productUpdateSchema.parse(body);

    // Update product
    const updatedProduct = await prisma.products.update({
      where: { Id: id },
      data: {
        ...validatedData,
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

    return NextResponse.json(updatedProduct, { 
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  } catch (error) {
    console.error("Error updating product:", error);

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

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     tags:
 *       - Products
 *     summary: Delete product
 *     description: Delete an existing product
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - user does not have permission
 *       404:
 *         description: Product not found
 *       500:
 *         description: Internal server error
 */
export async function DELETE(request: NextRequest, context: Context) {
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { headers: corsHeaders });
  }

  try {
    // Verify token
    const decoded = await verifyToken(request);
    
    // Get params
    const { id } = await context.params;

    // Get existing product
    const existingProduct = await prisma.products.findUnique({
      where: { Id: id },
    });

    if (!existingProduct) {
      return NextResponse.json(
        { error: "Product not found" },
        { 
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    // Check permissions
    if (existingProduct.CreatorId !== decoded.sub && decoded.role !== 'admin') {
      return NextResponse.json(
        { error: "Forbidden - you don't have permission to delete this product" },
        { 
          status: 403,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    // Delete product
    await prisma.products.delete({
      where: { Id: id },
    });

    return NextResponse.json(
      { message: "Product deleted successfully" },
      { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  } catch (error) {
    console.error("Error deleting product:", error);

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
