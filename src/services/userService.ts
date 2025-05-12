import { supabase } from '@/integrations/supabase/client';
import { User } from '@/types';

export async function getUserById(id: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching user:', error);
    return null;
  }

  return data;
}

export async function getUsersByIds(ids: string[]): Promise<Map<string, User>> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .in('id', ids);

  if (error) {
    console.error('Error fetching users:', error);
    return new Map();
  }

  const userMap = new Map<string, User>();
  data?.forEach(user => {
    userMap.set(user.id, user);
  });

  return userMap;
} 