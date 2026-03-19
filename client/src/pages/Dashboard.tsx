import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Mountain, TrendingUp, Target, MapPin, Star, Calendar, Trophy, ChevronRight, Footprints, CalendarDays } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Mountain as MountainType, CheckinLog } from "@shared/schema";

const CATEGORY_EMOJI: Record<string, string> = {
  "五岳": "⛰️",
  "佛教名山": "🛕",
  "道教名山": "☯️",
  "徒步": "🥾",
  "地貌/网红": "📸",
};

export function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<any>({
    queryKey: ["/api/stats/user1"],
    queryFn: () => apiRequest("GET", "/api/stats/user1").then(r => r.json()),
  });

  const { data: mountains = [] } = useQuery<MountainType[]>({
    queryKey: ["/api/mountains"],
    queryFn: () => apiRequest("GET", "/api/mountains").then(r => r.json()),
  });

  const { data: checkins = [] } = useQuery<CheckinLog[]>({
    queryKey: ["/api/checkins", { userId: "user1" }],
    queryFn: () => apiRequest("GET", "/api/checkins?userId=user1").then(r => r.json()),
  });

  if (statsLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="skeleton h-8 w-48 mb-6 rounded" />
        <div className="grid grid-cols-2 gap-4 mb-6">
          {[1,2,3,4].map(i => <div key={i} className="skeleton h-24 rounded-xl" />)}
        </div>
        <div className="skeleton h-64 rounded-xl" />
      </div>
    );
  }

  if (!stats) return null;

  const completedMountains = mountains.filter(m => stats.completedMountainIds?.includes(m.id));
  const plannedMountains = mountains.filter(m => stats.plannedMountainIds?.includes(m.id));
  const recentLogs = checkins.filter(l => l.status === "completed").slice(-5).reverse();

  return (
    <div className="max-w-4xl mx-auto px-4 pb-20 sm:pb-8">
      {/* Header */}
      <div className="py-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">🏔️</span>
          <div>
            <h1 className="text-xl font-bold text-gold-gradient">山行者 的打卡看板</h1>
            <p className="text-xs text-muted-foreground">征服名山，记录足迹</p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <KPICard icon={<Target className="w-4 h-4" />} label="已打卡" value={stats.completedCount} unit="座" color="text-green-400" />
        <KPICard icon={<CalendarDays className="w-4 h-4" />} label="登山天数" value={stats.totalDays || 0} unit="天" color="text-cyan-400" />
        <KPICard icon={<Footprints className="w-4 h-4" />} label="总步数" value={(stats.totalSteps || 0).toLocaleString()} unit="步" color="text-violet-400" />
        <KPICard icon={<TrendingUp className="w-4 h-4" />} label="累计海拔" value={stats.totalElevation.toLocaleString()} unit="m" color="text-primary" />
        <KPICard icon={<Star className="w-4 h-4" />} label="累计花费" value={`¥${stats.totalExpenses.toLocaleString()}`} unit="" color="text-orange-400" />
        <KPICard icon={<Calendar className="w-4 h-4" />} label="计划中" value={stats.plannedCount} unit="座" color="text-blue-400" />
      </div>

      {/* Overall Progress */}
      <Card className="bg-card border-card-border mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-primary flex items-center gap-1.5">
            <Mountain className="w-4 h-4" />
            总进度
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl font-bold text-foreground">{stats.completedCount}</span>
            <span className="text-muted-foreground text-sm">/ {stats.totalMountains} 座</span>
          </div>
          <Progress value={(stats.completedCount / stats.totalMountains) * 100} className="h-2 mb-4" />

          {/* Category breakdown */}
          <div className="space-y-3">
            {stats.categoryStats?.map((cat: any) => (
              <div key={cat.category}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">
                    {CATEGORY_EMOJI[cat.category]} {cat.category}
                  </span>
                  <span className="text-foreground font-medium">{cat.done}/{cat.total}</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${cat.total > 0 ? (cat.done / cat.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* China Map Visualization */}
      <Card className="bg-card border-card-border mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-primary flex items-center gap-1.5">
            <MapPin className="w-4 h-4" />
            打卡地图
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChinaMapSimple
            completedIds={stats.completedMountainIds || []}
            plannedIds={stats.plannedMountainIds || []}
            wishlistIds={stats.wishlistMountainIds || []}
            mountains={mountains}
          />
          <div className="flex items-center gap-4 mt-3 text-[10px]">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> 已去</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> 计划中</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500" /> 想去</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-muted" /> 未去</span>
          </div>
        </CardContent>
      </Card>

      {/* Activity Heatmap */}
      <Card className="bg-card border-card-border mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-primary flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            年度活动
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityHeatmap activity={stats.monthlyActivity || {}} />
        </CardContent>
      </Card>

      {/* Recent Logs */}
      <Card className="bg-card border-card-border mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-primary flex items-center gap-1.5">
            <Trophy className="w-4 h-4" />
            最近打卡
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentLogs.length > 0 ? (
            <div className="space-y-3">
              {recentLogs.map(log => {
                const m = mountains.find(mt => mt.id === log.mountainId);
                return (
                  <Link key={log.id} href={`/mountain/${log.mountainId}`}>
                    <div className="flex items-center justify-between py-2 cursor-pointer hover:bg-muted/20 rounded-lg px-2 -mx-2 transition-colors">
                      <div>
                        <p className="text-sm font-medium text-foreground">{m?.name || "未知"}</p>
                        <p className="text-xs text-muted-foreground">
                          {(() => {
                            const la = log as any;
                            const sd = la.startDate || la.date || "";
                            const ed = la.endDate || sd;
                            return sd === ed ? sd : `${sd} → ${ed}`;
                          })()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {log.rating && (
                          <div className="flex gap-0.5">
                            {[1,2,3,4,5].map(s => (
                              <Star key={s} className={`w-2.5 h-2.5 ${s <= log.rating! ? "fill-primary text-primary" : "text-border"}`} />
                            ))}
                          </div>
                        )}
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">还没有打卡记录</p>
          )}
        </CardContent>
      </Card>

      {/* Planned Mountains */}
      {plannedMountains.length > 0 && (
        <Card className="bg-card border-card-border mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-blue-400 flex items-center gap-1.5">
              📅 计划中的山
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {plannedMountains.map(m => (
                <Link key={m.id} href={`/mountain/${m.id}`}>
                  <div className="shrink-0 w-32 bg-muted/30 rounded-lg p-3 cursor-pointer hover:bg-muted/50 transition-colors">
                    <p className="text-sm font-medium text-foreground">{m.name}</p>
                    <p className="text-[10px] text-muted-foreground">{m.province} · {m.elevation}m</p>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function KPICard({ icon, label, value, unit, color }: { icon: React.ReactNode; label: string; value: string | number; unit: string; color: string }) {
  return (
    <Card className="bg-card border-card-border">
      <CardContent className="pt-4 pb-3 px-4">
        <div className={`flex items-center gap-1 text-xs mb-1 ${color}`}>
          {icon}
          <span className="text-muted-foreground">{label}</span>
        </div>
        <div className="flex items-baseline gap-0.5">
          <span className="text-lg font-bold text-foreground">{value}</span>
          <span className="text-xs text-muted-foreground">{unit}</span>
        </div>
      </CardContent>
    </Card>
  );
}

// Simple China map using positioned dots
function ChinaMapSimple({ completedIds, plannedIds, wishlistIds, mountains }: {
  completedIds: number[];
  plannedIds: number[];
  wishlistIds: number[];
  mountains: MountainType[];
}) {
  // Simplified mapping of lat/lng to rough x,y on a 400x360 canvas
  // China roughly: lat 18-53, lng 73-135
  const mapW = 400, mapH = 340;
  const minLat = 18, maxLat = 53, minLng = 73, maxLng = 135;

  function toXY(lat: string | null, lng: string | null): { x: number; y: number } | null {
    if (!lat || !lng) return null;
    const la = parseFloat(lat), lo = parseFloat(lng);
    if (isNaN(la) || isNaN(lo)) return null;
    const x = ((lo - minLng) / (maxLng - minLng)) * mapW;
    const y = mapH - ((la - minLat) / (maxLat - minLat)) * mapH;
    return { x, y };
  }

  return (
    <div className="relative w-full" style={{ paddingBottom: `${(mapH / mapW) * 100}%` }}>
      <svg viewBox={`0 0 ${mapW} ${mapH}`} className="absolute inset-0 w-full h-full">
        {/* Simple China outline - very rough */}
        <path d="M180 30 L220 25 L260 30 L300 20 L340 35 L360 50 L370 80 L380 120 L370 150 L360 170 L350 190 L370 210 L360 240 L340 260 L320 270 L300 290 L280 300 L260 310 L240 305 L220 310 L200 320 L180 310 L160 300 L140 290 L120 280 L100 260 L80 240 L60 220 L50 200 L40 180 L30 160 L35 140 L40 120 L50 100 L60 80 L80 60 L100 50 L120 40 L140 35 L160 32Z"
          fill="none" stroke="hsl(35, 8%, 22%)" strokeWidth="1" opacity="0.5" />

        {mountains.map(m => {
          const pos = toXY(m.latitude, m.longitude);
          if (!pos) return null;

          const isCompleted = completedIds.includes(m.id);
          const isPlanned = plannedIds.includes(m.id);
          const isWishlist = wishlistIds.includes(m.id);

          let fill = "hsl(35, 8%, 25%)"; // default gray
          let r = 3;
          if (isCompleted) { fill = "#22c55e"; r = 5; }
          else if (isPlanned) { fill = "#3b82f6"; r = 4; }
          else if (isWishlist) { fill = "#a855f7"; r = 4; }

          return (
            <g key={m.id}>
              {(isCompleted || isPlanned || isWishlist) && (
                <circle cx={pos.x} cy={pos.y} r={r + 3} fill={fill} opacity="0.15" />
              )}
              <circle cx={pos.x} cy={pos.y} r={r} fill={fill} />
              {(isCompleted || isPlanned) && (
                <text x={pos.x} y={pos.y - r - 3} textAnchor="middle" fill="hsl(40, 20%, 90%)" fontSize="7" fontWeight="500">
                  {m.name}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// GitHub-style contribution heatmap
function ActivityHeatmap({ activity }: { activity: Record<string, number> }) {
  const months = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    months.push({ key, label: `${d.getMonth() + 1}月`, count: activity[key] || 0 });
  }

  const maxCount = Math.max(...months.map(m => m.count), 1);

  return (
    <div>
      <div className="flex gap-1.5">
        {months.map(m => {
          const intensity = m.count / maxCount;
          let bg = "bg-muted/30";
          if (m.count > 0) {
            if (intensity > 0.75) bg = "bg-primary";
            else if (intensity > 0.5) bg = "bg-primary/70";
            else if (intensity > 0.25) bg = "bg-primary/40";
            else bg = "bg-primary/20";
          }
          return (
            <div key={m.key} className="flex-1 text-center">
              <div className={`h-6 rounded ${bg} mb-1 flex items-center justify-center`}>
                {m.count > 0 && <span className="text-[9px] text-foreground font-medium">{m.count}</span>}
              </div>
              <span className="text-[9px] text-muted-foreground">{m.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
