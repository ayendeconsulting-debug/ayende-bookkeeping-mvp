import { toast } from 'sonner';

/**
 * Tempo Bookkeeping toast helpers.
 *
 * Wraps sonner with consistent duration and style so all components
 * import one function instead of configuring toast options individually.
 */

const DURATION_SUCCESS = 3000;
const DURATION_ERROR   = 5000;

export function toastSuccess(message: string, description?: string) {
  toast.success(message, { description, duration: DURATION_SUCCESS });
}

export function toastError(message: string, description?: string) {
  toast.error(message, { description, duration: DURATION_ERROR });
}

export function toastInfo(message: string, description?: string) {
  toast.info(message, { description, duration: DURATION_SUCCESS });
}

export function toastLoading(message: string): string | number {
  return toast.loading(message);
}

export function toastDismiss(id: string | number) {
  toast.dismiss(id);
}
