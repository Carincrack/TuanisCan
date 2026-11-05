import { useCallback, useRef, useState } from "react";
import type { ReactNode } from "react";
import { guardarUbicacionPaseo } from "../services/live-walks.service";
import { LiveLocationShareContext, type ErrorCompartirUbicacion } from "./live-location-share-context";

/* ─────────────────────────────────────────────────────────────
   Compartir ubicación durante un paseo, pero vivo arriba de la
   página (ver dónde se monta el Provider en `RootLayout.tsx`), no
   adentro de `PaseoActivoPaseador`.

   El `watchPosition` vivía en un `useRef` de esa pantalla, y el
   `useEffect` lo apagaba como cleanup cada vez que el componente se
   desmontaba — que es exactamente lo que pasa al navegar a otra
   página (por ejemplo, al chat) y volver. El paseador tenía que
   darle a «Compartir» de nuevo cada vez.

   Acá el watcher sigue corriendo mientras el paseador se mueve
   entre páginas de la app: solo se apaga cuando él le da a «Dejar de
   compartir» o cuando pasa un error real de ubicación/envío.
   ───────────────────────────────────────────────────────────── */

export const LiveLocationShareProvider = ({ children }: { children: ReactNode }) => {
  const [sharing, setSharing] = useState(false);
  const [activeWalkId, setActiveWalkId] = useState<string | null>(null);
  const [error, setError] = useState<ErrorCompartirUbicacion>(null);
  const watch = useRef<number | null>(null);
  const lastSent = useRef(0);

  const stop = useCallback(() => {
    if (watch.current !== null) navigator.geolocation.clearWatch(watch.current);
    watch.current = null;
    setSharing(false);
    setActiveWalkId(null);
  }, []);

  const start = useCallback(
    (walkId: string) => {
      if (!navigator.geolocation) {
        setError("noGeolocation");
        return;
      }
      if (watch.current !== null) navigator.geolocation.clearWatch(watch.current);

      setError(null);
      setActiveWalkId(walkId);
      setSharing(true);
      watch.current = navigator.geolocation.watchPosition(
        (position) => {
          if (Date.now() - lastSent.current < 3000) return;
          lastSent.current = Date.now();
          void guardarUbicacionPaseo(walkId, position.coords).catch(() => {
            setError("sendFailed");
            stop();
          });
        },
        () => {
          setError("locationFailed");
          stop();
        },
        { enableHighAccuracy: true, maximumAge: 10000 },
      );
    },
    [stop],
  );

  const clearError = useCallback(() => setError(null), []);

  return (
    <LiveLocationShareContext.Provider value={{ sharing, activeWalkId, error, start, stop, clearError }}>
      {children}
    </LiveLocationShareContext.Provider>
  );
};
