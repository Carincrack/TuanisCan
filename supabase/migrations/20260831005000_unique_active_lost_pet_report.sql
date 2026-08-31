select set_config('app.cambio_estado_mascota_perdida', 'true', true);

with duplicados as (
    select
        id_mascota_perdida,
        row_number() over (
            partition by id_mascota
            order by fecha_reporte desc, id_mascota_perdida desc
        ) as posicion
    from public.mascotas_perdidas
    where estado = 'perdida'
      and id_mascota is not null
)
update public.mascotas_perdidas mp
set estado = 'encontrada'
from duplicados d
where mp.id_mascota_perdida = d.id_mascota_perdida
  and d.posicion > 1;

select set_config('app.cambio_estado_mascota_perdida', 'false', true);

create unique index if not exists mascotas_perdidas_unica_activa_por_mascota_idx
on public.mascotas_perdidas (id_mascota)
where estado = 'perdida' and id_mascota is not null;
