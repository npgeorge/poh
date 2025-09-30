import { useQuery, useMutation } from "@tanstack/react-query";
import type { User } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";

export function useAuth() {
  const { data: user, isLoading } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  const switchRoleMutation = useMutation({
    mutationFn: async (role: 'customer' | 'printer_owner') => {
      return await apiRequest("/api/auth/switch-role", {
        method: "POST",
        body: JSON.stringify({ role }),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    switchRole: switchRoleMutation.mutate,
    isSwitchingRole: switchRoleMutation.isPending,
  };
}
