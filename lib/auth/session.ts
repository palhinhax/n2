import { auth } from "./config";

export async function getCurrentUser() {
  const session = await auth();
  return session?.user;
}
