import 'reflect-metadata'; // en la app lo carga NestJS
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ActualizarRepuestoDto } from './actualizar-repuesto.dto';
import { BuscarRepuestosDto } from './buscar-repuestos.dto';
import { CrearRepuestoDto } from './crear-repuesto.dto';
import { RegistrarEntradaDto } from './registrar-entrada.dto';

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

const repuestoValido = {
  nombre: 'Tarjeta principal',
  referencia: 'BN44-00932A',
  marcaCompatible: 'Samsung',
  tipoEquipoId: 2,
  precioVenta: 180000,
  cantidadInicial: 5,
};

describe('DTO de inventario', () => {
  // SWR-INV-001: limpia los textos; referencia en mayúsculas y marca con
  // la primera letra en mayúscula; el mínimo es opcional (por defecto 1 en la base).
  it('repuesto válido: normaliza referencia, marca y nombre', async () => {
    // Arrange
    const cuerpo = {
      ...repuestoValido,
      nombre: '  Tarjeta   principal ',
      referencia: ' bn44-00932a ',
      marcaCompatible: 'samsung',
    };

    // Act
    const { dto, campos } = await procesar(CrearRepuestoDto, cuerpo);

    // Assert
    expect(campos).toEqual([]);
    expect(dto.nombre).toBe('Tarjeta principal');
    expect(dto.referencia).toBe('BN44-00932A');
    expect(dto.marcaCompatible).toBe('Samsung');
    expect(dto.cantidadMinima).toBeUndefined();
  });

  // SWR-INV-001 + AJ-05: campos obligatorios con mensajes en español.
  it('repuesto vacío: rechaza los obligatorios con mensajes claros', async () => {
    // Arrange
    const cuerpo = { nombre: '   ' };

    // Act
    const { campos, mensajes } = await procesar(CrearRepuestoDto, cuerpo);

    // Assert
    expect(campos).toEqual([
      'nombre',
      'referencia',
      'marcaCompatible',
      'tipoEquipoId',
      'precioVenta',
      'cantidadInicial',
    ]);
    expect(mensajes).toContain('El nombre es obligatorio');
    expect(mensajes).toContain('La referencia es obligatoria');
    expect(mensajes).toContain('El tipo de equipo es obligatorio');
  });

  // SWR-CON-003: pesos sin decimales; cantidades enteras no negativas.
  it('precio decimal y mínimo negativo: rechazados', async () => {
    // Arrange
    const cuerpo = {
      ...repuestoValido,
      precioVenta: 1500.5,
      cantidadMinima: -1,
    };

    // Act
    const { campos, mensajes } = await procesar(CrearRepuestoDto, cuerpo);

    // Assert
    expect(campos).toEqual(['precioVenta', 'cantidadMinima']);
    expect(mensajes).toEqual([
      'El precio de venta debe ser un valor entero en pesos',
      'La cantidad mínima no puede ser negativa',
    ]);
  });

  // SWR-INV-009: mínimo 0 está permitido.
  it('mínimo 0: válido', async () => {
    // Act
    const { campos } = await procesar(CrearRepuestoDto, {
      ...repuestoValido,
      cantidadMinima: 0,
    });

    // Assert
    expect(campos).toEqual([]);
  });

  // La cantidad NO se edita directo: el PATCH la rechaza.
  it('editar enviando cantidad: rechazado', async () => {
    // Act
    const { campos } = await procesar(ActualizarRepuestoDto, { cantidad: 50 });

    // Assert
    expect(campos).toEqual(['cantidad']);
  });

  // La entrada usa la regla pura validarCantidadEntrada y su mensaje.
  it.each([
    [0, 'La cantidad debe ser 1 o mayor'],
    ['5', 'La cantidad debe ser un número entero'],
    [undefined, 'La cantidad es obligatoria'],
  ])('entrada con cantidad %p: "%s"', async (cantidad, mensaje) => {
    // Act
    const { campos, mensajes } = await procesar(RegistrarEntradaDto, {
      cantidad,
    });

    // Assert
    expect(campos).toEqual(['cantidad']);
    expect(mensajes).toEqual([mensaje]);
  });

  it('entrada válida: proveedor vacío queda null', async () => {
    // Act
    const { dto, campos } = await procesar(RegistrarEntradaDto, {
      cantidad: 3,
      proveedor: '  ',
    });

    // Assert
    expect(campos).toEqual([]);
    expect(dto.proveedor).toBeNull();
  });

  // /inventario?soloStockBajo=1 (enlace de la tarjeta del Inicio).
  it('buscar con soloStockBajo=1: se convierte en true', async () => {
    // Act
    const { dto, campos } = await procesar(BuscarRepuestosDto, {
      soloStockBajo: '1',
      tipoEquipoId: '2',
    });

    // Assert
    expect(campos).toEqual([]);
    expect(dto.soloStockBajo).toBe(true);
    expect(dto.tipoEquipoId).toBe(2);
  });

  // Defecto 7: nombreBusqueda lo llena la base; si el navegador lo envía,
  // se rechaza (forbidNonWhitelisted, igual que main.ts).
  it.each([
    ['crear', CrearRepuestoDto, repuestoValido],
    ['editar', ActualizarRepuestoDto, { nombre: 'Tarjeta principal' }],
  ] as const)(
    '%s con nombreBusqueda: rechazado',
    async (_caso, clase, cuerpo) => {
      // Act
      const { campos } = await procesar(clase as new () => object, {
        ...cuerpo,
        nombreBusqueda: 'otra cosa',
      });

      // Assert
      expect(campos).toEqual(['nombreBusqueda']);
    },
  );
});
