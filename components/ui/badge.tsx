import { cn } from "@/lib/utils";
export function Badge({ className, variant = "default", children, ...props }: any) {
  const variants: any = {
    default: "bg-green-600 text-white",
    secondary: "bg-gray-100 text-gray-800",
    success: "bg-green-100 text-green-800",
    warning: "bg-yellow-100 text-yellow-800",
    destructive: "bg-red-100 text-red-800",
  };
  return (
    <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold", variants[variant], className)} {...props}>
      {children}
    </span>
  );
}
