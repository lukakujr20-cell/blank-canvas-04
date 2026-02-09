import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Package, Loader2, AlertCircle, Mail, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { LanguageSelector } from '@/components/LanguageSelector';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageSelectionModal } from '@/components/LanguageSelectionModal';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const { signIn, user, loading, role, isKitchen } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Redirect authenticated users based on role
  useEffect(() => {
    if (!loading && user && role) {
      if (isKitchen) {
        navigate('/kitchen');
      } else {
        navigate('/dashboard');
      }
    }
  }, [user, loading, role, isKitchen, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!email || !password) {
      setError(t('auth.fill_all_fields'));
      setIsLoading(false);
      return;
    }

    const { error } = await signIn(email, password);

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        setError(t('auth.invalid_credentials'));
      } else {
        setError(t('auth.error'));
      }
      setIsLoading(false);
      return;
    }

    toast({
      title: t('auth.success'),
      description: t('auth.welcome'),
    });

    // Navigation is handled by the useEffect above based on role
    setIsLoading(false);
  };

  const handleResetPassword = async () => {
    if (!resetEmail) {
      toast({
        title: t('auth.fill_all_fields'),
        variant: 'destructive',
      });
      return;
    }

    setResetLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/auth?reset=true`,
      });

      if (error) {
        throw error;
      }

      setResetSent(true);
    } catch (error) {
      console.error('Reset password error:', error);
      toast({
        title: t('auth.reset_error'),
        variant: 'destructive',
      });
    } finally {
      setResetLoading(false);
    }
  };

  const handleCloseForgotPassword = () => {
    setShowForgotPassword(false);
    setResetEmail('');
    setResetSent(false);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Language Selection Modal (first access) */}
      <LanguageSelectionModal />
      
      {/* Header with language/theme options */}
      <header className="flex items-center justify-end gap-2 p-4">
        <LanguageSelector variant="compact" />
        <ThemeToggle variant="compact" />
      </header>

      <div className="flex flex-1 items-center justify-center p-4">
        <Card className="w-full max-w-md animate-fade-in">
          <CardHeader className="space-y-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary">
              <Package className="h-8 w-8 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold">{t('auth.title')}</CardTitle>
              <CardDescription className="mt-2">
                {t('auth.subtitle')}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email">{t('auth.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{t('auth.password')}</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  autoComplete="current-password"
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('auth.logging_in')}
                  </>
                ) : (
                  t('auth.login')
                )}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <Button
                type="button"
                variant="link"
                className="text-sm text-muted-foreground hover:text-primary"
                onClick={() => setShowForgotPassword(true)}
              >
                {t('auth.forgot_password')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer with language selector */}
      <footer className="flex items-center justify-center gap-4 border-t p-4">
        <LanguageSelector />
      </footer>

      {/* Forgot Password Modal */}
      <Dialog open={showForgotPassword} onOpenChange={handleCloseForgotPassword}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('auth.forgot_password_title')}</DialogTitle>
            <DialogDescription>
              {t('auth.forgot_password_desc')}
            </DialogDescription>
          </DialogHeader>
          
          {resetSent ? (
            <div className="flex flex-col items-center gap-4 py-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <CheckCircle className="h-8 w-8 text-primary" />
              </div>
              <div className="text-center">
                <h3 className="font-medium">{t('auth.reset_sent')}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {t('auth.reset_sent_desc')}
                </p>
              </div>
              <Button onClick={handleCloseForgotPassword} className="mt-4">
                {t('common.close')}
              </Button>
            </div>
          ) : (
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="resetEmail">{t('auth.email')}</Label>
                <Input
                  id="resetEmail"
                  type="email"
                  placeholder="seu@email.com"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  disabled={resetLoading}
                />
              </div>
              <Button
                className="w-full"
                onClick={handleResetPassword}
                disabled={resetLoading}
              >
                {resetLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('common.loading')}
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    {t('auth.send_reset_link')}
                  </>
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
