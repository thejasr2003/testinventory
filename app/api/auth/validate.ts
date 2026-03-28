import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function validate() {
  const cookieStore = cookies();
  const token = (await cookieStore).get("token")?.value;

  // If token not found → redirect to login
  if (!token) {
    redirect("/login");
  }

  // Return token if found
  return token;
}
