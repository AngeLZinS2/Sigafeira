import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function getFocusableElements(dialog) {
  return [...dialog.querySelectorAll(FOCUSABLE_SELECTOR)].filter((element) => (
    !element.classList.contains('visually-hidden') && element.getClientRects().length > 0
  ));
}

export function useDialogA11y(dialogRef, isOpen, onClose) {
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen || !dialogRef.current) return undefined;

    const dialog = dialogRef.current;
    const previouslyFocused = document.activeElement;
    const focusFirst = (target) => {
      const first = getFocusableElements(target)[0] || target;
      first.focus({ preventScroll: true });
    };
    const initialFocus = window.requestAnimationFrame(() => focusFirst(dialog));

    const handleKeyDown = (event) => {
      const dialogs = [...document.querySelectorAll('[role="dialog"]')];
      if (dialogs[dialogs.length - 1] !== dialog) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = getFocusableElements(dialog);
      if (!focusable.length) {
        event.preventDefault();
        dialog.focus({ preventScroll: true });
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(initialFocus);
      document.removeEventListener('keydown', handleKeyDown);
      const restoreFocus = () => {
        const remainingDialogs = [...document.querySelectorAll('[role="dialog"]')].filter((element) => element !== dialog);
        const nextDialog = remainingDialogs[remainingDialogs.length - 1];
        if (nextDialog) focusFirst(nextDialog);
        else if (previouslyFocused instanceof HTMLElement && previouslyFocused.isConnected) previouslyFocused.focus({ preventScroll: true });
      };
      if (dialog.isConnected) window.setTimeout(restoreFocus, 360);
      else restoreFocus();
    };
  }, [dialogRef, isOpen]);
}
