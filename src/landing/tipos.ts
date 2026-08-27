/* Contrato que la portada expone al resto de la aplicación. */

/** Qué pantalla de acceso abrir al salir de la portada. */
export type ModoAcceso = "login" | "registro";

export interface LandingProps {
  /** Abre el login. `registro` arranca la tarjeta en "Crear cuenta". */
  onEntrar: (modo?: ModoAcceso) => void;
}

/** Lo único que necesita una sección para mandar a alguien al acceso. */
export interface ConAcceso {
  onEntrar: (modo?: ModoAcceso) => void;
}
