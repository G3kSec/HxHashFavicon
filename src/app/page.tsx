"use client";

import { useState, useEffect, useRef } from "react";
import {
  Search,
  Globe,
  Shield,
  Upload,
  Trash2,
  History,
  Copy,
  Check,
  Terminal,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ThemeToggle } from "@/components/theme-toggle";

export default function FaviconHasher() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cargar historial al iniciar
  useEffect(() => {
    const saved = localStorage.getItem("favicon_history");
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  // Guardar en historial
  const addToHistory = (item: any) => {
    const newEntry = {
      id: Date.now(),
      hash: item.hash,
      icon: item.faviconUrl,
      target: item.target || "Uploaded File",
      timestamp: new Date().toLocaleTimeString(),
    };
    const updatedHistory = [newEntry, ...history].slice(0, 10); // Guardar últimos 10
    setHistory(updatedHistory);
    localStorage.setItem("favicon_history", JSON.stringify(updatedHistory));
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem("favicon_history");
  };

  const handleHashUrl = async () => {
    if (!url) return;
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/hash", { method: "POST", body: JSON.stringify({ url }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const finalResult = { ...data, target: url };
      setResult(finalResult);
      addToHistory(finalResult);
    } catch (err: any) {
      setError(err.message || "Failed to fetch favicon");
    } finally {
      setLoading(false);
    }
  };

  const handleHashFile = async () => {
    if (!selectedFile) return;
    setLoading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const finalResult = { ...data, faviconUrl: previewUrl, target: selectedFile.name };
      setResult(finalResult);
      addToHistory(finalResult);
    } catch (err: any) {
      setError(err.message || "Failed to process file");
    } finally {
      setLoading(false);
    }
  };

  const openLink = (link: string) => window.open(link, "_blank");

  const copyHash = () => {
    if (!result) return;
    navigator.clipboard.writeText(String(result.hash));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <main className="min-h-screen flex flex-col font-sans selection:bg-primary/25">
      {/* HEADER */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5">
          <div className="flex items-baseline gap-px font-mono text-[0.9375rem] font-semibold tracking-tight">
            <span className="text-primary">Hx</span>
            <span>HashFavicon</span>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="flex-1 p-4 md:p-8">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* COLUMNA IZQUIERDA: HERRAMIENTA */}
          <div className="lg:col-span-2 space-y-6">
            <div className="space-y-2">
              <p className="label !text-primary">{"// favicon fingerprinting"}</p>
              <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-balance">
                Asset discovery, starting from a single icon.
              </h1>
              <p className="text-muted-foreground text-sm max-w-xl">
                Convert any favicon into a Shodan / Fofa compatible MurmurHash3
                signature, then pivot straight into their infrastructure search.
              </p>
            </div>

            <Card className="border-border border-t-2 border-t-primary shadow-none py-0 overflow-hidden gap-0">
              {/* Terminal chrome */}
              <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-border bg-muted/50">
                <span className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-primary/70" />
                <span className="label !normal-case !tracking-normal ml-3 truncate">
                  ~/hxhashfavicon/target-input.sh
                </span>
              </div>

              <CardHeader className="pt-5">
                <CardTitle className="text-base font-mono">Target Input</CardTitle>
                <CardDescription>
                  Select a method to extract the MurmurHash3 signature.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pb-6">
                <Tabs defaultValue="url" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger
                      value="url"
                      className="cursor-pointer font-mono text-xs data-[state=active]:text-primary"
                    >
                      <Globe className="size-3.5" /> URL Target
                    </TabsTrigger>
                    <TabsTrigger
                      value="upload"
                      className="cursor-pointer font-mono text-xs data-[state=active]:text-primary"
                    >
                      <Upload className="size-3.5" /> Upload File
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="url" className="mt-4 space-y-4">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-primary font-mono text-sm">
                          $
                        </span>
                        <Input
                          placeholder="example.com or https://example.com/favicon.ico"
                          value={url}
                          onChange={(e) => setUrl(e.target.value)}
                          className="pl-7 font-mono"
                          onKeyDown={(e) => e.key === "Enter" && handleHashUrl()}
                        />
                      </div>
                      <Button onClick={handleHashUrl} disabled={loading} className="cursor-pointer">
                        {loading ? (
                          <span className="font-mono">...</span>
                        ) : (
                          <Search className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="upload" className="mt-4 space-y-4">
                    <div className="flex gap-2 items-center">
                      <Input
                        type="file"
                        ref={fileInputRef}
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            setSelectedFile(e.target.files[0]);
                            setPreviewUrl(URL.createObjectURL(e.target.files[0]));
                          }
                        }}
                        accept=".ico,.png,.jpg,.jpeg,.svg"
                        className="cursor-pointer file:text-foreground file:font-mono file:font-medium"
                      />
                      <Button
                        onClick={handleHashFile}
                        disabled={loading || !selectedFile}
                        className="cursor-pointer"
                      >
                        {loading ? (
                          <span className="font-mono">...</span>
                        ) : (
                          <Upload className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>

                {error && (
                  <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-mono text-destructive">
                    error: {error}
                  </div>
                )}

                {result && (
                  <div className="pt-6 border-t border-border space-y-5 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-4">
                      <img
                        src={result.faviconUrl}
                        alt="Icon"
                        className="w-12 h-12 rounded-md bg-muted p-2 border border-border object-contain"
                      />
                      <div className="flex-1 min-w-0">
                        <label className="label">MurmurHash3</label>
                        <div className="flex items-center gap-2">
                          <div className="nums text-primary font-mono text-xl md:text-2xl font-bold truncate">
                            {result.hash}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 shrink-0 cursor-pointer text-muted-foreground hover:text-primary"
                            onClick={copyHash}
                          >
                            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        variant="outline"
                        className="cursor-pointer h-auto py-4 flex flex-col items-center gap-1 hover:border-primary/40 hover:bg-accent"
                        onClick={() =>
                          openLink(`https://www.shodan.io/search?query=http.favicon.hash:${result.hash}`)
                        }
                      >
                        <div className="flex items-center gap-2 font-bold font-mono text-sm">
                          <Globe className="w-4 h-4 text-primary" /> SHODAN
                        </div>
                        <span className="label !normal-case !tracking-normal">
                          query: http.favicon.hash
                        </span>
                      </Button>
                      <Button
                        variant="outline"
                        className="cursor-pointer h-auto py-4 flex flex-col items-center gap-1 hover:border-primary/40 hover:bg-accent"
                        onClick={() =>
                          openLink(`https://fofa.info/result?qbase64=${btoa(`icon_hash="${result.hash}"`)}`)
                        }
                      >
                        <div className="flex items-center gap-2 font-bold font-mono text-sm">
                          <Shield className="w-4 h-4 text-primary" /> FOFA
                        </div>
                        <span className="label !normal-case !tracking-normal">
                          query: icon_hash
                        </span>
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* COLUMNA DERECHA: HISTORIAL */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="label flex items-center gap-2">
                <History className="w-3.5 h-3.5 text-primary" /> scan_history.log
              </h2>
              {history.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearHistory}
                  className="text-xs text-muted-foreground hover:text-destructive cursor-pointer font-mono"
                >
                  <Trash2 className="w-3 h-3 mr-1" /> clear
                </Button>
              )}
            </div>

            <div className="space-y-2">
              {history.length === 0 ? (
                <div className="text-center p-8 border border-dashed border-primary/30 rounded-lg text-muted-foreground text-xs font-mono">
                  no scans yet
                </div>
              ) : (
                history.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-card border border-border rounded-lg flex items-center gap-3 group hover:border-primary/40 transition-colors"
                  >
                    <img
                      src={item.icon}
                      alt=""
                      className="w-8 h-8 rounded bg-muted p-1 object-contain shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="label !normal-case !tracking-normal truncate">{item.target}</p>
                      <p className="nums text-sm font-mono font-semibold group-hover:text-primary transition-colors">
                        {item.hash}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-primary cursor-pointer shrink-0"
                      onClick={() => navigator.clipboard.writeText(item.hash)}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <footer className="w-full py-6 mt-6 border-t border-border">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 px-4 md:px-8 text-muted-foreground">
          <div className="flex items-center gap-2">
            <Terminal className="h-3.5 w-3.5 text-primary" />
            <p className="font-mono text-sm tracking-tight">
              <span className="text-primary">Hx</span>
              <span className="text-foreground">HashFavicon</span>
              <span className="text-muted-foreground"> — by </span>
              <a
                href="https://hxhunt.com"
                target="_blank"
                rel="noreferrer"
                className="hover:text-primary transition-colors"
              >
                HxHunt
              </a>
            </p>
          </div>

          <div className="flex items-center gap-6">
            <a
              href="https://www.linkedin.com/company/hxhunt"
              target="_blank"
              rel="noreferrer"
              className="label hover:!text-primary transition-colors"
            >
              LinkedIn
            </a>
            <p className="label nums">&copy; {new Date().getFullYear()}</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
