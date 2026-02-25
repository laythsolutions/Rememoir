"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PenLine, ScrollText, BarChart2, BookMarked, Settings } from "lucide-react";

const NAV_ITEMS = [
  { href: "/entry",         icon: PenLine,     label: "Write"    },
  { href: "/timeline",      icon: ScrollText,  label: "Journal"  },
  { href: "/autobiography", icon: BookMarked,  label: "Story"    },
  { href: "/insights",      icon: BarChart2,   label: "Insights" },
  { href: "/settings",      icon: Settings,    label: "Settings" },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-xl border-t border-border/60"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="max-w-2xl mx-auto flex items-stretch justify-around px-1">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              className="flex-1 flex flex-col items-center py-2 group transition-transform duration-100 active:scale-[0.93]"
            >
              <span
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 ${
                  active
                    ? "bg-primary/10"
                    : "group-hover:bg-muted"
                }`}
              >
                <Icon
                  className={`w-[19px] h-[19px] transition-colors duration-200 ${
                    active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                  }`}
                  strokeWidth={active ? 2.4 : 1.75}
                />
                <span
                  className={`text-[10px] font-semibold leading-none transition-colors duration-200 ${
                    active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                  }`}
                >
                  {label}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
