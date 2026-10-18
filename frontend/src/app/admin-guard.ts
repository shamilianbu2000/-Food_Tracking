import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, map, take } from 'rxjs';
import { Api } from './api';

/** Admin-only pages: wait for the mock user to load, then send non-admins back to My Meals. */
export const adminGuard: CanActivateFn = () => {
  const api = inject(Api);
  const router = inject(Router);
  return toObservable(api.ready).pipe(
    filter(Boolean), take(1),
    map(() => {
      if (api.user()?.role === 'admin') return true;
      api.toast('That page is for admins only. Switch to Admin Frank to use it.');
      return router.createUrlTree(['/meals']);
    }),
  );
};
