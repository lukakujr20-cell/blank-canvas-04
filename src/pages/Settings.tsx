import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useLanguage, Language } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useCurrency, Currency, currencies } from '@/contexts/CurrencyContext';
import { useAuth } from '@/hooks/useAuth';
import { Globe, Palette, LogOut, Settings as SettingsIcon, Truck, Coins, Store, FileText, Clock } from 'lucide-react';
import SupplierManagement from '@/components/SupplierManagement';
import { CloseBarModal } from '@/components/CloseBarModal';
import { ClosingHistoryModal } from '@/components/ClosingHistoryModal';
import { useSession } from '@/hooks/useSession';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

const languages: { code: Language; name: string; flag: string }[] = [
  { code: 'pt-BR', name: 'Português (Brasil)', flag: '🇧🇷' },
  { code: 'es', name: 'Español (España)', flag: '🇪🇸' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
];

export default function Settings() {
  const { language, setLanguage, t } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { currency, setCurrency } = useCurrency();
  const { signOut, isAdmin, isHost } = useAuth();
  const navigate = useNavigate();
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [closeBarOpen, setCloseBarOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const { currentSession, openSession, closeSession } = useSession();

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">{t('settings.title')}</h1>
          <p className="mt-1 text-muted-foreground">{t('settings.subtitle')}</p>
        </div>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList>
            <TabsTrigger value="general" className="gap-2">
              <SettingsIcon className="h-4 w-4" />
              {t('settings.general')}
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="suppliers" className="gap-2">
                <Truck className="h-4 w-4" />
                {t('settings.suppliers_tab')}
              </TabsTrigger>
            )}
            {isAdmin && (
              <TabsTrigger value="operations" className="gap-2">
                <Store className="h-4 w-4" />
                {t('settings.operations_tab')}
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="general" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Language Card */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Globe className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{t('settings.language')}</CardTitle>
                      <CardDescription>{t('settings.language_desc')}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Select value={language} onValueChange={(value: Language) => setLanguage(value)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {languages.map((lang) => (
                        <SelectItem key={lang.code} value={lang.code}>
                          <div className="flex items-center gap-2">
                            <span>{lang.flag}</span>
                            <span>{lang.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              {/* Theme Card */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Palette className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{t('settings.theme')}</CardTitle>
                      <CardDescription>{t('settings.theme_desc')}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Select value={theme} onValueChange={(value: 'light' | 'dark') => setTheme(value)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">
                        <div className="flex items-center gap-2">
                          <span>☀️</span>
                          <span>{t('settings.light')}</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="dark">
                        <div className="flex items-center gap-2">
                          <span>🌙</span>
                          <span>{t('settings.dark')}</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              {/* Currency Card */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Coins className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{t('settings.currency')}</CardTitle>
                      <CardDescription>{t('settings.currency_desc')}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Select value={currency} onValueChange={(value: Currency) => setCurrency(value)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map((curr) => (
                        <SelectItem key={curr.code} value={curr.code}>
                          <div className="flex items-center gap-2">
                            <span className="font-mono">{curr.symbol}</span>
                            <span>{curr.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              {/* Session Card */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
                      <LogOut className="h-5 w-5 text-destructive" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{t('settings.session')}</CardTitle>
                      <CardDescription>{t('settings.session_desc')}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <AlertDialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" className="w-full sm:w-auto">
                        <LogOut className="mr-2 h-4 w-4" />
                        {t('settings.logout')}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t('settings.logout_confirm_title')}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t('settings.logout_confirm')}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={handleLogout}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {t('settings.logout')}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {t('settings.logout_desc')}
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {isAdmin && (
            <TabsContent value="suppliers">
              <SupplierManagement />
            </TabsContent>
          )}

          {isAdmin && (
            <TabsContent value="operations" className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Session / Shift Card */}
                <Card className={currentSession ? 'border-green-500/50' : ''}>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${currentSession ? 'bg-green-500/10' : 'bg-muted'}`}>
                        <Clock className={`h-5 w-5 ${currentSession ? 'text-green-500' : 'text-muted-foreground'}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg">{t('session.title')}</CardTitle>
                          <Badge variant={currentSession ? 'default' : 'secondary'}>
                            {currentSession ? t('session.open') : t('session.closed')}
                          </Badge>
                        </div>
                        <CardDescription>{t('session.description')}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {currentSession ? (
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                          {t('session.opened_at')}: <span className="font-medium text-foreground">{format(new Date(currentSession.start_time), 'dd/MM/yyyy HH:mm')}</span>
                        </p>
                        <Button 
                          variant="destructive" 
                          className="w-full"
                          onClick={() => setCloseBarOpen(true)}
                        >
                          <Store className="mr-2 h-4 w-4" />
                          {t('session.close_shift')}
                        </Button>
                      </div>
                    ) : (
                      <Button 
                        className="w-full"
                        onClick={openSession}
                      >
                        <Clock className="mr-2 h-4 w-4" />
                        {t('session.open_new')}
                      </Button>
                    )}
                  </CardContent>
                </Card>

                {/* Closing History Card - Only for Host */}
                {isHost && (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{t('close_bar.history_title')}</CardTitle>
                          <CardDescription>{t('close_bar.history_desc')}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => setHistoryOpen(true)}
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        {t('close_bar.view_history')}
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          )}
        </Tabs>
      </div>

      <CloseBarModal open={closeBarOpen} onOpenChange={setCloseBarOpen} onSessionClosed={closeSession} />
      <ClosingHistoryModal open={historyOpen} onOpenChange={setHistoryOpen} />
    </DashboardLayout>
  );
}