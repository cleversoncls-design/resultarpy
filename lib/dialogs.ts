import { Alert, Platform } from 'react-native';

/**
 * Confirmação compatível com web e mobile. O Alert.alert do react-native-web
 * não exibe nada (nem executa os botões), então na web usamos window.confirm.
 */
export function confirmAction(options: { title: string; message?: string; confirmLabel: string; cancelLabel: string; destructive?: boolean }): Promise<boolean> {
  if (Platform.OS === 'web') {
    const text = options.message ? `${options.title}\n\n${options.message}` : options.title;
    return Promise.resolve(typeof window !== 'undefined' ? window.confirm(text) : false);
  }
  return new Promise((resolve) => {
    Alert.alert(options.title, options.message, [
      { text: options.cancelLabel, style: 'cancel', onPress: () => resolve(false) },
      { text: options.confirmLabel, style: options.destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) });
  });
}

/** Aviso simples compatível com web e mobile. */
export function showMessage(title: string, message?: string): void {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.alert(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}
