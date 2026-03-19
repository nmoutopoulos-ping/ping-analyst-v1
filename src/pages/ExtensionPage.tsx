import { useState } from "react";
import { Link } from "react-router-dom";
import { Download, Chrome, CheckCircle2, Circle, ExternalLink, Puzzle, Bell, ArrowRight, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/lib/supabase";

const EXTENSION_DOWNLOAD_URL = import.meta.env.VITE_EXTENSION_DOWNLOAD_URL || "/extension/ping-analyst.crx";
const EXTENSION_VERSION = import.meta.env.VITE_EXTENSION_VERSION || "1.0.0";

const SETUP_STEPS = [
  { title: "Download the extension", description: 'Click "Download Extension" above. Your browser will download the ping-analyst.crx file.', icon: Download },
  { title: "Open Chrome Extensions", description: 'In Chrome, navigate to chrome://extensions.', icon: Chrome },
  { title: "Enable Developer Mode", description: 'Toggle the "Developer mode" switch in the top-right corner.', icon: Puzzle },
  { title: "Install the extension", description: 'Drag and drop ping-analyst.crx onto the Extensions page. Click "Add extension".', icon: CheckCircle2 },
  { title: "Pin it to your toolbar", description: "Click the puzzle-piece icon in Chrome's toolbar and pin Ping Analyst.", icon: Puzzle },
  { title: "Connect your account", description: "Click the Ping Analyst icon. It auto-detects your CRM session.", icon: CheckCircle2 },
  { title: "You're ready!", description: "Submit underwriting searches from the extension. Results appear in your CRM deals.", icon: Bell },
];

export default function ExtensionPage() {
  const [currentStep, setCurrentStep] = useState<number | null>(null);
  const handleDownload = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) await supabase.from("extension_downloads").insert({ user_id: user.id, version: EXTENSION_VERSION });
    } catch {}
    setCurrentStep(0);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-primary/10 p-4"><Chrome className="h-10 w-10 text-primary" /></div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold tracking-tight">Ping Analyst Extension</h1>
                <Badge variant="secondary">v{EXTENSION_VERSION}</Badge>
              </div>
              <p className="text-muted-foreground text-lg max-w-2xl">Run underwriting searches on any property directly from your browser. Results sync to your CRM automatically.</p>
            </div>
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <a href={EXTENSION_DOWNLOAD_URL} download="ping-analyst.crx" onClick={handleDownload}>
              <Button size="lg" className="gap-2 text-base px-6"><Download className="h-5 w-5" />Download Extension</Button>
            </a>
            <p className="text-sm text-muted-foreground">Chrome only · {EXTENSION_VERSION} · Uses your CRM login</p>
          </div>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-6 py-10 space-y-10">
        <Alert><Info className="h-4 w-4" /><AlertDescription>The extension uses your existing Ping Analyst login. Make sure you're logged in here before installing.</AlertDescription></Alert>
        <section>
          <h2 className="text-xl font-semibold mb-6">Setup Instructions</h2>
          <div className="space-y-4">
            {SETUP_STEPS.map((step, index) => {
              const isActive = currentStep === index;
              const isDone = currentStep !== null && index < currentStep;
              return (
                <Card key={index} className={`cursor-pointer transition-all duration-200 ${isActive ? "ring-2 ring-primary border-primary" : isDone ? "opacity-60" : "hover:border-muted-foreground/30"}`} onClick={() => setCurrentStep(isActive ? null : index)}>
                  <CardContent className="flex items-start gap-4 py-4">
                    <div className="mt-0.5 flex-shrink-0">
                      {isDone ? <CheckCircle2 className="h-6 w-6 text-green-500" /> : isActive ? <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">{index + 1}</div> : <Circle className="h-6 w-6 text-muted-foreground" />}
                    </div>
                    <div className="flex-1">
                      <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Step {index + 1}</span>
                      <h3 className="font-semibold text-base mt-0.5">{step.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
                      {isActive && index < SETUP_STEPS.length - 1 && <Button size="sm" variant="outline" className="mt-3 gap-1" onClick={(e) => { e.stopPropagation(); setCurrentStep(index + 1); }}>Mark done & next <ArrowRight className="h-3 w-3" /></Button>}
                      {isActive && index === SETUP_STEPS.length - 1 && <Link to="/deals" onClick={(e) => e.stopPropagation()}><Button size="sm" className="mt-3 gap-1">Go to my deals <ArrowRight className="h-3 w-3" /></Button></Link>}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
        <div className="flex items-center gap-4 pb-8">
          <Link to="/deals"><Button variant="outline" className="gap-2"><ArrowRight className="h-4 w-4 rotate-180" />Back to Deals</Button></Link>
          <Link to="/settings"><Button variant="ghost">Settings</Button></Link>
        </div>
      </div>
    </div>
  );
}
