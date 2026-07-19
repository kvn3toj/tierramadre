import { useLanguage } from '../../../contexts/LanguageContext';
import { ErrorState } from '../../../design-system';

interface TreasureErrorStateProps {
  isLight: boolean;
  error: string;
  onRetry: () => void;
  isRetrying?: boolean;
}

export default function TreasureErrorState({
  error,
  onRetry,
  isRetrying = false,
}: TreasureErrorStateProps) {
  const { t } = useLanguage();
  return (
    <ErrorState
      title={t.treasure.error.loadingFailed}
      message={
        error ||
        'No pudimos conectar con el servidor. Verifica tu conexion a internet e intenta de nuevo.'
      }
      onRetry={onRetry}
      retrying={isRetrying}
      retryLabel={isRetrying ? 'Reintentando...' : t.actions.retry}
    />
  );
}
