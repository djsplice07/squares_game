import { Role } from '@prisma/client';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

declare module 'next-auth' {
  interface Session {
    user: SessionUser;
  }

  interface User {
    role: Role;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: Role;
    id: string;
    name?: string;
  }
}
