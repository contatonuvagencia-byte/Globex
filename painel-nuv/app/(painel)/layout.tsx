import { Nav } from "@/components/Nav";

export default function PainelLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen md:flex">
      <Nav />
      <main className="min-w-0 flex-1 px-4 py-5 md:py-8 md:pl-5 md:pr-8">{children}</main>
    </div>
  );
}
