-- Las notificaciones de "paseo finalizado, ya puedes dejar tu reseña"
-- que ya existían quedaron con tipo 'paseo' (el bug corregido en la
-- migración anterior). Se corrigen para que al tocarlas lleven a
-- /resenas en vez de /paseos.
update public.notificaciones
set tipo = 'resena'
where tipo = 'paseo'
  and mensaje ilike '%resena%';
