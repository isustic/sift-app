import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export type StepType = "columns" | "groupBy" | "calculate" | "filters" | "sort" | "run";

export interface Step {
  id: StepType;
  label: string;
  index: number;
}

const STEPS: Step[] = [
  { id: "columns", label: "Columns", index: 0 },
  { id: "groupBy", label: "Group By", index: 1 },
  { id: "calculate", label: "Calculate", index: 2 },
  { id: "filters", label: "Filters", index: 3 },
  { id: "sort", label: "Sort", index: 4 },
  { id: "run", label: "Run", index: 5 },
];

interface StepNavigationProps {
  currentStep: StepType;
  completedSteps: Set<StepType>;
  onStepClick: (step: StepType) => void;
}

export function StepNavigation({
  currentStep,
  completedSteps,
  onStepClick,
}: StepNavigationProps) {
  const getCurrentIndex = () => {
    return STEPS.find((s) => s.id === currentStep)?.index ?? 0;
  };

  const currentIndex = getCurrentIndex();

  const canClickStep = (step: Step): boolean => {
    const isCompleted = completedSteps.has(step.id);
    const isCurrent = step.id === currentStep;
    const isPrevious = step.index < currentIndex;
    return isCompleted || isCurrent || isPrevious;
  };

  return (
    <div className="flex items-center justify-between mb-6">
      {STEPS.map((step, idx) => {
        const isCompleted = completedSteps.has(step.id);
        const isCurrent = step.id === currentStep;
        const canClick = canClickStep(step);

        return (
          <div key={step.id} className="flex items-center flex-1">
            {/* Step button */}
            <button
              onClick={() => canClick && onStepClick(step.id)}
              disabled={!canClick}
              className={cn(
                "flex items-center gap-2 min-w-fit transition-all duration-200",
                canClick
                  ? "cursor-pointer hover:scale-105"
                  : "cursor-not-allowed opacity-50"
              )}
              aria-current={isCurrent ? "step" : undefined}
            >
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-200",
                  isCurrent
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30 ring-2 ring-primary/50"
                    : isCompleted
                    ? "bg-emerald-500 text-white shadow-md"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <span>{step.index + 1}</span>
                )}
              </div>
              <span
                className={cn(
                  "text-sm font-medium whitespace-nowrap",
                  isCurrent
                    ? "text-foreground"
                    : isCompleted
                    ? "text-foreground/80"
                    : "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </button>

            {/* Connector line */}
            {idx < STEPS.length - 1 && (
              <div
                className={cn(
                  "flex-1 h-0.5 mx-2 transition-all duration-300",
                  idx < currentIndex
                    ? "bg-primary"
                    : "bg-muted"
                )}
                aria-hidden="true"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
