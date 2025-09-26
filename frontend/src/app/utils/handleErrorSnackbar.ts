import {MatSnackBar} from '@angular/material/snack-bar';
import {ToastMessageComponent} from '../common/components/toast-message/toast-message.component';

export const handleErrorSnackbar: (
  snackBar: MatSnackBar,
  error: any,
  context: string,
) => void = (snackBar: MatSnackBar, error: any, context: string) => {
  console.error(`${context} error:`, error);
  const errorMessage =
    error?.error?.detail?.[0]?.msg ||
    error?.error?.detail ||
    error?.message ||
    'Something went wrong';

  snackBar.openFromComponent(ToastMessageComponent, {
    panelClass: ['red-toast'],
    verticalPosition: 'top',
    horizontalPosition: 'right',
    duration: 6000,
    data: {
      text: errorMessage,
      icon: 'cross-in-circle-white',
    },
  });
};

export const handleSuccessSnackbar: (
  snackBar: MatSnackBar,
  msg: any,
) => void = (snackBar: MatSnackBar, msg: any) => {
  snackBar.openFromComponent(ToastMessageComponent, {
    panelClass: ['green-toast'],
    verticalPosition: 'top',
    horizontalPosition: 'right',
    duration: 6000,
    data: {
      text: msg,
      matIcon: 'check_small',
    },
  });
};
