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
const messageCreateSchema = z.object({
  Content: z.string().min(1, "Message content is required"),
  IsUser: z.boolean().default(true),
});

const querySchema = z.object({
  page: z.string().transform(Number).default("1"),
  limit: z.string().transform(Number).default("50"),
  before: z.string().datetime().optional(),
  after: z.string().datetime().optional(),
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
 * /api/conversations/{id}/messages:
 *   get:
 *     tags:
 *       - Messages
 *     summary: List conversation messages
 *     description: Get messages from a conversation with pagination and filtering
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
 *           default: 50
 *         description: Messages per page
 *       - in: query
 *         name: before
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Get messages before this timestamp
 *       - in: query
 *         name: after
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Get messages after this timestamp
 *     responses:
 *       200:
 *         description: List of messages
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 messages:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Message'
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

    // Check if conversation exists and user has access
    const conversation = await prisma.conversations.findUnique({
      where: { Id: id },
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

    // Parse query parameters
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams);
    const { page, limit, before, after } = querySchema.parse(queryParams);

    // Build where clause
    const where: any = { ConversationId: id };
    if (before) where.CreatedAt = { lt: new Date(before) };
    if (after) where.CreatedAt = { ...where.CreatedAt, gt: new Date(after) };

    // Get total count
    const total = await prisma.messages.count({ where });

    // Get messages with pagination
    const messages = await prisma.messages.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: {
        CreatedAt: 'desc',
      },
    });

    // Calculate pagination info
    const pages = Math.ceil(total / limit);

    return NextResponse.json(
      {
        messages,
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
    console.error("Error fetching messages:", error);

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
 * /api/conversations/{id}/messages:
 *   post:
 *     tags:
 *       - Messages
 *     summary: Send message
 *     description: Send a new message in the conversation
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
 *             required:
 *               - Content
 *             properties:
 *               Content:
 *                 type: string
 *                 example: "Hello!"
 *               IsUser:
 *                 type: boolean
 *                 default: true
 *                 example: true
 *     responses:
 *       201:
 *         description: Message sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Message'
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
export async function POST(request: NextRequest, context: Context) {
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { headers: corsHeaders });
  }

  try {
    // Verify token
    const decoded = await verifyToken(request);
    
    // Get params
    const { id } = await context.params;

    // Check if conversation exists and user has access
    const conversation = await prisma.conversations.findUnique({
      where: { Id: id },
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

    // Parse and validate request body
    const body = await request.json();
    const validatedData = messageCreateSchema.parse(body);

    // Create message
    const message = await prisma.messages.create({
      data: {
        Id: uuidv4(),
        ...validatedData,
        ConversationId: id,
        CreatedAt: new Date(),
      },
    });

    // Update conversation's UpdatedAt
    await prisma.conversations.update({
      where: { Id: id },
      data: { UpdatedAt: new Date() },
    });

    return NextResponse.json(message, { 
      status: 201,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  } catch (error) {
    console.error("Error sending message:", error);

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
