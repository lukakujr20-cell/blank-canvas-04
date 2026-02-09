import { useState } from 'react';
import { useLanguage, Language, useShowLanguageSelector } from '@/contexts/LanguageContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';

const languages: { code: Language; name: string; flag: string; greeting: string }[] = [
  { code: 'pt-BR', name: 'Português (Brasil)', flag: '🇧🇷', greeting: 'Bem-vindo!' },
  { code: 'es', name: 'Español (España)', flag: '🇪🇸', greeting: '¡Bienvenido!' },
  { code: 'en', name: 'English', flag: '🇬🇧', greeting: 'Welcome!' },
];

export function LanguageSelectionModal() {
  const { setLanguage } = useLanguage();
  const showSelector = useShowLanguageSelector();
  const [open, setOpen] = useState(showSelector);

  const handleSelect = (lang: Language) => {
    setLanguage(lang);
    setOpen(false);
  };

  if (!showSelector) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-4">
            <Globe className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center text-xl">
            Select your language / Seleccione su idioma / Selecione seu idioma
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-4">
          {languages.map((lang) => (
            <Button
              key={lang.code}
              variant="outline"
              className="h-16 justify-start gap-4 text-left"
              onClick={() => handleSelect(lang.code)}
            >
              <span className="text-3xl">{lang.flag}</span>
              <div>
                <div className="font-medium">{lang.name}</div>
                <div className="text-sm text-muted-foreground">{lang.greeting}</div>
              </div>
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
