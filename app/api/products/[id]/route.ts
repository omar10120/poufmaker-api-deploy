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
