import { cn } from "@/lib/utils";

type Stage = string;

const stageStyles: Record<string, string> = {
  New: "bg-muted text-muted-foreground",
  Active: "bg-blue/10 text-blue",
  Review: "bg-blue/10 text-blue",
  "Under Review": "bg-amber/10 text-amber",
  Offer: "bg-amber/10 text-amber",
  Contract: "bg-amber/10 text-amber",
  Closed: "bg-emerald/10 text-emerald",
  Pass: "bg-rose/10 text-rose",
};

export default function StageBadge({ stage, className }: { stage: Stage; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold",
        stageStyles[stage] || stageStyles.New,
        className
      )}
    >
      {stage}
    </span>
  );
}
