import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import crypto from "crypto";

// Admin emails that can create users
const ADMIN_EMAILS = ["rahmi@ideatebetter.com"];

// Generate a secure temporary password
function generateTempPassword(): string {
  // Generate 12 character password with letters, numbers, and special chars
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%";
  let password = "";
  const randomBytes = crypto.randomBytes(12);
  for (let i = 0; i < 12; i++) {
    password += chars[randomBytes[i] % chars.length];
  }
  return password;
}

export async function POST(request: NextRequest) {
  try {
    // Check if current user is an admin
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!ADMIN_EMAILS.includes(user.email || "")) {
      return NextResponse.json({ error: "Only admins can create users" }, { status: 403 });
    }

    const body = await request.json();
    const { email, name } = body;

    if (!email || !name) {
      return NextResponse.json({ error: "Email and name are required" }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    // Generate temporary password
    const tempPassword = generateTempPassword();

    // Create user with admin client
    const adminClient = createAdminClient();
    
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email: email.toLowerCase(),
      password: tempPassword,
      email_confirm: true, // Auto-confirm email since admin is creating the user
      user_metadata: {
        full_name: name,
        created_by_admin: true,
      },
    });

    if (createError) {
      console.error("Error creating user:", createError);
      
      if (createError.message.includes("already been registered")) {
        return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
      }
      
      return NextResponse.json({ error: createError.message }, { status: 400 });
    }

    // Add user to the profiles table
    if (newUser.user) {
      await adminClient.from("profiles").upsert({
        id: newUser.user.id,
        email: email.toLowerCase(),
        full_name: name,
        avatar_url: null,
        updated_at: new Date().toISOString(),
      });
    }

    // Send welcome email with temporary password using Supabase's email
    // The user will receive an email with their temporary password
    // Note: In production, you might want to use a custom email service
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://atlas-prototype.com";
    
    // Use Supabase to send a custom email (or use Resend/SendGrid in production)
    // For now, we'll return the temp password to show in the UI
    // In production, you'd send this via email only
    
    return NextResponse.json({
      success: true,
      user: {
        id: newUser.user?.id,
        email: newUser.user?.email,
        name,
      },
      tempPassword, // In production, only send via email, not in response
      message: `User created successfully. Temporary password: ${tempPassword}`,
    });

  } catch (error) {
    console.error("Error in create-user:", error);
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}

// Get list of users (admin only)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!ADMIN_EMAILS.includes(user.email || "")) {
      return NextResponse.json({ error: "Only admins can view users" }, { status: 403 });
    }

    const adminClient = createAdminClient();
    
    const { data: users, error } = await adminClient.auth.admin.listUsers();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Return simplified user data
    const userList = users.users.map(u => ({
      id: u.id,
      email: u.email,
      name: u.user_metadata?.full_name || u.email?.split("@")[0],
      createdAt: u.created_at,
      lastSignIn: u.last_sign_in_at,
      emailConfirmed: u.email_confirmed_at != null,
    }));

    return NextResponse.json({ users: userList });

  } catch (error) {
    console.error("Error listing users:", error);
    return NextResponse.json({ error: "Failed to list users" }, { status: 500 });
  }
}
