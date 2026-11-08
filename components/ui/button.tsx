import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--blue)] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-[var(--blue)] text-white hover:bg-[var(--blue-dark)]",
        outline:
          "border border-[var(--line)] bg-white/70 text-[var(--ink)] hover:bg-[var(--sand)]",
        ghost: "text-[var(--blue)] hover:bg-[var(--blue-soft)]",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

function Button({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp className={cn(buttonVariants({ variant, className }))} {...props} />
  );
}

export { Button, buttonVariants };
