import { auth } from "@/auth";
import { redirect } from "next/navigation";
import SignOutButton from "./SignOutButton";

export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const { name, email } = session.user;
  const initials = name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : email?.[0]?.toUpperCase() ?? "?";

  return (
    <div className="flex min-h-screen items-center justify-center bg-white dark:bg-zinc-950 px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-full bg-zinc-900 dark:bg-zinc-50 flex items-center justify-center text-white dark:text-zinc-900 text-xl font-bold">
            {initials}
          </div>
          <div className="text-center">
            {name && (
              <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                {name}
              </p>
            )}
            <p className="text-sm text-zinc-500 dark:text-zinc-300">{email}</p>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-200 dark:divide-zinc-800 mb-6">
          <div className="px-4 py-3">
            <p className="text-xs font-medium text-zinc-600 uppercase tracking-wide mb-0.5">
              Name
            </p>
            <p className="text-sm text-zinc-900 dark:text-zinc-50">
              {name ?? <span className="text-zinc-600 italic">Not set</span>}
            </p>
          </div>
          <div className="px-4 py-3">
            <p className="text-xs font-medium text-zinc-600 uppercase tracking-wide mb-0.5">
              Email
            </p>
            <p className="text-sm text-zinc-900 dark:text-zinc-50">{email}</p>
          </div>
        </div>

        <SignOutButton />
      </div>
    </div>
  );
}
