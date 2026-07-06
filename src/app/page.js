// app/page.js — Server Component que lee la sesión y la pasa al cliente
import { getSession } from "@/lib/session";
import AppClient from "./AppClient";

export default async function Page() {
  const session = await getSession();
  const user = session
    ? { username: session.username, full_name: session.full_name, role: session.role }
    : null;
  return <AppClient user={user} />;
}
