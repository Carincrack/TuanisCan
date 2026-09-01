do $$
begin
    if exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'mascotas_perdidas'
          and column_name = 'id_reporte'
    )
    and not exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'mascotas_perdidas'
          and column_name = 'id_mascota_perdida'
    ) then
        alter table public.mascotas_perdidas
        rename column id_reporte to id_mascota_perdida;
    end if;
end;
$$;
