import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { ArrowLeft, MapPin, TrendingUp, Ticket, Clock, Star, Calendar, Utensils, Route, AlertTriangle, Bus, Camera, Sun, CloudRain, Snowflake, Leaf, Flower2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Mountain, CheckinLog } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

const DIFFICULTY_COLORS: Record<string, string> = {
  "简单": "bg-green-900/40 text-green-400 border-green-800/50",
  "中等": "bg-yellow-900/40 text-yellow-400 border-yellow-800/50",
  "困难": "bg-orange-900/40 text-orange-400 border-orange-800/50",
  "专业": "bg-red-900/40 text-red-400 border-red-800/50",
};

const MONTH_NAMES = ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"];
const SEASON_ICONS = [Snowflake, Snowflake, Flower2, Flower2, Flower2, Sun, Sun, Sun, Leaf, Leaf, Leaf, Snowflake];

function getMonthColor(score: number): string {
  if (score >= 5) return "bg-primary/80 text-primary-foreground";
  if (score >= 4) return "bg-primary/50 text-foreground";
  if (score >= 3) return "bg-primary/25 text-foreground";
  if (score >= 2) return "bg-muted text-muted-foreground";
  return "bg-muted/50 text-muted-foreground/60";
}

export function MountainDetail() {
  const params = useParams();
  const id = parseInt(params.id || "0");

  const { data: mountain, isLoading } = useQuery<Mountain>({
    queryKey: ["/api/mountains", id],
    queryFn: () => apiRequest("GET", `/api/mountains/${id}`).then(r => r.json()),
  });

  const { data: checkins = [] } = useQuery<CheckinLog[]>({
    queryKey: ["/api/checkins", { mountainId: id }],
    queryFn: () => apiRequest("GET", `/api/checkins?mountainId=${id}`).then(r => r.json()),
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="skeleton h-8 w-32 mb-6 rounded" />
        <div className="skeleton h-48 rounded-xl mb-6" />
        <div className="skeleton h-96 rounded-xl" />
      </div>
    );
  }

  if (!mountain) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p>山岳不存在</p>
        <Link href="/"><span className="text-primary cursor-pointer">返回列表</span></Link>
      </div>
    );
  }

  const bestMonths = mountain.bestMonths as Record<string, number> | null;
  const routes = mountain.routes as Array<{ name: string; distance: string; time: string; difficulty: string; nodes: string[] }> | null;
  const tips = mountain.tips as Record<string, any> | null;
  const foods = mountain.foods as Array<{ name: string; place: string; price: string; note: string }> | null;
  const transport = mountain.transport as Record<string, string> | null;

  return (
    <div className="max-w-4xl mx-auto px-4 pb-20 sm:pb-8">
      {/* Back Navigation */}
      <div className="py-4">
        <Link href="/">
          <span className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
            <ArrowLeft className="w-4 h-4" />
            返回列表
          </span>
        </Link>
      </div>

      {/* Hero Info Card */}
      <div className="bg-gradient-to-br from-card via-card to-primary/5 border border-card-border rounded-2xl p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gold-gradient mb-2" data-testid="text-mountain-name">
              {mountain.name}
            </h1>
            <div className="flex items-center gap-3 text-sm text-muted-foreground mb-3">
              <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{mountain.province}</span>
              <span className="flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5" />{mountain.elevation}m</span>
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{mountain.duration}</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                {mountain.category}
              </Badge>
              <Badge variant="outline" className={DIFFICULTY_COLORS[mountain.difficulty]}>
                {mountain.difficulty}
              </Badge>
              {mountain.ticketPrice !== null && (
                <Badge variant="outline" className="bg-card text-foreground border-border">
                  <Ticket className="w-3 h-3 mr-1" />¥{mountain.ticketPrice}
                </Badge>
              )}
            </div>
          </div>
          <Link href={`/checkin/new/${mountain.id}`}>
            <button className="shrink-0 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors" data-testid="button-checkin">
              📍 打卡记录
            </button>
          </Link>
        </div>
        {mountain.description && (
          <p className="mt-4 text-sm text-muted-foreground leading-relaxed">{mountain.description}</p>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full bg-card border border-border mb-4 h-auto p-1 flex-wrap">
          <TabsTrigger value="overview" className="text-xs sm:text-sm flex-1">概览</TabsTrigger>
          <TabsTrigger value="season" className="text-xs sm:text-sm flex-1">季节</TabsTrigger>
          <TabsTrigger value="routes" className="text-xs sm:text-sm flex-1">路线</TabsTrigger>
          <TabsTrigger value="food" className="text-xs sm:text-sm flex-1">美食</TabsTrigger>
          <TabsTrigger value="tips" className="text-xs sm:text-sm flex-1">贴士</TabsTrigger>
          <TabsTrigger value="logs" className="text-xs sm:text-sm flex-1">记录</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {mountain.culturalBackground && (
            <Card className="bg-card border-card-border">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-primary">文化背景</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">{mountain.culturalBackground}</p></CardContent>
            </Card>
          )}
          {mountain.highlights && mountain.highlights.length > 0 && (
            <Card className="bg-card border-card-border">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-primary">特色亮点</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {mountain.highlights.map((h: string) => (
                    <span key={h} className="text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary/80 border border-primary/20">
                      {h}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          {mountain.photoSpots && mountain.photoSpots.length > 0 && (
            <Card className="bg-card border-card-border">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-primary flex items-center gap-1.5"><Camera className="w-4 h-4" />拍照推荐</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {mountain.photoSpots.map((spot: string, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] flex items-center justify-center font-medium">{i + 1}</span>
                      {spot}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          {transport && (
            <Card className="bg-card border-card-border">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-primary flex items-center gap-1.5"><Bus className="w-4 h-4" />交通指南</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-muted-foreground">
                  {transport.nearestAirport && <div><span className="text-foreground font-medium">最近机场：</span>{transport.nearestAirport}</div>}
                  {transport.nearestStation && <div><span className="text-foreground font-medium">最近火车站：</span>{transport.nearestStation}</div>}
                  {transport.fromBeijing && <div><span className="text-foreground font-medium">北京出发：</span>{transport.fromBeijing}</div>}
                  {transport.fromShanghai && <div><span className="text-foreground font-medium">上海出发：</span>{transport.fromShanghai}</div>}
                  {transport.fromGuangzhou && <div><span className="text-foreground font-medium">广州出发：</span>{transport.fromGuangzhou}</div>}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Season Tab */}
        <TabsContent value="season" className="space-y-4">
          {bestMonths && (
            <Card className="bg-card border-card-border">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-primary flex items-center gap-1.5"><Calendar className="w-4 h-4" />最佳游玩季节</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {MONTH_NAMES.map((name, i) => {
                    const score = bestMonths[(i + 1).toString()] || 1;
                    const Icon = SEASON_ICONS[i];
                    return (
                      <div key={i} className={`flex flex-col items-center gap-1 p-2.5 rounded-lg text-center ${getMonthColor(score)}`}>
                        <Icon className="w-3.5 h-3.5" />
                        <span className="text-xs font-medium">{name}</span>
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map(s => (
                            <div key={s} className={`w-1 h-1 rounded-full ${s <= score ? "bg-primary" : "bg-border"}`} />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {mountain.seasonNotes && (
                  <p className="mt-4 text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">{mountain.seasonNotes}</p>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Routes Tab */}
        <TabsContent value="routes" className="space-y-4">
          {routes && routes.length > 0 ? routes.map((route, i) => (
            <Card key={i} className="bg-card border-card-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-primary flex items-center gap-1.5">
                  <Route className="w-4 h-4" />
                  {route.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-3 text-xs text-muted-foreground">
                  <span>距离：{route.distance}</span>
                  <span>耗时：{route.time}</span>
                  <Badge variant="outline" className={`text-[10px] ${DIFFICULTY_COLORS[route.difficulty] || ""}`}>
                    {route.difficulty}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  {route.nodes.map((node: string, j: number) => (
                    <span key={j} className="flex items-center">
                      <span className="text-xs bg-primary/10 text-primary/80 px-2 py-1 rounded">{node}</span>
                      {j < route.nodes.length - 1 && <span className="text-muted-foreground mx-1">→</span>}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )) : (
            <div className="text-center py-8 text-muted-foreground text-sm">暂无路线信息</div>
          )}
        </TabsContent>

        {/* Food Tab */}
        <TabsContent value="food" className="space-y-4">
          {foods && foods.length > 0 ? foods.map((food, i) => (
            <Card key={i} className="bg-card border-card-border">
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-foreground flex items-center gap-1.5">
                      <Utensils className="w-3.5 h-3.5 text-primary" />
                      {food.name}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1">{food.place}</p>
                    {food.note && <p className="text-xs text-muted-foreground/70 mt-0.5">{food.note}</p>}
                  </div>
                  <span className="text-xs text-primary font-medium shrink-0">{food.price}</span>
                </div>
              </CardContent>
            </Card>
          )) : (
            <div className="text-center py-8 text-muted-foreground text-sm">暂无美食信息</div>
          )}
        </TabsContent>

        {/* Tips Tab */}
        <TabsContent value="tips" className="space-y-4">
          {tips && (
            <>
              {tips.equipment && (
                <Card className="bg-card border-card-border">
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-primary">必备装备</CardTitle></CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {tips.equipment.map((item: string) => (
                        <span key={item} className="text-xs px-2.5 py-1 rounded-md bg-muted text-muted-foreground border border-border">
                          {item}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              {tips.booking && (
                <Card className="bg-card border-card-border">
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-primary flex items-center gap-1.5"><Ticket className="w-4 h-4" />购票提示</CardTitle></CardHeader>
                  <CardContent><p className="text-sm text-muted-foreground">{tips.booking}</p></CardContent>
                </Card>
              )}
              {tips.forbidden && tips.forbidden.length > 0 && (
                <Card className="bg-card border-card-border">
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-destructive flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" />禁止事项</CardTitle></CardHeader>
                  <CardContent>
                    <ul className="space-y-1">
                      {tips.forbidden.map((item: string) => (
                        <li key={item} className="text-sm text-muted-foreground">• {item}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
              {tips.emergency && (
                <Card className="bg-card border-card-border">
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-orange-400">紧急联系</CardTitle></CardHeader>
                  <CardContent><p className="text-sm text-muted-foreground">{tips.emergency}</p></CardContent>
                </Card>
              )}
              {tips.accessibility && (
                <Card className="bg-card border-card-border">
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-primary">索道/无障碍</CardTitle></CardHeader>
                  <CardContent><p className="text-sm text-muted-foreground">{tips.accessibility}</p></CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs" className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-foreground">打卡记录 ({checkins.length})</h3>
            <Link href={`/checkin/new/${mountain.id}`}>
              <span className="text-xs text-primary cursor-pointer hover:underline">+ 添加记录</span>
            </Link>
          </div>
          {checkins.length > 0 ? checkins.map(log => (
            <Card key={log.id} className="bg-card border-card-border">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{log.date}</span>
                    <StatusBadge status={log.status} />
                  </div>
                  {log.rating && (
                    <div className="flex items-center gap-0.5">
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} className={`w-3 h-3 ${s <= log.rating! ? "fill-primary text-primary" : "text-border"}`} />
                      ))}
                    </div>
                  )}
                </div>
                {log.notes && <p className="text-sm text-muted-foreground mb-2">{log.notes}</p>}
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {log.weather && <span>🌤 {log.weather}</span>}
                  {log.routeName && <span>🥾 {log.routeName}</span>}
                  {log.companions && log.companions.length > 0 && (
                    <span>👥 {log.companions.join("、")}</span>
                  )}
                </div>
                {log.expenses && typeof log.expenses === "object" && (
                  <div className="mt-2 flex gap-2 flex-wrap">
                    {Object.entries(log.expenses as Record<string, number>).map(([k, v]) => v > 0 && (
                      <span key={k} className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground">
                        {k === "ticket" ? "门票" : k === "food" ? "餐饮" : k === "transport" ? "交通" : "住宿"}：¥{v}
                      </span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )) : (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <p>还没有打卡记录</p>
              <Link href={`/checkin/new/${mountain.id}`}>
                <span className="text-primary cursor-pointer text-xs hover:underline">去打卡</span>
              </Link>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    completed: { label: "✅ 已去", className: "bg-green-900/40 text-green-400 border-green-800/50" },
    planned: { label: "📅 计划中", className: "bg-blue-900/40 text-blue-400 border-blue-800/50" },
    wishlist: { label: "💭 想去", className: "bg-purple-900/40 text-purple-400 border-purple-800/50" },
  };
  const c = config[status] || config.wishlist;
  return <Badge variant="outline" className={`text-[10px] ${c.className}`}>{c.label}</Badge>;
}
