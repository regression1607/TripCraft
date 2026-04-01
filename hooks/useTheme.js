import { useSettings } from '../context/SettingsContext';
import { spacing, shadows, borderRadius } from '../styles/theme';

// Hook that returns theme-aware colors + static theme values
export default function useTheme() {
  const { colors, typography, darkMode } = useSettings();
  return { colors, typography, darkMode, spacing, shadows, borderRadius };
}
