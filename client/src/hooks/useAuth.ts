import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import type { User } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";

export function useAuth() {
  const [, setLocation] = useLocation();

  const { data: user, isLoading } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  const switchRoleMutation = useMutation({
    mutationFn: async (role: 'customer' | 'printer_owner') => {
      return await apiRequest("POST", "/api/auth/switch-role", { role });
    },
    onSuccess: (_, role) => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      // Navigate to the appropriate dashboard
      if (role === 'customer') {
        setLocation('/customer/dashboard');
      } else if (role === 'printer_owner') {
        setLocation('/printer-owner/dashboard');
      }
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/logout", {});
    },
    onSuccess: () => {
      queryClient.clear();
      setLocation('/');
    },
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    switchRole: switchRoleMutation.mutate,
    isSwitchingRole: switchRoleMutation.isPending,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
  };
}
