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
const conversationUpdateSchema = z.object({
  UserName: z.string().min(1, "Name is required").optional(),
  UserPhone: z.string().optional(),
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
 * /api/conversations/{id}:
 *   get:
 *     tags:
 *       - Conversations
 *     summary: Get conversation
 *     description: Get details of a specific conversation
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Conversation ID
 *     responses:
 *       200:
 *         description: Conversation details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Conversation'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Conversation not found
 *       500:
 *         description: Internal server error
 */
export async function GET(request: NextRequest, context: Context) {
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { headers: corsHeaders });
  }

  try {
    // Verify token
    const decoded = await verifyToken(request);
    
    // Get params
    const { id } = await context.params;

    // Get conversation
    const conversation = await prisma.conversations.findUnique({
      where: { Id: id },
      include: {
        users: {
          select: {
            Id: true,
            FullName: true,
            Email: true,
          },
        },
        messages: {
          orderBy: {
            CreatedAt: 'desc',
          },
          take: 50, // Get last 50 messages
        },
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { 
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    // Check if user has access
    if (conversation.UserId !== decoded.sub && decoded.role !== 'admin') {
      return NextResponse.json(
        { error: "Forbidden - you don't have access to this conversation" },
        { 
          status: 403,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    return NextResponse.json(conversation, { 
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  } catch (error) {
    console.error("Error fetching conversation:", error);

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
 * /api/conversations/{id}:
 *   put:
 *     tags:
 *       - Conversations
 *     summary: Update conversation
 *     description: Update an existing conversation
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Conversation ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               UserName:
 *                 type: string
 *                 example: "John Doe"
 *               UserPhone:
 *                 type: string
 *                 example: "+1234567890"
 *     responses:
 *       200:
 *         description: Conversation updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Conversation'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Conversation not found
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

    // Get existing conversation
    const existingConversation = await prisma.conversations.findUnique({
      where: { Id: id },
    });

    if (!existingConversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
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
    if (existingConversation.UserId !== decoded.sub && decoded.role !== 'admin') {
      return NextResponse.json(
        { error: "Forbidden - you don't have permission to update this conversation" },
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
    const validatedData = conversationUpdateSchema.parse(body);

    // Update conversation
    const updatedConversation = await prisma.conversations.update({
      where: { Id: id },
      data: {
        ...validatedData,
        UpdatedAt: new Date(),
      },
      include: {
        users: {
          select: {
            Id: true,
            FullName: true,
            Email: true,
          },
        },
      },
    });

    return NextResponse.json(updatedConversation, { 
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  } catch (error) {
    console.error("Error updating conversation:", error);

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
 * /api/conversations/{id}:
 *   delete:
 *     tags:
 *       - Conversations
 *     summary: Delete conversation
 *     description: Delete an existing conversation and all its messages
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Conversation ID
 *     responses:
 *       200:
 *         description: Conversation deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Conversation not found
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

    // Get existing conversation
    const existingConversation = await prisma.conversations.findUnique({
      where: { Id: id },
    });

    if (!existingConversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
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
    if (existingConversation.UserId !== decoded.sub && decoded.role !== 'admin') {
      return NextResponse.json(
        { error: "Forbidden - you don't have permission to delete this conversation" },
        { 
          status: 403,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    // Delete conversation and its messages
    await prisma.conversations.delete({
      where: { Id: id },
    });

    return NextResponse.json(
      { message: "Conversation deleted successfully" },
      { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  } catch (error) {
    console.error("Error deleting conversation:", error);

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
