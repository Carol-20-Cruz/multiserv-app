-- Defecto 7: búsquedas que ignoran tildes y mayúsculas.
-- "María Fernanda Ortiz" se guarda también como "maria fernanda ortiz" en
-- "nombreBusqueda"; el backend normaliza el texto buscado con la misma regla.
-- Sin índices sobre "nombreBusqueda": la búsqueda es "contiene" (LIKE '%x%'),
-- que no usa un índice normal. Si algún día hace falta, se agrega pg_trgm.

-- En Supabase las extensiones van en el esquema "extensions".
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;

-- Texto de búsqueda: sin tildes y en minúsculas ("María" -> "maria").
-- search_path vacío (Security Advisor de Supabase): todo va con esquema.
-- unaccent con DOS argumentos: con search_path vacío, la forma de uno no
-- encuentra el diccionario "unaccent"; aquí va con su esquema.
-- (COALESCE es sintaxis de SQL, no una función: no lleva esquema.)
CREATE OR REPLACE FUNCTION public.texto_busqueda(valor text)
RETURNS text
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT pg_catalog.lower(
    extensions.unaccent(
      'extensions.unaccent'::pg_catalog.regdictionary,
      COALESCE(valor, '')
    )
  )
$$;

-- AlterTable
ALTER TABLE "Cliente" ADD COLUMN     "nombreBusqueda" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Repuesto" ADD COLUMN     "nombreBusqueda" TEXT NOT NULL DEFAULT '';

-- Trigger: la base mantiene "nombreBusqueda" al crear y al cambiar el nombre.
-- El código nunca la escribe.
CREATE OR REPLACE FUNCTION public.llenar_nombre_busqueda()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW."nombreBusqueda" := public.texto_busqueda(NEW."nombre");
  RETURN NEW;
END
$$;

CREATE TRIGGER cliente_nombre_busqueda
  BEFORE INSERT OR UPDATE OF "nombre" ON "Cliente"
  FOR EACH ROW EXECUTE FUNCTION public.llenar_nombre_busqueda();

CREATE TRIGGER repuesto_nombre_busqueda
  BEFORE INSERT OR UPDATE OF "nombre" ON "Repuesto"
  FOR EACH ROW EXECUTE FUNCTION public.llenar_nombre_busqueda();

-- Llenar las filas que ya existen.
UPDATE "Cliente" SET "nombreBusqueda" = public.texto_busqueda("nombre");
UPDATE "Repuesto" SET "nombreBusqueda" = public.texto_busqueda("nombre");
