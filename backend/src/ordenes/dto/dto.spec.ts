import 'reflect-metadata'; // en la app lo carga NestJS
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { MENSAJES_VALOR } from '../reglas/cotizacion';
import { MENSAJES_PAGO } from '../reglas/saldo';
import { ActualizarOrdenDto } from './actualizar-orden.dto';
import { BuscarOrdenesDto } from './buscar-ordenes.dto';
import { CambiarEstadoDto } from './cambiar-estado.dto';
import { CrearOrdenDto, MENSAJE_DIRECCION_DOMICILIO } from './crear-orden.dto';
import { EntregarOrdenDto } from './entregar-orden.dto';
import { RegistrarCotizacionDto } from './registrar-cotizacion.dto';
import { RegistrarPagoDto } from './registrar-pago.dto';

// Simula lo que hace el ValidationPipe global de main.ts.
async function procesar<T extends object>(clase: new () => T, cuerpo: object) {
  const dto = plainToInstance(clase, cuerpo);
  const errores = await validate(dto, {
    whitelist: true,
    forbidNonWhitelisted: true,
    stopAtFirstError: true,
  });
  const mensajes = errores.flatMap((e) => Object.values(e.constraints ?? {}));
  return { dto, campos: errores.map((e) => e.property), mensajes };
}

const ordenValida = {
  clienteId: 10,
  equipoId: 20,
  fallaReportada: 'No enciende',
};

describe('DTO de órdenes', () => {
  // ---------- CrearOrdenDto (SWR-ORD-001) ----------

  it('orden válida: limpia los textos y deja vacíos como null', async () => {
    // Arrange
    const cuerpo = {
      ...ordenValida,
      fallaReportada: '  No   enciende ',
      accesorios: '   ',
    };

    // Act
    const { dto, campos } = await procesar(CrearOrdenDto, cuerpo);

    // Assert
    expect(campos).toEqual([]);
    expect(dto.fallaReportada).toBe('No enciende');
    expect(dto.accesorios).toBeNull();
  });

  // SWR-ORD-001: cliente, equipo y falla son obligatorios.
  it('orden vacía: rechaza los obligatorios con mensajes claros', async () => {
    // Act
    const { campos, mensajes } = await procesar(CrearOrdenDto, {
      fallaReportada: '   ',
    });

    // Assert
    expect(campos).toEqual(['clienteId', 'equipoId', 'fallaReportada']);
    expect(mensajes).toEqual([
      'El cliente es obligatorio',
      'El equipo es obligatorio',
      'La falla reportada es obligatoria',
    ]);
  });

  it('DOMICILIO sin dirección: la exige', async () => {
    // Act
    const { campos, mensajes } = await procesar(CrearOrdenDto, {
      ...ordenValida,
      modalidad: 'DOMICILIO',
      direccionVisita: '  ',
    });

    // Assert
    expect(campos).toEqual(['direccionVisita']);
    expect(mensajes).toEqual([MENSAJE_DIRECCION_DOMICILIO]);
  });

  it('TALLER sin dirección: válida', async () => {
    // Act
    const { campos } = await procesar(CrearOrdenDto, {
      ...ordenValida,
      modalidad: 'TALLER',
    });

    // Assert
    expect(campos).toEqual([]);
  });

  it('modalidad desconocida y fecha inválida: rechazadas', async () => {
    // Act
    const { campos, mensajes } = await procesar(CrearOrdenDto, {
      ...ordenValida,
      modalidad: 'VIRTUAL',
      fechaVisita: 'mañana',
    });

    // Assert
    expect(campos).toEqual(['modalidad', 'fechaVisita']);
    expect(mensajes).toEqual([
      'La modalidad debe ser TALLER o DOMICILIO',
      'La fecha de la visita no es válida',
    ]);
  });

  // El número y el estado los pone el servidor.
  it('número o estado enviados por el navegador: rechazados', async () => {
    // Act
    const { campos } = await procesar(CrearOrdenDto, {
      ...ordenValida,
      numero: 'MS-2026-00001',
      estado: 'ENTREGADO',
    });

    // Assert
    expect(campos).toEqual(['numero', 'estado']);
  });

  // ---------- ActualizarOrdenDto ----------

  it('editar: la falla, si llega, no puede quedar vacía', async () => {
    // Act
    const { campos } = await procesar(ActualizarOrdenDto, {
      fallaReportada: '',
    });

    // Assert
    expect(campos).toEqual(['fallaReportada']);
  });

  it('editar: no permite cambiar el cliente', async () => {
    // Act
    const { campos } = await procesar(ActualizarOrdenDto, { clienteId: 2 });

    // Assert
    expect(campos).toEqual(['clienteId']);
  });

  // ---------- RegistrarCotizacionDto (SWR-PAY-004 / AJ-09) ----------

  it('cotización válida', async () => {
    // Act
    const { dto, campos } = await procesar(RegistrarCotizacionDto, {
      diagnostico: ' Fuente   dañada ',
      valorCotizado: 180000,
    });

    // Assert
    expect(campos).toEqual([]);
    expect(dto.diagnostico).toBe('Fuente dañada');
  });

  it('cotización sin diagnóstico y con decimales: mensajes de la regla', async () => {
    // Act
    const { campos, mensajes } = await procesar(RegistrarCotizacionDto, {
      valorCotizado: 1500.5,
    });

    // Assert
    expect(campos).toEqual(['diagnostico', 'valorCotizado']);
    expect(mensajes).toEqual([
      'El diagnóstico es obligatorio',
      MENSAJES_VALOR.NO_ENTERO,
    ]);
  });

  it.each([
    [0, MENSAJES_VALOR.MENOR_A_UNO],
    [1_000_000_000, MENSAJES_VALOR.MAYOR_AL_TOPE],
    ['180000', MENSAJES_VALOR.NO_ENTERO],
  ])('valor cotizado %p: %s', async (valor, mensaje) => {
    // Act
    const { mensajes } = await procesar(RegistrarCotizacionDto, {
      diagnostico: 'Fuente dañada',
      valorCotizado: valor,
    });

    // Assert
    expect(mensajes).toEqual([mensaje]);
  });

  // ---------- CambiarEstadoDto y BuscarOrdenesDto ----------

  it('estado nuevo desconocido: rechazado', async () => {
    // Act
    const { mensajes } = await procesar(CambiarEstadoDto, {
      estadoNuevo: 'PERDIDO',
    });

    // Assert
    expect(mensajes).toEqual(['El estado nuevo no es válido']);
  });

  it('buscar: convierte la página y valida el estado', async () => {
    // Act
    const { dto, campos } = await procesar(BuscarOrdenesDto, {
      pagina: '2',
      estado: 'EN_REPARACION',
    });

    // Assert
    expect(campos).toEqual([]);
    expect(dto.pagina).toBe(2);
  });
  // ---------- RegistrarPagoDto (SWR-PAY-004) ----------

  it('pago válido: limpia la referencia y deja vacía como null', async () => {
    // Act
    const { dto, campos } = await procesar(RegistrarPagoDto, {
      valor: 125000,
      medio: 'TRANSFERENCIA',
      referencia: '  PRUEBA-TRF-001 ',
    });
    const sinReferencia = await procesar(RegistrarPagoDto, {
      valor: 1,
      medio: 'EFECTIVO',
      referencia: '   ',
    });

    // Assert
    expect(campos).toEqual([]);
    expect(dto.referencia).toBe('PRUEBA-TRF-001');
    expect(sinReferencia.campos).toEqual([]);
    expect(sinReferencia.dto.referencia).toBeNull();
  });

  it.each([
    [undefined, MENSAJES_PAGO.VACIO],
    ['125000', MENSAJES_PAGO.NO_ENTERO],
    [1000.5, MENSAJES_PAGO.NO_ENTERO],
    [0, MENSAJES_PAGO.MENOR_A_UNO],
  ])('valor del pago %p: %s', async (valor, mensaje) => {
    // Act
    const { mensajes } = await procesar(RegistrarPagoDto, {
      valor,
      medio: 'EFECTIVO',
    });

    // Assert
    expect(mensajes).toEqual([mensaje]);
  });

  it('pago con medio desconocido o tipo enviado por el navegador: rechazado', async () => {
    // Act
    const { campos, mensajes } = await procesar(RegistrarPagoDto, {
      valor: 1000,
      medio: 'CHEQUE',
      tipo: 'SALDO',
    });

    // Assert
    expect([...campos].sort()).toEqual(['medio', 'tipo']);
    expect(mensajes).toContain('El medio de pago no es válido');
  });

  // ---------- EntregarOrdenDto (SWR-ENT-003) ----------

  // Fronteras de "Recibido por": 3 y 100 caracteres, ya recortados.
  it.each([
    ['  Ana   Gómez ', 'Ana Gómez'],
    ['Ana', 'Ana'],
    ['a'.repeat(100), 'a'.repeat(100)],
  ])('recibido por %p: válido como %p', async (nombre, esperado) => {
    // Act
    const { dto, campos } = await procesar(EntregarOrdenDto, {
      recibidoPorNombre: nombre,
    });

    // Assert
    expect(campos).toEqual([]);
    expect(dto.recibidoPorNombre).toBe(esperado);
  });

  it.each(['Al', '   Al  ', 'a'.repeat(101)])(
    'recibido por %p: fuera de 3 a 100',
    async (nombre) => {
      // Act
      const { mensajes } = await procesar(EntregarOrdenDto, {
        recibidoPorNombre: nombre,
      });

      // Assert
      expect(mensajes).toEqual([
        'El nombre de quien recibe debe tener entre 3 y 100 caracteres',
      ]);
    },
  );

  it('entregar sin nombre o con documento: rechazado', async () => {
    // Act
    const sinNombre = await procesar(EntregarOrdenDto, {});
    const conDocumento = await procesar(EntregarOrdenDto, {
      recibidoPorNombre: 'Ana Gómez',
      documento: '1012345678',
    });

    // Assert
    expect(sinNombre.mensajes).toEqual([
      'El nombre de quien recibe es obligatorio',
    ]);
    expect(conDocumento.campos).toEqual(['documento']);
  });
});
