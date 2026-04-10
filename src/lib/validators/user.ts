import { z } from "zod";

export const roleSchema = z.enum(["admin", "manager", "staff"]);

export const inviteUserSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: roleSchema,
});

export const updateRoleSchema = z.object({
  role: roleSchema,
});

export const updateProfileSchema = z.object({
  firstName: z.string().trim().min(1).optional(),
  lastName: z.string().trim().min(1).optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export type InviteUserInput = z.infer<typeof inviteUserSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
