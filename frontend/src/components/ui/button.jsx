import * as React from "react";
import { cn } from "@/lib/utils";

const buttonBaseClasses =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer";

const buttonVariantClasses = {
  default: "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
  destructive: "bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90",
  outline: "border border-input bg-background shadow-xs hover:bg-accent/10 hover:text-accent-foreground",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  ghost: "hover:bg-accent/10 hover:text-accent-foreground",
  link: "text-primary underline-offset-4 hover:underline",
  emerald: "bg-emerald-600 text-white shadow-sm hover:bg-emerald-500 active:bg-emerald-700",
};

const buttonSizeClasses = {
  default: "h-9 px-4 py-2",
  sm: "h-8 rounded-md px-3 text-xs",
  lg: "h-10 rounded-md px-8",
  icon: "h-9 w-9",
};

function buttonVariants({ variant = "default", size = "default", className } = {}) {
  return cn(
    buttonBaseClasses,
    buttonVariantClasses[variant] ?? buttonVariantClasses.default,
    buttonSizeClasses[size] ?? buttonSizeClasses.default,
    className
  );
}

const Button = React.forwardRef(
  ({ className, variant, size, asChild = false, children, ...props }, ref) => {
    const classes = buttonVariants({ variant, size, className });

    if (!asChild) {
      return (
        <button className={classes} ref={ref} {...props}>
          {children}
        </button>
      );
    }

    if (!React.isValidElement(children)) {
      throw new Error("Button with asChild requires a single React element child.");
    }

    const childProps = children.props;
    return React.cloneElement(children, {
      ...props,
      ...childProps,
      className: cn(classes, childProps.className),
      style: { ...props.style, ...childProps.style },
      ref,
    });
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
