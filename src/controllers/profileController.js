import { db } from "../db/client.js";
import { users, userOauthAccounts } from "../db/schema.js";
import { eq, and, ne, or } from "drizzle-orm";
import { hashPassword, verifyPassword } from "../utils/crypto.js";

// Get user profile with login method detection
export const getProfile = async (req, res) => {
  try {
    const userId = req.user.sub;

    // Get user data
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if user has OAuth account (Google login)
    const oauthAccounts = await db
      .select()
      .from(userOauthAccounts)
      .where(eq(userOauthAccounts.userId, userId));

    // Determine login method
    let loginMethod = "email"; // default
    let canEditEmail = true;
    let canEditPhone = true;

    if (oauthAccounts.length > 0) {
      // Logged in via Google OAuth
      loginMethod = "google";
      canEditEmail = false; // Email comes from Google, cannot edit
      canEditPhone = !user.phone; // Can edit phone if not set
    } else if (user.phone && !user.passwordHash) {
      // Logged in via phone (has phone but no password)
      loginMethod = "phone";
      canEditPhone = false; // Phone is login method, cannot edit
      canEditEmail = !user.email; // Can edit email if not set
    } else if (user.passwordHash) {
      // Logged in via email/password
      loginMethod = "email";
      canEditEmail = false; // Email is login method, cannot edit
      canEditPhone = !user.phone; // Can edit phone if not set
    }

    // Return profile data
    return res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      role: user.role,
      status: user.status,
      emailVerifiedAt: user.emailVerifiedAt,
      phoneVerifiedAt: user.phoneVerifiedAt,
      createdAt: user.createdAt,
      loginMethod,
      canEditEmail,
      canEditPhone,
    });
  } catch (error) {
    console.error("Get profile error:", error);
    return res.status(500).json({ message: "Failed to fetch profile" });
  }
};

// Update user profile
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.sub;
    const { name, email, phone, avatarUrl } = req.body;

    // Get current user data
    const [currentUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check OAuth accounts to determine login method
    const oauthAccounts = await db
      .select()
      .from(userOauthAccounts)
      .where(eq(userOauthAccounts.userId, userId));

    let loginMethod = "email";
    if (oauthAccounts.length > 0) {
      loginMethod = "google";
    } else if (currentUser.phone && !currentUser.passwordHash) {
      loginMethod = "phone";
    }

    // Build update object
    const updateData = {};

    // Validate name
    if (name !== undefined) {
      if (name.trim().length === 0) {
        return res.status(400).json({ message: "Name cannot be empty" });
      }
      updateData.name = name.trim();
    }

    // Avatar URL
    if (avatarUrl !== undefined) {
      updateData.avatarUrl = avatarUrl;
    }

    // Validate email updates
    if (email !== undefined && email !== currentUser.email) {
      // Check login method restrictions
      if (loginMethod === "email") {
        return res.status(400).json({
          message: "Cannot change email. Email is your login method.",
        });
      }
      if (loginMethod === "google") {
        return res.status(400).json({
          message: "Cannot change email. Email comes from your Google account.",
        });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Invalid email format" });
      }

      // Check if email already exists in database
      const [existingEmail] = await db
        .select()
        .from(users)
        .where(and(eq(users.email, email), ne(users.id, userId)))
        .limit(1);

      if (existingEmail) {
        return res.status(400).json({
          message: "Email already exists in our system",
        });
      }

      updateData.email = email.toLowerCase().trim();
      updateData.emailVerifiedAt = null; // Reset verification status
    }

    // Validate phone updates
    if (phone !== undefined && phone !== currentUser.phone) {
      // Check login method restrictions
      if (loginMethod === "phone") {
        return res.status(400).json({
          message: "Cannot change phone number. Phone is your login method.",
        });
      }

      // Validate phone format (basic validation)
      if (phone && phone.trim().length > 0) {
        const phoneRegex = /^[0-9]{10,15}$/;
        if (!phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ""))) {
          return res.status(400).json({ message: "Invalid phone format" });
        }

        // Check if phone already exists in database
        const [existingPhone] = await db
          .select()
          .from(users)
          .where(and(eq(users.phone, phone), ne(users.id, userId)))
          .limit(1);

        if (existingPhone) {
          return res.status(400).json({
            message: "Phone number already exists in our system",
          });
        }

        updateData.phone = phone.trim();
        updateData.phoneVerifiedAt = null; // Reset verification status
      } else {
        // Allow clearing phone if it's not the login method
        updateData.phone = null;
        updateData.phoneVerifiedAt = null;
      }
    }

    // If nothing to update
    if (Object.keys(updateData).length === 0) {
      return res.json({
        message: "No changes to update",
        profile: currentUser,
      });
    }

    // Update user
    await db.update(users).set(updateData).where(eq(users.id, userId));

    // Fetch updated user
    const [updatedUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    // Determine canEdit fields for response
    let canEditEmail = true;
    let canEditPhone = true;

    if (loginMethod === "google") {
      canEditEmail = false;
      canEditPhone = !updatedUser.phone;
    } else if (loginMethod === "phone") {
      canEditPhone = false;
      canEditEmail = !updatedUser.email;
    } else if (loginMethod === "email") {
      canEditEmail = false;
      canEditPhone = !updatedUser.phone;
    }

    return res.json({
      message: "Profile updated successfully",
      profile: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        avatarUrl: updatedUser.avatarUrl,
        role: updatedUser.role,
        status: updatedUser.status,
        emailVerifiedAt: updatedUser.emailVerifiedAt,
        phoneVerifiedAt: updatedUser.phoneVerifiedAt,
        createdAt: updatedUser.createdAt,
        loginMethod,
        canEditEmail,
        canEditPhone,
      },
    });
  } catch (error) {
    console.error("Update profile error:", error);
    return res.status(500).json({ message: "Failed to update profile" });
  }
};

// Change password (only for email/password users)
export const changePassword = async (req, res) => {
  try {
    const userId = req.user.sub;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: "Current password and new password are required",
      });
    }

    // Get user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if user has password (not OAuth or phone login)
    if (!user.passwordHash) {
      return res.status(400).json({
        message:
          "Cannot change password. You are using social login or phone login.",
      });
    }

    // Verify current password
    const isValid = await verifyPassword(currentPassword, user.passwordHash);

    if (!isValid) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    // Validate new password
    if (newPassword.length < 8) {
      return res.status(400).json({
        message: "New password must be at least 8 characters long",
      });
    }

    // Hash and update password
    const newPasswordHash = await hashPassword(newPassword);
    await db
      .update(users)
      .set({ passwordHash: newPasswordHash })
      .where(eq(users.id, userId));

    return res.json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Change password error:", error);
    return res.status(500).json({ message: "Failed to change password" });
  }
};
