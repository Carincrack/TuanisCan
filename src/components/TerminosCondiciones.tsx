import { MARCA } from "../lib/nav";

/* ─────────────────────────────────────────────────────────────
   Fecha en la que se redactó esta versión. Cambiarla es la señal de
   que el texto cambió de fondo — no hace falta un historial de
   versiones para esto, con la fecha alcanza para que alguien que ya
   había aceptado sepa si hay algo nuevo que leer. */
export const TERMINOS_VERSION = "2026-09-24";

const secciones: { titulo: string; parrafos: string[] }[] = [
  {
    titulo: "1. Qué es esto",
    parrafos: [
      `${MARCA.completo} es una plataforma que conecta a dueños de mascotas con paseadores y negocios (veterinarias, tiendas, refugios) dentro de Costa Rica. Al crear una cuenta aceptás estos términos, sin importar con cuál rol entrés primero: podés tener varios roles en una misma cuenta.`,
      "La plataforma intermedia el contacto y el pago entre las partes, pero no presta el servicio de paseo ni los servicios veterinarios o comerciales: esos los prestan personas y negocios independientes registrados acá.",
    ],
  },
  {
    titulo: "2. Tu cuenta",
    parrafos: [
      "Sos responsable de la información que registrás — la tuya, la de tus mascotas y, si sos paseador o negocio, la de tu perfil público. Si algo cambia (tu teléfono, tu zona, la salud de tu mascota), te toca mantenerlo al día.",
      "Una cuenta es de una sola persona. No podés compartir tu acceso ni usar la cuenta de otra persona sin su autorización.",
    ],
  },
  {
    titulo: "3. Verificación de paseadores y negocios",
    parrafos: [
      "Para recibir solicitudes de paseo o aparecer en el directorio, paseadores y negocios pasan por una revisión de documentos. Que un perfil esté verificado significa que sus documentos fueron revisados, no que la plataforma garantice su desempeño en cada paseo o servicio.",
      "Un documento falso o vencido es motivo para rechazar la verificación o desactivar la cuenta, incluso si ya estaba aprobada.",
    ],
  },
  {
    titulo: "4. Solicitar y aceptar paseos",
    parrafos: [
      "El dueño elige paseador, fecha, hora, duración y punto de encuentro. El paseador decide si acepta o rechaza cada solicitud; una vez aceptada, el compromiso es entre ambas personas.",
      "El precio se calcula según la duración, el horario y el día, y se muestra antes de confirmar la solicitud. Cambiar la fecha u hora después de aceptado el paseo requiere acuerdo de ambas partes.",
    ],
  },
  {
    titulo: "5. Pagos",
    parrafos: [
      "Los pagos se procesan a través de los métodos que registrás en tu cuenta. La plataforma cobra una comisión sobre cada paseo pagado, que se descuenta del monto que recibe el paseador.",
      `${MARCA.completo} no guarda los datos completos de tu tarjeta: solo se conservan los últimos cuatro dígitos y la información necesaria para identificarla en tu lista de métodos de pago.`,
    ],
  },
  {
    titulo: "6. Mascotas perdidas",
    parrafos: [
      "Los reportes de mascotas perdidas y los avistamientos que publica la comunidad son visibles para otras personas usuarias de tu zona. No publiques datos de contacto que no quieras hacer públicos: usá el campo de contacto del reporte para eso.",
    ],
  },
  {
    titulo: "7. Conducta",
    parrafos: [
      "Esperamos trato respetuoso entre dueños, paseadores y negocios. No se permite el uso de la plataforma para acoso, fraude, ni para poner en riesgo a una mascota o a una persona.",
      "El incumplimiento reiterado, las reseñas falsas o los reportes de mascotas perdidas inventados son motivo de suspensión de la cuenta.",
    ],
  },
  {
    titulo: "8. Responsabilidad",
    parrafos: [
      `${MARCA.completo} facilita el contacto y el cobro, pero el paseo, el cuidado y las decisiones durante el servicio son responsabilidad de quien lo presta y de quien lo contrata. Cualquier incidente durante un paseo (una lesión, un daño, una pérdida) se resuelve entre las partes involucradas; la plataforma colabora con la información disponible en la cuenta cuando se le solicita.`,
    ],
  },
  {
    titulo: "9. Tus datos",
    parrafos: [
      "Usamos tus datos —perfil, mascotas, ubicación durante un paseo activo, historial de paseos y pagos— para operar la plataforma: emparejar solicitudes, calcular precios, mostrar tu carné digital y notificarte de lo que pasa en tu cuenta.",
      "La ubicación en tiempo real solo se comparte mientras un paseo está en curso, y solo entre el dueño y el paseador de ese paseo específico.",
    ],
  },
  {
    titulo: "10. Cambios a estos términos",
    parrafos: [
      "Si estos términos cambian de forma importante, te lo vamos a notificar dentro de la aplicación antes de que sigan aplicando. Seguir usando la cuenta después de ese aviso implica que los aceptás.",
    ],
  },
  {
    titulo: "11. Cerrar tu cuenta",
    parrafos: [
      "Podés dejar de usar la plataforma cuando quieras. Los paseos, pagos y reseñas ya registrados se conservan como historial, incluso si la cuenta que los generó se desactiva después.",
    ],
  },
];

/** El texto solo. Se usa dentro del modal de registro y, si hace
    falta en otro lado, se importa de acá en vez de copiarlo. */
const TerminosCondiciones = () => (
  <div className="flex flex-col gap-5 px-5 py-5 sm:px-6">
    <p className="text-[12px] text-ink-mute">
      Última actualización: {new Intl.DateTimeFormat("es-CR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${TERMINOS_VERSION}T00:00:00`))}
    </p>
    {secciones.map((seccion) => (
      <section key={seccion.titulo}>
        <h3 className="text-[14px] font-semibold text-ink">{seccion.titulo}</h3>
        <div className="mt-1.5 flex flex-col gap-2">
          {seccion.parrafos.map((parrafo, i) => (
            <p key={i} className="text-[13px] leading-relaxed text-ink-soft">
              {parrafo}
            </p>
          ))}
        </div>
      </section>
    ))}
  </div>
);

export default TerminosCondiciones;
