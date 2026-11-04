import type { FormHTMLAttributes, KeyboardEvent, MouseEvent, SyntheticEvent } from 'react';

/**
 * Ein Formular, das auch dort abschickt, wo der Browser das Abschicken sperrt, etwa in einem
 * abgeschotteten Rahmen (sandbox ohne `allow-forms`) wie der Vorschau in der Claude-App: Dort kommt
 * das Ereignis `submit` gar nicht erst an. Deshalb rufen ein Klick auf einen Absendeknopf und Enter in
 * einem Eingabefeld `onSend` selbst auf und verhindern das eigentliche Abschicken. Ein gesperrter
 * Absendeknopf (`disabled`) sperrt auch Enter.
 */
export function Form({ onSend, children, ...rest }: Omit<FormHTMLAttributes<HTMLFormElement>, 'onSubmit' | 'onClick' | 'onKeyDown'> & { readonly onSend: () => void }) {
  const send = (e: SyntheticEvent) => {
    e.preventDefault();
    onSend();
  };
  const onClick = (e: MouseEvent<HTMLFormElement>) => {
    const button = (e.target as Element).closest('button');
    if (button && button.type === 'submit' && !button.disabled && e.currentTarget.contains(button)) send(e);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLFormElement>) => {
    if (e.key !== 'Enter' || e.nativeEvent.isComposing || !(e.target instanceof HTMLInputElement)) return;
    e.preventDefault();
    const submit = e.currentTarget.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (!submit?.disabled) onSend();
  };
  return (
    <form {...rest} onSubmit={send} onClick={onClick} onKeyDown={onKeyDown}>
      {children}
    </form>
  );
}
