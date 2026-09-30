import Link from "next/link";

import { CATEGORIES } from "@/lib/categories";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-20 text-center sm:px-6">
      <span className="text-6xl" aria-hidden>
        🏁
      </span>
      <h1 className="mt-5 font-display text-3xl font-black tracking-tight text-white sm:text-4xl">
        Full time. Nothing here.
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-400">
        That page does not exist, or the story it pointed to has aged out of the database. SportWorld keeps headlines
        for a rolling window rather than archiving them forever.
      </p>

      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link href="/" className="btn btn-primary">
          ← Back to headlines
        </Link>
        <Link href="/latest" className="btn">
          Latest news
        </Link>
      </div>

      <div className="mt-8 w-full">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Browse a sport</p>
        <div className="flex flex-wrap justify-center gap-2">
          {CATEGORIES.slice(0, 9).map((category) => (
            <Link key={category.slug} href={`/category/${category.slug}`} className="chip hover:text-white">
              <span aria-hidden>{category.emoji}</span>
              {category.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
