import { createMiddleware } from "@tanstack/react-start";
import { onAuthStateChanged } from "firebase/auth";
import { firebaseAuth } from "@/integrations/firebase/client";

export const attachFirebaseAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    if (!firebaseAuth) {
      return next({});
    }

    return new Promise((resolve, reject) => {
      const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
        unsubscribe();
        if (user) {
          const token = await user.getIdToken();
          resolve(
            next({
              headers: { Authorization: `Bearer ${token}` },
            }),
          );
        } else {
          resolve(next({}));
        }
      }, reject);
    });
  },
);
