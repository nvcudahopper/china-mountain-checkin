import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { ArrowLeft, Star, Calendar as CalendarIcon, Users, CloudSun, Route, Receipt, Check } from "lucide-react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Mountain, CheckinLog } from "@shared/schema";

const STATUS_OPTIONS = [
  { value: "completed", label: "✅ 已去", color: "text-green-400" },
  { value: "planned", label: "📅 计划中", color: "text-blue-400" },
  { value: "wishlist", label: "💭 想去", color: "text-purple-400" },
];

export function CheckinForm() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Determine mode: edit or create
  const editId = params.id ? parseInt(params.id) : undefined;
  const isEditMode = !!editId;
  const mountainId = params.mountainId ? parseInt(params.mountainId) : undefined;

  const { data: mountains = [] } = useQuery<Mountain[]>({
    queryKey: ["/api/mountains"],
    queryFn: () => apiRequest("GET", "/api/mountains").then(r => r.json()),
  });

  // Fetch existing checkin data in edit mode
  const { data: existingCheckin, isLoading: isLoadingCheckin } = useQuery<CheckinLog>({
    queryKey: ["/api/checkins", editId],
    queryFn: () => apiRequest("GET", `/api/checkins/${editId}`).then(r => r.json()),
    enabled: isEditMode,
  });

  const [form, setForm] = useState({
    mountainId: mountainId || 0,
    date: new Date().toISOString().split("T")[0],
    status: "completed",
    companions: [] as string[],
    weather: "",
    notes: "",
    rating: 0,
    routeName: "",
    expenses: { ticket: 0, food: 0, transport: 0, accommodation: 0 },
    companionInput: "",
  });

  const [formLoaded, setFormLoaded] = useState(false);

  // Pre-fill form when editing
  useEffect(() => {
    if (isEditMode && existingCheckin && !formLoaded) {
      const expenses = existingCheckin.expenses as Record<string, number> | null;
      setForm({
        mountainId: existingCheckin.mountainId,
        date: existingCheckin.date,
        status: existingCheckin.status,
        companions: (existingCheckin.companions as string[]) || [],
        weather: existingCheckin.weather || "",
        notes: existingCheckin.notes || "",
        rating: existingCheckin.rating || 0,
        routeName: existingCheckin.routeName || "",
        expenses: {
          ticket: expenses?.ticket || 0,
          food: expenses?.food || 0,
          transport: expenses?.transport || 0,
          accommodation: expenses?.accommodation || 0,
        },
        companionInput: "",
      });
      setFormLoaded(true);
    }
  }, [isEditMode, existingCheckin, formLoaded]);

  const selectedMountain = mountains.find(m => m.id === (isEditMode ? form.mountainId : mountainId || form.mountainId));
  const routes = selectedMountain?.routes as Array<{ name: string }> | null;

  const createMutation = useMutation({
    mutationFn: async () => {
      const { companionInput, ...rest } = form;
      const payload = {
        ...rest,
        userId: "user1",
        photos: [],
        createdAt: new Date().toISOString(),
      };
      return apiRequest("POST", "/api/checkins", payload).then(r => r.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/checkins"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/user1"] });
      toast({ title: "打卡成功", description: "你的登山记录已保存" });
      if (mountainId) {
        setLocation(`/mountain/${mountainId}`);
      } else {
        setLocation("/dashboard");
      }
    },
    onError: () => {
      toast({ title: "保存失败", description: "请检查表单内容", variant: "destructive" });
    },
  });

  const editMutation = useMutation({
    mutationFn: async () => {
      const { companionInput, ...rest } = form;
      const payload = {
        ...rest,
        userId: "user1",
        photos: existingCheckin?.photos || [],
      };
      return apiRequest("PATCH", `/api/checkins/${editId}`, payload).then(r => r.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/checkins"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/user1"] });
      toast({ title: "更新成功", description: "打卡记录已更新" });
      setLocation(`/mountain/${form.mountainId}`);
    },
    onError: () => {
      toast({ title: "更新失败", description: "请检查表单内容", variant: "destructive" });
    },
  });

  const addCompanion = () => {
    if (form.companionInput.trim() && !form.companions.includes(form.companionInput.trim())) {
      setForm(f => ({
        ...f,
        companions: [...f.companions, f.companionInput.trim()],
        companionInput: "",
      }));
    }
  };

  const removeCompanion = (name: string) => {
    setForm(f => ({ ...f, companions: f.companions.filter(c => c !== name) }));
  };

  const handleSubmit = () => {
    if (isEditMode) {
      editMutation.mutate();
    } else {
      createMutation.mutate();
    }
  };

  const isPending = createMutation.isPending || editMutation.isPending;
  const backHref = isEditMode
    ? `/mountain/${form.mountainId}`
    : mountainId
      ? `/mountain/${mountainId}`
      : "/";

  if (isEditMode && isLoadingCheckin) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center text-muted-foreground">
        加载中...
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 pb-20 sm:pb-8">
      {/* Back Navigation */}
      <div className="py-4">
        <Link href={backHref}>
          <span className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
            <ArrowLeft className="w-4 h-4" />
            返回
          </span>
        </Link>
      </div>

      <h1 className="text-xl font-bold text-gold-gradient mb-6">
        {isEditMode
          ? `${selectedMountain?.name || ""} · 编辑记录`
          : selectedMountain
            ? `${selectedMountain.name} · 打卡记录`
            : "新建打卡记录"}
      </h1>

      <div className="space-y-4">
        {/* Mountain Selection (if not pre-selected and not editing) */}
        {!mountainId && !isEditMode && (
          <Card className="bg-card border-card-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-primary">选择山岳</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={form.mountainId.toString()} onValueChange={v => setForm(f => ({ ...f, mountainId: parseInt(v) }))}>
                <SelectTrigger data-testid="select-mountain">
                  <SelectValue placeholder="选择要打卡的山" />
                </SelectTrigger>
                <SelectContent>
                  {mountains.map(m => (
                    <SelectItem key={m.id} value={m.id.toString()}>{m.name} ({m.province})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}

        {/* Show mountain name when editing (read-only) */}
        {isEditMode && selectedMountain && (
          <Card className="bg-card border-card-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-primary">山岳</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground">{selectedMountain.name} ({selectedMountain.province})</p>
            </CardContent>
          </Card>
        )}

        {/* Status */}
        <Card className="bg-card border-card-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-primary">打卡状态</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              {STATUS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setForm(f => ({ ...f, status: opt.value }))}
                  className={`flex-1 py-2 rounded-lg text-sm transition-all border ${
                    form.status === opt.value
                      ? "bg-primary/10 border-primary/30 text-foreground"
                      : "bg-card border-border text-muted-foreground hover:border-border/80"
                  }`}
                  data-testid={`status-${opt.value}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Date */}
        <Card className="bg-card border-card-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-primary flex items-center gap-1.5">
              <CalendarIcon className="w-4 h-4" />日期
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              type="date"
              value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              className="bg-background border-border"
              data-testid="input-date"
            />
          </CardContent>
        </Card>

        {/* Rating (only for completed) */}
        {form.status === "completed" && (
          <Card className="bg-card border-card-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-primary">心情评分</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(s => (
                  <button
                    key={s}
                    onClick={() => setForm(f => ({ ...f, rating: s }))}
                    className="transition-transform hover:scale-110"
                    data-testid={`rating-${s}`}
                  >
                    <Star className={`w-8 h-8 ${s <= form.rating ? "fill-primary text-primary" : "text-border hover:text-muted-foreground"}`} />
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Route */}
        {routes && routes.length > 0 && (
          <Card className="bg-card border-card-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-primary flex items-center gap-1.5">
                <Route className="w-4 h-4" />选择路线
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={form.routeName} onValueChange={v => setForm(f => ({ ...f, routeName: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="选择完成的路线" />
                </SelectTrigger>
                <SelectContent>
                  {routes.map((r: { name: string }) => (
                    <SelectItem key={r.name} value={r.name}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}

        {/* Companions */}
        <Card className="bg-card border-card-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-primary flex items-center gap-1.5">
              <Users className="w-4 h-4" />同行朋友
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-2">
              <Input
                placeholder="输入朋友昵称"
                value={form.companionInput}
                onChange={e => setForm(f => ({ ...f, companionInput: e.target.value }))}
                onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addCompanion())}
                className="bg-background border-border"
                data-testid="input-companion"
              />
              <Button variant="outline" size="sm" onClick={addCompanion}>添加</Button>
            </div>
            {form.companions.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {form.companions.map(c => (
                  <Badge
                    key={c}
                    variant="outline"
                    className="cursor-pointer hover:bg-destructive/10 transition-colors"
                    onClick={() => removeCompanion(c)}
                  >
                    {c} ×
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Weather */}
        {form.status === "completed" && (
          <Card className="bg-card border-card-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-primary flex items-center gap-1.5">
                <CloudSun className="w-4 h-4" />天气
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                placeholder="如：晴朗、多云、小雨..."
                value={form.weather}
                onChange={e => setForm(f => ({ ...f, weather: e.target.value }))}
                className="bg-background border-border"
                data-testid="input-weather"
              />
            </CardContent>
          </Card>
        )}

        {/* Expenses (only for completed) */}
        {form.status === "completed" && (
          <Card className="bg-card border-card-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-primary flex items-center gap-1.5">
                <Receipt className="w-4 h-4" />花费记录 (元)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: "ticket", label: "门票" },
                  { key: "food", label: "餐饮" },
                  { key: "transport", label: "交通" },
                  { key: "accommodation", label: "住宿" },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={form.expenses[key as keyof typeof form.expenses] || ""}
                      onChange={e => setForm(f => ({
                        ...f,
                        expenses: { ...f.expenses, [key]: parseInt(e.target.value) || 0 },
                      }))}
                      className="bg-background border-border"
                      data-testid={`input-expense-${key}`}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        <Card className="bg-card border-card-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-primary">备注</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="记录你的登山感受..."
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="bg-background border-border min-h-[100px]"
              data-testid="input-notes"
            />
          </CardContent>
        </Card>

        {/* Submit */}
        <Button
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12 text-base font-medium"
          onClick={handleSubmit}
          disabled={isPending || form.mountainId === 0}
          data-testid="button-submit"
        >
          {isPending ? (
            <span className="flex items-center gap-2">保存中...</span>
          ) : (
            <span className="flex items-center gap-2">
              <Check className="w-5 h-5" />
              {isEditMode ? "更新打卡记录" : "保存打卡记录"}
            </span>
          )}
        </Button>
      </div>
    </div>
  );
}
