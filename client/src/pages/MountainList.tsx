import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useState, useMemo } from "react";
import { Search, MapPin, TrendingUp, Ticket, ChevronRight, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { Mountain } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

const BASE_CATEGORIES = ["五岳", "佛教名山", "道教名山", "徒步", "地貌/网红", "其他山头"];

const DIFFICULTY_COLORS: Record<string, string> = {
  "简单": "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/40 dark:text-green-400 dark:border-green-800/50",
  "中等": "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/40 dark:text-yellow-400 dark:border-yellow-800/50",
  "困难": "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/40 dark:text-orange-400 dark:border-orange-800/50",
  "专业": "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-400 dark:border-red-800/50",
};

const CATEGORY_EMOJI: Record<string, string> = {
  "五岳": "⛰️",
  "佛教名山": "🛕",
  "道教名山": "☯️",
  "徒步": "🥾",
  "地貌/网红": "📸",
  "其他山头": "🏔️",
};

export function MountainList() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("全部");

  const { data: mountains = [], isLoading } = useQuery<Mountain[]>({
    queryKey: ["/api/mountains"],
    queryFn: () => apiRequest("GET", "/api/mountains").then(r => r.json()),
  });

  // Build dynamic category list from actual data
  const categories = useMemo(() => {
    const existing = new Set(mountains.map(m => m.category));
    const ordered = BASE_CATEGORIES.filter(c => existing.has(c));
    // Add any categories not in base list
    existing.forEach(c => { if (!BASE_CATEGORIES.includes(c)) ordered.push(c); });
    return ["全部", ...ordered];
  }, [mountains]);

  const filtered = mountains.filter(m => {
    const matchSearch = search === "" ||
      m.name.includes(search) ||
      m.province.includes(search);
    const matchCategory = activeCategory === "全部" || m.category === activeCategory;
    return matchSearch && matchCategory;
  });

  // Group by category for display
  const catOrder = categories.slice(1); // without "全部"
  const grouped = activeCategory === "全部"
    ? catOrder.map(cat => ({
        category: cat,
        mountains: filtered.filter(m => m.category === cat),
      })).filter(g => g.mountains.length > 0)
    : [{ category: activeCategory, mountains: filtered }];

  return (
    <div className="max-w-7xl mx-auto px-4 pb-20 sm:pb-8">
      {/* Hero Section */}
      <div className="py-8 sm:py-12 flex items-end justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gold-gradient mb-2">中国名山</h1>
          <p className="text-muted-foreground text-sm">
            {mountains.length} 座名山等你征服
          </p>
        </div>
        <Link href="/admin/add">
          <button className="shrink-0 flex items-center gap-1.5 px-4 py-2 bg-primary/10 text-primary border border-primary/30 rounded-lg text-sm hover:bg-primary/20 transition-colors">
            <Plus className="w-4 h-4" />
            添加
          </button>
        </Link>
      </div>

      {/* Search & Filter */}
      <div className="space-y-3 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜索山名、省份..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-card border-border"
            data-testid="input-search"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-sm transition-all ${
                activeCategory === cat
                  ? "bg-primary text-primary-foreground font-medium"
                  : "bg-card text-muted-foreground hover:text-foreground border border-border"
              }`}
              data-testid={`filter-${cat}`}
            >
              {cat !== "全部" && CATEGORY_EMOJI[cat] && <span className="mr-1">{CATEGORY_EMOJI[cat]}</span>}
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Mountain List */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="skeleton h-36 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg mb-2">没有找到匹配的山岳</p>
          <p className="text-sm">试试其他搜索词或分类</p>
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map(group => (
            <section key={group.category}>
              {activeCategory === "全部" && (
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-lg">{CATEGORY_EMOJI[group.category] || "🏔️"}</span>
                  <h2 className="text-lg font-semibold text-foreground">{group.category}</h2>
                  <span className="text-sm text-muted-foreground">({group.mountains.length})</span>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {group.mountains.map(m => (
                  <MountainCard key={m.id} mountain={m} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function MountainCard({ mountain }: { mountain: Mountain }) {
  return (
    <Link href={`/mountain/${mountain.id}`}>
      <div
        className="group bg-card border border-card-border rounded-xl overflow-hidden cursor-pointer transition-all hover:border-primary/30 hover:bg-card/80"
        data-testid={`card-mountain-${mountain.id}`}
      >
        {/* Cover image */}
        {mountain.imageUrl && (
          <div className="relative h-36 w-full overflow-hidden bg-muted">
            <img
              src={mountain.imageUrl}
              alt={mountain.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-card/60 via-transparent to-transparent" />
          </div>
        )}
        <div className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                {mountain.name}
              </h3>
              <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                <MapPin className="w-3 h-3" />
                {mountain.province}
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors mt-1" />
          </div>

          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <Badge variant="outline" className={DIFFICULTY_COLORS[mountain.difficulty] || ""}>
              {mountain.difficulty}
            </Badge>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              {mountain.elevation}m
            </span>
            {mountain.ticketPrice !== null && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Ticket className="w-3 h-3" />
                ¥{mountain.ticketPrice}
              </span>
            )}
          </div>

          {mountain.highlights && mountain.highlights.length > 0 && (
            <div className="flex gap-1.5 flex-wrap">
              {mountain.highlights.slice(0, 3).map((h: string) => (
                <span key={h} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary/80">
                  {h}
                </span>
              ))}
              {mountain.highlights.length > 3 && (
                <span className="text-[10px] text-muted-foreground">+{mountain.highlights.length - 3}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
