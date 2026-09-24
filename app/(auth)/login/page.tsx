import { LoginForm } from "./login-form";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { fehler } = await searchParams;
  return (
    <div className="flex flex-1 flex-col justify-center gap-8">
      <div>
        <p className="text-4xl font-extrabold">
          LevelUp<span className="text-primary">10</span>
        </p>
        <p className="mt-2 text-muted-foreground">15 Minuten am Tag. Bis zur Prüfung.</p>
      </div>
      {fehler === "profil" ? (
        <p className="rounded-xl bg-red-500/10 p-3 text-sm text-red-300">
          Dein Konto ist noch nicht fertig eingerichtet. Sag Phil Bescheid.
        </p>
      ) : null}
      <LoginForm />
    </div>
  );
}
