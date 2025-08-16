import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card.jsx';
import { Button } from '../components/ui/button.jsx';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../state/ThemeContext.jsx';

export default function ThemeSettings() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>テーマ設定</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Button
            variant={theme === 'light' ? 'default' : 'outline'}
            onClick={() => setTheme('light')}
            className="flex-1"
          >
            <Sun className="h-4 w-4 mr-2" />
            ライト
          </Button>
          <Button
            variant={theme === 'dark' ? 'default' : 'outline'}
            onClick={() => setTheme('dark')}
            className="flex-1"
          >
            <Moon className="h-4 w-4 mr-2" />
            ダーク
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
