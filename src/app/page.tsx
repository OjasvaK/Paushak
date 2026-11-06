import { getDictionary } from "@/i18n";

export default function Home() {
  const en = getDictionary("en");
  const hi = getDictionary("hi");

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 py-16">
      <p className="text-sm font-semibold tracking-[0.3em] text-accent uppercase">PAUSHAAK</p>
      <h1 className="mt-4 text-4xl leading-tight font-bold sm:text-5xl">{hi.home.tagline}</h1>
      <p className="mt-2 text-xl text-muted">{en.home.tagline}</p>
      <p className="mt-8 text-lg">{en.home.intro}</p>
      <p className="mt-1 text-lg" lang="hi">
        {hi.home.intro}
      </p>
      <p className="mt-10 text-sm text-muted">{en.home.comingSoon}</p>
    </main>
  );
}
