import { cn } from "./utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-2xl bg-[#E2E8F0]", className)}
      {...props}
    />
  );
}

export { Skeleton };
