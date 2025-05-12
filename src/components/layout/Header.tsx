import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { getUserById } from "@/services/userService";
import { User } from "@/types";

export function Header() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<User | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (user?.id) {
        const profileData = await getUserById(user.id);
        setProfile(profileData);
      } else {
        setProfile(null);
      }
    };
    fetchProfile();
  }, [user?.id]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Logged out successfully");
      navigate("/");
    } catch (error) {
      console.error("Error logging out:", error);
      toast.error("Failed to log out");
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-sm border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex h-20 items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="text-xl font-semibold cursor-pointer" onClick={() => navigate("/")}>
              ManualTrack
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                {profile && (
                  <span className="text-gray-700 font-medium">Welcome, {profile.name}</span>
                )}
                <Button variant="outline" size="sm" onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Log out
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={() => navigate("/login")}>
                Login
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
