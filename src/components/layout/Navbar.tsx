import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Home, WalletCards, User, LogOut } from "lucide-react";

interface NavbarProps {
  isLoggedIn?: boolean;
  onLogout?: () => void;
}

const Navbar = ({ isLoggedIn = false, onLogout }: NavbarProps) => {
  const location = useLocation();

  const navItems = [
    { label: "Dashboard", path: "/dashboard", icon: Home },
    { label: "Stack", path: "/stack", icon: WalletCards },
    { label: "Profil", path: "/profile", icon: User },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card/80 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-2xl font-bold text-primary font-logo">
            Neuvia
          </span>
        </Link>

        {isLoggedIn && (
          <nav className="flex items-center gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Button
                  key={item.path}
                  variant={location.pathname === item.path ? "soft" : "ghost"}
                  size="sm"
                  asChild
                  className={cn(
                    "rounded-full px-4",
                    location.pathname === item.path && "font-bold"
                  )}
                >
                  <Link to={item.path}>
                    {Icon ? <Icon className="w-4 h-4" /> : item.label}
                  </Link>
                </Button>
              );
            })}
            <Button
              variant="outline"
              size="sm"
              onClick={onLogout}
              className="ml-2 rounded-full"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </nav>
        )}
      </div>
    </header>
  );
};

export default Navbar;
