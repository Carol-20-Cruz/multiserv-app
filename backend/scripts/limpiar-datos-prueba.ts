/*
 * Limpieza de los datos de prueba de la base (Supabase).
 *
 * Uso, desde backend/ (se compila primero, igual que el seed: ts-node no
 * resuelve los imports .js del cliente generado de Prisma):
 *   npx --no-install tsc -p tsconfig.json --outDir .tmp/limpieza --incremental false --sourceMap false
 *   Simulación (por defecto, solo cuenta y no borra nada):
 *     node .tmp/limpieza/scripts/limpiar-datos-prueba.js
 *   Simulación + respaldo JSON en backend/.tmp/ (no borra):
 *     node .tmp/limpieza/scripts/limpiar-datos-prueba.js --respaldo
 *   Borrado real (respaldo + UNA sola transacción; si algo falla no se borra nada):
 *     node .tmp/limpieza/scripts/limpiar-datos-prueba.js --ejecutar
 *
 * Qué es un dato de prueba: un registro cuyo nombre (u otro texto propio)
 * EMPIEZA por uno de los prefijos CN-, API-, E2E-, SR- o EXP-, más todo lo que
 * depende de él (equipos, órdenes, pagos, historial, avances, cotizaciones y
 * movimientos de inventario).
 *
 * Nunca toca: Usuario, Configuracion, TipoEquipo, ConsecutivoOrden ni
 * Auditoria. Solo imprime conteos e ids: nunca teléfonos, correos,
 * direcciones ni nombres. Lee la conexión de backend/.env y no la imprime.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const PREFIJOS = ['CN-', 'API-', 'E2E-', 'SR-', 'EXP-'] as const;
// Playwright no pone "E2E-" al inicio: estos son los inicios exactos que usa
// (frontend/e2e/*.spec.ts): cliente, repuesto, marca del equipo, referencia
// del repuesto (E2E05-…), falla de la orden y quien recibe el equipo.
const PATRONES_PLAYWRIGHT = [
  'Cliente E2E-',
  'Repuesto E2E-',
  'MarcaE2E',
  'E2E0',
  'Prueba E2E-',
  'Recibe E2E-',
] as const;
const INICIOS = [...PREFIJOS, ...PATRONES_PLAYWRIGHT];
const EJECUTAR = process.argv.includes('--ejecutar');
// --respaldo: escribe el JSON con los registros que se borrarían, sin borrar.
// --ejecutar siempre escribe uno antes de abrir la transacción.
const RESPALDO = process.argv.includes('--respaldo') || EJECUTAR;

// Coincidencia exacta al inicio, hecha en JavaScript (no con LIKE: así un "%"
// o un "_" en un nombre no actúa como comodín, ver D15).
function prefijoDe(texto: string | null | undefined): string | null {
  if (!texto) return null;
  return INICIOS.find((p) => texto.startsWith(p)) ?? null;
}
const esPrueba = (...textos: (string | null | undefined)[]) =>
  textos.some((t) => prefijoDe(t) !== null);

// Marca de prueba en otra posición (p. ej. "Cliente E2E-01 …", "MarcaE2E01-…"):
// NO se borra; solo se cuenta para que el equipo decida.
const MARCA_EN_OTRA_POSICION = /(CN|API|E2E|SR|EXP)-?\d*-/;
const marcaFueraDelInicio = (...textos: (string | null | undefined)[]) =>
  !esPrueba(...textos) && textos.some((t) => !!t && MARCA_EN_OTRA_POSICION.test(t));

type Fila = { tabla: string; total: number; prueba: number; nota?: string };

async function main(): Promise<void> {
  process.loadEnvFile('.env');
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('Falta la variable de entorno DATABASE_URL');
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  try {
    // ---------- 1. Lectura (solo ids y textos necesarios, en memoria) ----------
    const clientes = await prisma.cliente.findMany({ select: { id: true, nombre: true } });
    const equipos = await prisma.equipo.findMany({
      select: { id: true, clienteId: true, marca: true, referencia: true, serial: true, descripcion: true },
    });
    const ordenes = await prisma.ordenServicio.findMany({
      select: {
        id: true,
        clienteId: true,
        equipoId: true,
        fallaReportada: true,
        recibidoPorNombre: true,
        ordenOriginalId: true,
      },
    });
    const repuestos = await prisma.repuesto.findMany({
      select: { id: true, nombre: true, referencia: true },
    });
    const cotizaciones = await prisma.cotizacion.findMany({ select: { id: true, ordenId: true } });
    const items = await prisma.cotizacionItem.findMany({
      select: { id: true, cotizacionId: true, repuestoId: true },
    });
    const movimientos = await prisma.movimientoInventario.findMany({
      select: { id: true, repuestoId: true, ordenId: true },
    });
    const pagos = await prisma.pago.findMany({ select: { id: true, ordenId: true } });
    const historial = await prisma.historialEstado.findMany({ select: { id: true, ordenId: true } });
    const avances = await prisma.avance.findMany({ select: { id: true, ordenId: true } });

    // ---------- 2. Qué es de prueba (y lo que depende de ello) ----------
    const cliP = new Set(clientes.filter((c) => esPrueba(c.nombre)).map((c) => c.id));
    const eqP = new Set(
      equipos
        .filter((e) => cliP.has(e.clienteId) || esPrueba(e.marca, e.referencia, e.serial, e.descripcion))
        .map((e) => e.id),
    );
    const ordP = new Set(
      ordenes
        .filter(
          (o) =>
            cliP.has(o.clienteId) || eqP.has(o.equipoId) || esPrueba(o.fallaReportada, o.recibidoPorNombre),
        )
        .map((o) => o.id),
    );
    const repP = new Set(repuestos.filter((r) => esPrueba(r.nombre, r.referencia)).map((r) => r.id));
    const cotP = new Set(cotizaciones.filter((c) => ordP.has(c.ordenId)).map((c) => c.id));
    const itemP = new Set(
      items.filter((i) => cotP.has(i.cotizacionId) || repP.has(i.repuestoId)).map((i) => i.id),
    );
    const movP = new Set(
      movimientos
        .filter((m) => repP.has(m.repuestoId) || (m.ordenId !== null && ordP.has(m.ordenId)))
        .map((m) => m.id),
    );
    const pagP = new Set(pagos.filter((p) => ordP.has(p.ordenId)).map((p) => p.id));
    const hisP = new Set(historial.filter((h) => ordP.has(h.ordenId)).map((h) => h.id));
    const avaP = new Set(avances.filter((a) => ordP.has(a.ordenId)).map((a) => a.id));

    // ---------- 3. Conflictos: borrar algo de prueba alteraría un dato real ----------
    const conflictos: string[] = [];
    const cuenta = (n: number, txt: string) => n > 0 && conflictos.push(`${n} ${txt}`);
    // equipo de prueba (por su marca/referencia) cuyo cliente NO es de prueba: se borra el equipo y se conserva el cliente
    const eqDeClienteReal = equipos.filter((e) => eqP.has(e.id) && !cliP.has(e.clienteId)).map((e) => e.id);
    // orden de prueba (por su falla) de un cliente/equipo que NO es de prueba
    const ordDeClienteReal = ordenes
      .filter((o) => ordP.has(o.id) && !cliP.has(o.clienteId) && !eqP.has(o.equipoId))
      .map((o) => o.id);
    cuenta(
      ordenes.filter((o) => !ordP.has(o.id) && o.ordenOriginalId !== null && ordP.has(o.ordenOriginalId)).length,
      'orden(es) real(es) con reclamo de garantía sobre una orden de prueba',
    );
    cuenta(
      items.filter((i) => itemP.has(i.id) && !cotP.has(i.cotizacionId)).length,
      'ítem(s) de cotización real que usan un repuesto de prueba',
    );
    cuenta(
      movimientos.filter((m) => movP.has(m.id) && !repP.has(m.repuestoId)).length,
      'movimiento(s) de un repuesto real ligados a una orden de prueba (cambiaría su historial de stock)',
    );

    // ---------- 4. Informe ----------
    const filas: Fila[] = [
      { tabla: 'Cliente', total: clientes.length, prueba: cliP.size },
      { tabla: 'Equipo', total: equipos.length, prueba: eqP.size },
      { tabla: 'OrdenServicio', total: ordenes.length, prueba: ordP.size },
      { tabla: 'HistorialEstado', total: historial.length, prueba: hisP.size },
      { tabla: 'Avance', total: avances.length, prueba: avaP.size },
      { tabla: 'Pago', total: pagos.length, prueba: pagP.size },
      { tabla: 'Cotizacion', total: cotizaciones.length, prueba: cotP.size },
      { tabla: 'CotizacionItem', total: items.length, prueba: itemP.size },
      { tabla: 'Repuesto', total: repuestos.length, prueba: repP.size },
      { tabla: 'MovimientoInventario', total: movimientos.length, prueba: movP.size },
      { tabla: 'Usuario', total: await prisma.usuario.count(), prueba: 0, nota: 'no se toca' },
      { tabla: 'Configuracion', total: await prisma.configuracion.count(), prueba: 0, nota: 'no se toca' },
      { tabla: 'TipoEquipo', total: await prisma.tipoEquipo.count(), prueba: 0, nota: 'no se toca' },
      { tabla: 'ConsecutivoOrden', total: await prisma.consecutivoOrden.count(), prueba: 0, nota: 'no se toca (los números no se reutilizan)' },
      { tabla: 'Auditoria', total: await prisma.auditoria.count(), prueba: 0, nota: 'no se toca (sin llave hacia los datos)' },
    ];

    console.log(`\nLimpieza de datos de prueba — modo ${EJECUTAR ? 'EJECUTAR (borra)' : 'SIMULACIÓN (no borra nada)'}`);
    console.log(`Prefijos (al inicio del texto): ${PREFIJOS.join(', ')}`);
    console.log(`Patrones de Playwright (al inicio del texto): ${PATRONES_PLAYWRIGHT.join(', ')}\n`);
    console.log('Tabla                   Total   De prueba   Quedarían');
    for (const f of filas) {
      console.log(
        `${f.tabla.padEnd(22)}${String(f.total).padStart(7)}${String(f.prueba).padStart(12)}${String(f.total - f.prueba).padStart(12)}${f.nota ? '   ' + f.nota : ''}`,
      );
    }

    const porPrefijo = (textos: (string | null)[][]) =>
      [
        ...PREFIJOS.map((p) => `${p} ${textos.filter((ts) => ts.map(prefijoDe).find(Boolean) === p).length}`),
        `Playwright ${textos.filter((ts) => (PATRONES_PLAYWRIGHT as readonly string[]).includes(ts.map(prefijoDe).find(Boolean) ?? '')).length}`,
      ].join(' · ');
    console.log('\nPor prefijo (registros que lo llevan ellos mismos):');
    console.log(`  Cliente:       ${porPrefijo(clientes.map((c) => [c.nombre]))}`);
    console.log(`  Equipo:        ${porPrefijo(equipos.map((e) => [e.marca, e.referencia, e.serial, e.descripcion]))}`);
    console.log(`  OrdenServicio: ${porPrefijo(ordenes.map((o) => [o.fallaReportada, o.recibidoPorNombre]))}`);
    console.log(`  Repuesto:      ${porPrefijo(repuestos.map((r) => [r.nombre, r.referencia]))}`);
    console.log(`\nEquipos de prueba de clientes reales (se borra el equipo, el cliente queda): ${eqDeClienteReal.length ? 'ids ' + eqDeClienteReal.join(', ') : 'ninguno'}`);
    console.log(`Órdenes de prueba de clientes y equipos reales: ${ordDeClienteReal.length ? 'ids ' + ordDeClienteReal.join(', ') : 'ninguna'}`);

    // Diagnóstico aparte: marca de prueba que NO está al inicio. No se borra.
    const fuera = {
      Cliente: clientes.filter((c) => !cliP.has(c.id) && marcaFueraDelInicio(c.nombre)).map((c) => c.id),
      Equipo: equipos.filter((e) => !eqP.has(e.id) && marcaFueraDelInicio(e.marca, e.referencia, e.serial, e.descripcion)).map((e) => e.id),
      OrdenServicio: ordenes
        .filter((o) => !ordP.has(o.id) && marcaFueraDelInicio(o.fallaReportada, o.recibidoPorNombre))
        .map((o) => o.id),
      Repuesto: repuestos.filter((r) => !repP.has(r.id) && marcaFueraDelInicio(r.nombre, r.referencia)).map((r) => r.id),
    };
    const textosDe: Record<keyof typeof fuera, Map<number, (string | null)[]>> = {
      Cliente: new Map(clientes.map((c) => [c.id, [c.nombre]])),
      Equipo: new Map(equipos.map((e) => [e.id, [e.marca, e.referencia, e.serial, e.descripcion]])),
      OrdenServicio: new Map(ordenes.map((o) => [o.id, [o.fallaReportada, o.recibidoPorNombre]])),
      Repuesto: new Map(repuestos.map((r) => [r.id, [r.nombre, r.referencia]])),
    };
    const marcaDe = (ts: (string | null)[]) =>
      ts.map((t) => (t ? MARCA_EN_OTRA_POSICION.exec(t)?.[1] : undefined)).find(Boolean) ?? '?';
    console.log('\nNO incluidos (la marca de prueba no está al inicio; p. ej. "Cliente E2E-01 …"):');
    for (const [tabla, ids] of Object.entries(fuera) as [keyof typeof fuera, number[]][]) {
      const marcas = new Map<string, number>();
      for (const id of ids) {
        const m = marcaDe(textosDe[tabla].get(id) ?? []);
        marcas.set(m, (marcas.get(m) ?? 0) + 1);
      }
      const detalle = [...marcas].map(([m, n]) => `${m} ${n}`).join(' · ');
      console.log(`  ${tabla.padEnd(14)} ${String(ids.length).padStart(4)}${ids.length ? `   (${detalle})   ids ${ids.join(', ')}` : ''}`);
    }

    // Lo que quedaría sin ninguna marca de prueba (ni al inicio ni en otra
    // posición, ni colgado de una orden marcada). Solo conteos.
    const ordFuera = new Set(fuera.OrdenServicio);
    const sinMarca = (filas: { id: number; ordenId?: number | null }[], borrar: Set<number>, marcadas: number[] = []) =>
      filas.filter((f) => !borrar.has(f.id) && !marcadas.includes(f.id) && !(f.ordenId != null && ordFuera.has(f.ordenId))).length;
    console.log('\nQuedarían sin ninguna marca de prueba (solo conteos):');
    for (const [tabla, n] of [
      ['Cliente', sinMarca(clientes, cliP, fuera.Cliente)],
      ['Equipo', sinMarca(equipos, eqP, fuera.Equipo)],
      ['OrdenServicio', sinMarca(ordenes, ordP, fuera.OrdenServicio)],
      ['HistorialEstado', sinMarca(historial, hisP)],
      ['Avance', sinMarca(avances, avaP)],
      ['Pago', sinMarca(pagos, pagP)],
      ['Cotizacion', sinMarca(cotizaciones, cotP)],
      ['CotizacionItem', sinMarca(items, itemP)],
      ['Repuesto', sinMarca(repuestos, repP, fuera.Repuesto)],
      ['MovimientoInventario', sinMarca(movimientos, movP)],
    ] as const) {
      console.log(`  ${tabla.padEnd(22)}${String(n).padStart(5)}`);
    }

    console.log(`\nConflictos: ${conflictos.length ? conflictos.join('; ') : 'ninguno'}`);

    if (conflictos.length && EJECUTAR) {
      throw new Error('Hay conflictos: no se borra nada. Revíselos antes de ejecutar.');
    }

    // ---------- 5. Respaldo: registros completos que se borrarían ----------
    // Va a backend/.tmp/ (ignorada por git) porque contiene los datos tal cual.
    // En la consola solo se imprime la ruta y los conteos.
    const ids = (s: Set<number>) => ({ id: { in: [...s] } });
    if (RESPALDO) {
      const respaldo = {
        creado: new Date().toISOString(),
        criterio: { prefijos: PREFIJOS, patronesPlaywright: PATRONES_PLAYWRIGHT },
        tablas: {
          Cliente: await prisma.cliente.findMany({ where: ids(cliP) }),
          Equipo: await prisma.equipo.findMany({ where: ids(eqP) }),
          OrdenServicio: await prisma.ordenServicio.findMany({ where: ids(ordP) }),
          HistorialEstado: await prisma.historialEstado.findMany({ where: ids(hisP) }),
          Avance: await prisma.avance.findMany({ where: ids(avaP) }),
          Pago: await prisma.pago.findMany({ where: ids(pagP) }),
          Cotizacion: await prisma.cotizacion.findMany({ where: ids(cotP) }),
          CotizacionItem: await prisma.cotizacionItem.findMany({ where: ids(itemP) }),
          Repuesto: await prisma.repuesto.findMany({ where: ids(repP) }),
          MovimientoInventario: await prisma.movimientoInventario.findMany({ where: ids(movP) }),
        },
      };
      const carpeta = join(process.cwd(), '.tmp');
      mkdirSync(carpeta, { recursive: true });
      const sello = respaldo.creado.replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
      const ruta = join(carpeta, `respaldo-limpieza-${sello}.json`);
      writeFileSync(ruta, JSON.stringify(respaldo, null, 2), 'utf-8');
      const conteo = Object.entries(respaldo.tablas).map(([t, filas]) => `${t} ${filas.length}`).join(' · ');
      console.log(`\nRespaldo escrito: backend/.tmp/respaldo-limpieza-${sello}.json`);
      console.log(`  ${conteo}`);
    }

    if (!EJECUTAR) {
      console.log('\nSimulación: no se borró nada. Para borrar: --ejecutar');
      return;
    }

    // ---------- 6. Borrado: UNA transacción, de las hojas hacia la raíz ----------
    await prisma.$transaction(
      async (tx) => {
        const esperado = (n: number, s: Set<number>, tabla: string) => {
          if (n !== s.size) throw new Error(`${tabla}: se esperaban ${s.size} y se borraron ${n}; se revierte todo`);
        };
        esperado((await tx.cotizacionItem.deleteMany({ where: ids(itemP) })).count, itemP, 'CotizacionItem');
        esperado((await tx.cotizacion.deleteMany({ where: ids(cotP) })).count, cotP, 'Cotizacion');
        esperado((await tx.pago.deleteMany({ where: ids(pagP) })).count, pagP, 'Pago');
        esperado((await tx.avance.deleteMany({ where: ids(avaP) })).count, avaP, 'Avance');
        esperado((await tx.historialEstado.deleteMany({ where: ids(hisP) })).count, hisP, 'HistorialEstado');
        esperado((await tx.movimientoInventario.deleteMany({ where: ids(movP) })).count, movP, 'MovimientoInventario');
        // reclamos de garantía entre órdenes de prueba: se suelta el enlace antes de borrar
        await tx.ordenServicio.updateMany({ where: ids(ordP), data: { ordenOriginalId: null } });
        esperado((await tx.ordenServicio.deleteMany({ where: ids(ordP) })).count, ordP, 'OrdenServicio');
        esperado((await tx.equipo.deleteMany({ where: ids(eqP) })).count, eqP, 'Equipo');
        esperado((await tx.cliente.deleteMany({ where: ids(cliP) })).count, cliP, 'Cliente');
        esperado((await tx.repuesto.deleteMany({ where: ids(repP) })).count, repP, 'Repuesto');
      },
      { timeout: 120_000 },
    );
    console.log('\nBorrado confirmado (una sola transacción).');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  // Solo el mensaje: nunca la cadena de conexión ni datos de la consulta.
  console.error(`Error: ${error instanceof Error ? error.message.split('\n')[0] : String(error)}`);
  process.exit(1);
});
