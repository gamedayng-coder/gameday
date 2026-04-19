// ARM-79: Registration is closed — internal access only.
import { redirect } from "next/navigation";

export default function RegisterPage() {
  redirect("/login");
}
