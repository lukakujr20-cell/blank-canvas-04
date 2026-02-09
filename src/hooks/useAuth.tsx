import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'super_admin' | 'host' | 'admin' | 'staff' | 'cozinha';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  restaurantId: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isHost: boolean;
  isSuperAdmin: boolean;
  isKitchen: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await (supabase
        .from('user_roles') as any)
        .select('role')
        .eq('user_id', userId)
        .single();
      
      if (error) {
        console.error('Error fetching role:', error);
        return null;
      }
      return data?.role as AppRole;
    } catch (err) {
      console.error('Error fetching role:', err);
      return null;
    }
  };

  const fetchRestaurantId = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('restaurant_id')
        .eq('id', userId)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching restaurant_id:', error);
        return null;
      }
      return (data as any)?.restaurant_id;
    } catch (err) {
      console.error('Error fetching restaurant_id:', err);
      return null;
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Defer role fetch with setTimeout to avoid deadlock
          setTimeout(() => {
            fetchUserRole(session.user.id).then(setRole);
            fetchRestaurantId(session.user.id).then(setRestaurantId);
          }, 0);
        } else {
          setRole(null);
          setRestaurantId(null);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        Promise.all([
          fetchUserRole(session.user.id),
          fetchRestaurantId(session.user.id)
        ]).then(([fetchedRole, fetchedRestaurantId]) => {
          setRole(fetchedRole);
          setRestaurantId(fetchedRestaurantId);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setRole(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        role,
        restaurantId,
        loading,
        signIn,
        signOut,
        isAdmin: role === 'admin' || role === 'host' || role === 'super_admin',
        isHost: role === 'host' || role === 'super_admin',
        isSuperAdmin: role === 'super_admin',
        isKitchen: role === 'cozinha',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
