import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "@/app/lib/prisma";
import { z } from "zod";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version',
  'Access-Control-Allow-Credentials': 'true',
};

// Update schema to match the request format
const loginSchema = z.object({
  Email: z.string().email("Invalid email format"),
  Password: z.string().min(8, "Password must be at least 8 characters"),
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Login user
 *     description: Authenticate a user and return a JWT token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - Email
 *               - Password
 *             properties:
 *               Email:
 *                 type: string
 *                 format: email
 *                 example: "test.user@example.com"
 *               Password:
 *                 type: string
 *                 format: password
 *                 example: "Test@123456"
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Login successful"
 *                 user:
 *                   type: object
 *                   properties:
 *                     Id:
 *                       type: string
 *                       example: "550e8400-e29b-41d4-a716-446655440000"
 *                     Email:
 *                       type: string
 *                       example: "test.user@example.com"
 *                     FullName:
 *                       type: string
 *                       example: "Test User"
 *                     Role:
 *                       type: string
 *                       example: "client"
 *                 token:
 *                   type: string
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Invalid email format"
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Invalid credentials"
 */
export async function POST(request: NextRequest) {
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { headers: corsHeaders });
  }

  try {
    const body = await request.json();
    console.log("Received login body:", body);

    // Transform body to match schema if needed
    const transformedBody = {
      Email: body.Email || body.email,
      Password: body.Password || body.password,
    };

    console.log("Transformed login body:", transformedBody);
    
    // Validate input
    const validatedData = loginSchema.parse(transformedBody);
    const { Email, Password } = validatedData;

    // Find user
    const user = await prisma.users.findUnique({
      where: { Email },
      select: {
        Id: true,
        Email: true,
        FullName: true,
        PasswordHash: true,
        Role: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { 
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    // Verify password
    const validPassword = await bcrypt.compare(Password, user.PasswordHash);
    if (!validPassword) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { 
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    // Create JWT token with shorter expiration and minimal payload
    const token = jwt.sign(
      {
        sub: user.Id,
        role: user.Role,
      },
      process.env.JWT_SECRET || "",
      { expiresIn: "1h" }
    );

    // Get client IP for logging
    const forwardedFor = request.headers.get("x-forwarded-for");
    const clientIp = forwardedFor ? forwardedFor.split(",")[0].trim() : "unknown";

    // Create user session with a shortened token
    const sessionToken = token.substring(0, 250); // Ensure it fits in VARCHAR(255)
    await prisma.usersessions.create({
      data: {
        Id: uuidv4(),
        UserId: user.Id,
        Token: sessionToken,
        ExpiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        IpAddress: clientIp,
        UserAgent: request.headers.get("user-agent") || "",
      },
    });

    // Log successful login
    await prisma.userloginhistory.create({
      data: {
        Id: uuidv4(),
        UserId: user.Id,
        Successful: true,
        IpAddress: clientIp,
        UserAgent: request.headers.get("user-agent") || "",
      },
    });

    // Update last login date
    await prisma.users.update({
      where: { Id: user.Id },
      data: { LastLoginDate: new Date() },
    });

    // Format response to match Swagger schema
    const response = {
      message: "Login successful",
      user: {
        Id: user.Id,
        Email: user.Email,
        FullName: user.FullName,
        Role: user.Role,
      },
      token,
    };

    return NextResponse.json(response, { 
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

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
