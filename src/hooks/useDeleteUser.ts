import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useDeleteUser = (onSuccess: () => void) => {
  const [deleting, setDeleting] = useState<string | null>(null);

  const deleteUser = async (userId: string, name: string) => {
    setDeleting(userId);
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ userId }),
      }
    );

    const result = await res.json();
    setDeleting(null);

    if (!res.ok) {
      toast.error("خطأ في الحذف", { description: result.error });
    } else {
      toast.success(`تم حذف ${name} بنجاح`);
      onSuccess();
    }
  };

  return { deleting, deleteUser };
};
