import 'reflect-metadata'; // en la app lo carga NestJS
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ActualizarClienteDto } from './actualizar-cliente.dto';
import { CrearClienteDto } from './crear-cliente.dto';
import { CrearEquipoDto } from './crear-equipo.dto';
import { MENSAJE_ALTERNO_IGUAL } from '../reglas/telefono';

// Simula lo que hace el ValidationPipe global: transformar y validar.
async function procesar<T extends object>(clase: new () => T, cuerpo: object) {
  const dto = plainToInstance(clase, cuerpo);
  const errores = await validate(dto, {
    whitelist: true,
    stopAtFirstError: true, // igual que el ValidationPipe de main.ts
  });
  const mensajes = errores.flatMap((e) => Object.values(e.constraints ?? {}));
  return { dto, campos: errores.map((e) => e.property), mensajes };
}

const clienteValido = {
  nombre: 'Ana Gómez',
  telefono: '3001234567',
  autorizaDatos: true,
};

describe('DTO de clientes y equipos', () => {
  // SWR-CLI-001 + SWR-CLI-003 + AJ-08: limpia el nombre y normaliza el teléfono.
  it('cliente válido: normaliza teléfono y nombre; alterno vacío queda null', async () => {
    // Arrange
    const cuerpo = {
      ...clienteValido,
      nombre: '  Ana   Gómez ',
      telefono: '300 123-4567',
      telefonoAlterno: '  ',
      correo: '',
    };

    // Act
    const { dto, campos } = await procesar(CrearClienteDto, cuerpo);

    // Assert
    expect(campos).toEqual([]);
    expect(dto.nombre).toBe('Ana Gómez');
    expect(dto.telefono).toBe('3001234567');
    expect(dto.telefonoAlterno).toBeNull();
    expect(dto.correo).toBeNull();
  });

  // Defecto 6: al crear, el alterno igual al principal (aunque venga con
  // otro formato) se rechaza con su mensaje.
  it('crear con alterno igual al principal: rechazado', async () => {
    // Arrange
    const cuerpo = {
      ...clienteValido,
      telefono: '300 123 4567',
      telefonoAlterno: '300-123-4567',
    };

    // Act
    const { campos, mensajes } = await procesar(CrearClienteDto, cuerpo);

    // Assert
    expect(campos).toEqual(['telefonoAlterno']);
    expect(mensajes).toEqual([MENSAJE_ALTERNO_IGUAL]);
  });

  // Defecto 6: un alterno distinto sí se acepta.
  it('crear con alterno distinto: válido', async () => {
    // Arrange
    const cuerpo = { ...clienteValido, telefonoAlterno: '3109998877' };

    // Act
    const { dto, campos } = await procesar(CrearClienteDto, cuerpo);

    // Assert
    expect(campos).toEqual([]);
    expect(dto.telefonoAlterno).toBe('3109998877');
  });

  // Defecto 6: al editar, si llegan los dos iguales, el DTO ya lo rechaza.
  it('editar enviando los dos teléfonos iguales: rechazado', async () => {
    // Arrange
    const cuerpo = { telefono: '3001234567', telefonoAlterno: '3001234567' };

    // Act
    const { mensajes } = await procesar(ActualizarClienteDto, cuerpo);

    // Assert
    expect(mensajes).toEqual([MENSAJE_ALTERNO_IGUAL]);
  });

  // SWR-CLI-001: nombre y teléfono obligatorios.
  it('sin nombre ni teléfono: rechaza ambos con mensajes claros', async () => {
    // Arrange
    const cuerpo = { nombre: '   ', autorizaDatos: true };

    // Act
    const { campos, mensajes } = await procesar(CrearClienteDto, cuerpo);

    // Assert
    expect(campos).toEqual(['nombre', 'telefono']);
    expect(mensajes).toContain('El nombre es obligatorio');
    expect(mensajes).toContain('El teléfono es obligatorio');
  });

  // SWR-CLI-003: el mensaje de error viene de la regla pura del teléfono.
  it('teléfono con letras: mensaje de la regla del teléfono', async () => {
    // Arrange
    const cuerpo = { ...clienteValido, telefono: '300abc4567' };

    // Act
    const { campos, mensajes } = await procesar(CrearClienteDto, cuerpo);

    // Assert
    expect(campos).toEqual(['telefono']);
    expect(mensajes).toEqual(['El teléfono solo puede tener números']);
  });

  // Ley 1581: sin autorización no se registra.
  it('autorizaDatos false: rechaza el registro', async () => {
    // Arrange
    const cuerpo = { ...clienteValido, autorizaDatos: false };

    // Act
    const { campos, mensajes } = await procesar(CrearClienteDto, cuerpo);

    // Assert
    expect(campos).toEqual(['autorizaDatos']);
    expect(mensajes[0]).toMatch(/Ley 1581/);
  });

  // Editar datos de contacto: lo que no llega no se valida, pero null en
  // nombre o teléfono se rechaza (son obligatorios en la base de datos).
  it('editar: campos omitidos son válidos; null en nombre/teléfono no', async () => {
    // Arrange
    const soloBarrio = { barrio: 'Centro' };
    const conNulos = { nombre: null, telefono: null };

    // Act
    const r1 = await procesar(ActualizarClienteDto, soloBarrio);
    const r2 = await procesar(ActualizarClienteDto, conNulos);

    // Assert
    expect(r1.campos).toEqual([]);
    expect(r2.campos).toEqual(['nombre', 'telefono']);
  });

  // SWR-EQP-003: tipo de equipo y marca obligatorios; referencia y serial no.
  it('equipo: exige tipo y marca; referencia y serial opcionales', async () => {
    // Arrange
    const vacio = { marca: ' ' };
    const valido = { tipoEquipoId: '2', marca: 'LG', referencia: '' };

    // Act
    const r1 = await procesar(CrearEquipoDto, vacio);
    const r2 = await procesar(CrearEquipoDto, valido);

    // Assert
    expect(r1.campos).toEqual(['tipoEquipoId', 'marca']);
    expect(r1.mensajes).toEqual([
      'El tipo de equipo es obligatorio',
      'La marca es obligatoria',
    ]);
    expect(r2.campos).toEqual([]);
    expect(r2.dto.tipoEquipoId).toBe(2);
    expect(r2.dto.referencia).toBeNull();
  });

  // SWR-EQP-003: la marca se guarda con la primera letra en mayúscula, sin
  // cambiar el resto (siglas como LG quedan igual).
  it('equipo: la marca se guarda con la primera letra en mayúscula', async () => {
    // Arrange
    const minuscula = { tipoEquipoId: 1, marca: '  samsung ' };
    const siglas = { tipoEquipoId: 1, marca: 'LG' };
    const tilde = { tipoEquipoId: 1, marca: 'électrolux' };

    // Act
    const r1 = await procesar(CrearEquipoDto, minuscula);
    const r2 = await procesar(CrearEquipoDto, siglas);
    const r3 = await procesar(CrearEquipoDto, tilde);

    // Assert
    expect(r1.dto.marca).toBe('Samsung');
    expect(r2.dto.marca).toBe('LG');
    expect(r3.dto.marca).toBe('Électrolux');
  });
});
