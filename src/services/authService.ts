import type { LoginCredentials, AuthResponse, User } from "@/types/auth";

const MOCK_USER: User = {
  id: "1",
  name: "Admin User",
  email: "admin@example.com",
  role: "admin",
};

const MOCK_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock-jwt-token";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    await delay(800);

    if (
      credentials.email === "admin@example.com" &&
      credentials.password === "password123"
    ) {
      return { user: MOCK_USER, token: MOCK_TOKEN };
    }

    throw new Error("Invalid email or password");
  },

  async getCurrentUser(): Promise<User> {
    await delay(300);
    return MOCK_USER;
  },
};
