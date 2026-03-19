import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Link } from "wouter";
import { ArrowLeft, Plus, X, Upload, ImageIcon, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const PRESET_CATEGORIES = ["五岳", "佛教名山", "道教名山", "徒步", "地貌/网红", "其他山头"];
const DIFFICULTY_OPTIONS = ["简单", "中等", "困难", "专业"];

export function AdminAdd() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Form fields
  const [name, setName] = useState("");
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [elevation, setElevation] = useState("");
  const [ticketPrice, setTicketPrice] = useState("");
  const [difficulty, setDifficulty] = useState("中等");
  const [duration, setDuration] = useState("");
  const [description, setDescription] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Category multi-select
  const [selectedCategories, setSelectedCategories] = useState<string[]>(["其他山头"]);
  const [newCategoryInput, setNewCategoryInput] = useState("");
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  // Fetch existing categories from API
  const { data: apiCategories = [] } = useQuery<string[]>({
    queryKey: ["/api/categories"],
    queryFn: () => apiRequest("GET", "/api/categories").then(r => r.json()),
  });

  // Merge preset + api categories, deduplicate
  const allCategories = Array.from(new Set([...PRESET_CATEGORIES, ...apiCategories]));

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const addNewCategory = () => {
    const trimmed = newCategoryInput.trim();
    if (trimmed && !selectedCategories.includes(trimmed)) {
      setSelectedCategories(prev => [...prev, trimmed]);
    }
    setNewCategoryInput("");
  };

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/mountains", data);
      return res.json();
    },
    onSuccess: (mountain: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/mountains"] });
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({ title: "添加成功", description: `${mountain.name} 已添加到山岳列表` });
      navigate(`/mountain/${mountain.id}`);
    },
    onError: (err: any) => {
      toast({ title: "添加失败", description: err.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: "请输入山名", variant: "destructive" });
      return;
    }
    if (!province.trim()) {
      toast({ title: "请输入省份", variant: "destructive" });
      return;
    }
    if (!elevation || parseInt(elevation) <= 0) {
      toast({ title: "请输入有效海拔", variant: "destructive" });
      return;
    }
    if (selectedCategories.length === 0) {
      toast({ title: "请至少选择一个分类", variant: "destructive" });
      return;
    }

    createMutation.mutate({
      name: name.trim(),
      province: province.trim(),
      elevation: parseInt(elevation),
      category: selectedCategories[0], // Primary category
      ticketPrice: ticketPrice ? parseInt(ticketPrice) : null,
      difficulty,
      duration: duration.trim() || "1日",
      description: description.trim() || null,
      imageUrl: imagePreview || null,
      // Store city in transport for weather queries
      transport: city.trim() ? { city: city.trim() } : null,
      // Fields left empty — detail page will auto-hide
      highlights: null,
      culturalBackground: null,
      bestMonths: null,
      seasonNotes: null,
      routes: null,
      tips: null,
      foods: null,
      photoSpots: null,
      latitude: null,
      longitude: null,
    });
  };

  return (
    <div className="max-w-2xl mx-auto px-4 pb-20 sm:pb-8">
      {/* Back */}
      <div className="py-4">
        <Link href="/">
          <span className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
            <ArrowLeft className="w-4 h-4" />
            返回列表
          </span>
        </Link>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gold-gradient mb-1">添加新山岳</h1>
        <p className="text-sm text-muted-foreground">填写基本信息即可，选填字段留空时详情页对应模块会自动隐藏</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Image Upload */}
        <div>
          <Label className="text-sm text-foreground mb-2 block">封面图</Label>
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-border rounded-xl h-48 flex flex-col items-center justify-center cursor-pointer hover:border-primary/40 transition-colors overflow-hidden relative"
          >
            {imagePreview ? (
              <>
                <img src={imagePreview} alt="预览" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setImagePreview(null); }}
                  className="absolute top-2 right-2 p-1 rounded-full bg-black/60 text-white hover:bg-black/80"
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <ImageIcon className="w-8 h-8 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground">点击上传封面图</span>
                <span className="text-xs text-muted-foreground/60 mt-1">选填，支持 JPG、PNG</span>
              </>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
          />
        </div>

        {/* Name + Province row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="name" className="text-sm text-foreground mb-1.5 block">
              山名 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder="如：景迈山"
              value={name}
              onChange={e => setName(e.target.value)}
              className="bg-card border-border"
            />
          </div>
          <div>
            <Label htmlFor="province" className="text-sm text-foreground mb-1.5 block">
              省份 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="province"
              placeholder="如：云南"
              value={province}
              onChange={e => setProvince(e.target.value)}
              className="bg-card border-border"
            />
          </div>
        </div>

        {/* Elevation + Ticket + City */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="elevation" className="text-sm text-foreground mb-1.5 block">
              海拔 (m) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="elevation"
              type="number"
              placeholder="1500"
              value={elevation}
              onChange={e => setElevation(e.target.value)}
              className="bg-card border-border"
            />
          </div>
          <div>
            <Label htmlFor="ticketPrice" className="text-sm text-foreground mb-1.5 block">
              门票 (¥)
            </Label>
            <Input
              id="ticketPrice"
              type="number"
              placeholder="免费留空"
              value={ticketPrice}
              onChange={e => setTicketPrice(e.target.value)}
              className="bg-card border-border"
            />
          </div>
          <div>
            <Label htmlFor="city" className="text-sm text-foreground mb-1.5 block">
              所在城市
            </Label>
            <Input
              id="city"
              placeholder="用于天气查询"
              value={city}
              onChange={e => setCity(e.target.value)}
              className="bg-card border-border"
            />
          </div>
        </div>

        {/* Difficulty + Duration */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm text-foreground mb-1.5 block">难度等级</Label>
            <div className="flex gap-2">
              {DIFFICULTY_OPTIONS.map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDifficulty(d)}
                  className={`flex-1 py-2 text-sm rounded-lg border transition-all ${
                    difficulty === d
                      ? "bg-primary/10 border-primary/40 text-primary font-medium"
                      : "bg-card border-border text-muted-foreground hover:border-primary/20"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label htmlFor="duration" className="text-sm text-foreground mb-1.5 block">
              推荐游览时长
            </Label>
            <Input
              id="duration"
              placeholder="如：1-2日"
              value={duration}
              onChange={e => setDuration(e.target.value)}
              className="bg-card border-border"
            />
          </div>
        </div>

        {/* Category multi-select */}
        <div>
          <Label className="text-sm text-foreground mb-1.5 block">
            分类 <span className="text-destructive">*</span>
          </Label>
          {/* Selected categories */}
          <div className="flex flex-wrap gap-2 mb-2 min-h-[32px]">
            {selectedCategories.map(cat => (
              <Badge
                key={cat}
                variant="outline"
                className="bg-primary/10 text-primary border-primary/30 cursor-pointer hover:bg-primary/20 pr-1"
                onClick={() => toggleCategory(cat)}
              >
                {cat}
                <X className="w-3 h-3 ml-1" />
              </Badge>
            ))}
          </div>
          {/* Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
              className="w-full flex items-center justify-between px-3 py-2 text-sm bg-card border border-border rounded-lg text-muted-foreground hover:border-primary/30 transition-colors"
            >
              选择或创建分类
              <ChevronDown className={`w-4 h-4 transition-transform ${showCategoryDropdown ? "rotate-180" : ""}`} />
            </button>
            {showCategoryDropdown && (
              <div className="absolute z-10 mt-1 w-full bg-card border border-border rounded-lg shadow-lg py-1 max-h-48 overflow-y-auto">
                {allCategories.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleCategory(cat)}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                      selectedCategories.includes(cat)
                        ? "bg-primary/10 text-primary"
                        : "text-foreground hover:bg-muted/50"
                    }`}
                  >
                    {selectedCategories.includes(cat) ? "✓ " : ""}{cat}
                  </button>
                ))}
                {/* New category input */}
                <div className="px-3 py-2 border-t border-border">
                  <div className="flex gap-2">
                    <Input
                      placeholder="输入新分类名称"
                      value={newCategoryInput}
                      onChange={e => setNewCategoryInput(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addNewCategory(); }}}
                      className="bg-background border-border text-sm h-8"
                    />
                    <button
                      type="button"
                      onClick={addNewCategory}
                      className="shrink-0 px-2 h-8 bg-primary/10 text-primary rounded border border-primary/30 text-sm hover:bg-primary/20"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        <div>
          <Label htmlFor="description" className="text-sm text-foreground mb-1.5 block">简介</Label>
          <Textarea
            id="description"
            placeholder="这座山的简要介绍..."
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="bg-card border-border min-h-[100px]"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={createMutation.isPending}
          className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {createMutation.isPending ? "添加中..." : "添加山岳"}
        </button>
      </form>
    </div>
  );
}
