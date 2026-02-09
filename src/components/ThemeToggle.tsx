import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Moon, Sun } from 'lucide-react';

interface ThemeToggleProps {
  variant?: 'default' | 'compact';
}

export function ThemeToggle({ variant = 'default' }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size={variant === 'compact' ? 'sm' : 'default'}
      onClick={toggleTheme}
      className="gap-2"
    >
      {theme === 'light' ? (
        <>
          <Sun className="h-4 w-4" />
          {variant === 'default' && <span className="hidden sm:inline">Light</span>}
        </>
      ) : (
        <>
          <Moon className="h-4 w-4" />
          {variant === 'default' && <span className="hidden sm:inline">Dark</span>}
        </>
      )}
    </Button>
  );
}
