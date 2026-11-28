import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z
    .string()
    .refine((value) => Array.from(value).length >= 8, {
      message: "Password must be at least 8 characters long",
    })
    .refine((value) => Array.from(value).length <= 128, {
      message: "Password must be at most 128 characters long",
    })
    .refine((value) => Buffer.byteLength(value, "utf-8") <= 512, {
      message: "Password must be at most 512 bytes long",
    })
    .refine(
      (value) =>
        /\p{Lu}/u.test(value) && /\p{Ll}/u.test(value) && /\p{Nd}/u.test(value),
      {
        message:
          "Password must contain an uppercase letter, a lowercase letter, and a number",
      },
    ),
});

export type RegisterInput = z.infer<typeof registerSchema>;
