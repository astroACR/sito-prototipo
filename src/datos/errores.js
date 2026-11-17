/* Tipos de falla al hablar con el servidor. La cola de envío decide qué hacer según el tipo. */

/** No hay conexión o el servidor no respondió. Se reintenta más tarde. */
export class ErrorRed extends Error {
  constructor(mensaje = 'Sin conexión con el servidor.') {
    super(mensaje)
    this.name = 'ErrorRed'
  }
}

/** La sesión venció. Hay que volver a ingresar; los registros guardados no se pierden. */
export class ErrorSesion extends Error {
  constructor(mensaje = 'La sesión se cerró.') {
    super(mensaje)
    this.name = 'ErrorSesion'
  }
}

/** El servidor recibió el registro y lo rechazó. Reintentar igual no sirve. */
export class ErrorRechazo extends Error {
  constructor(mensaje = 'El servidor no aceptó este registro.', codigo = 'rechazo') {
    super(mensaje)
    this.name = 'ErrorRechazo'
    this.codigo = codigo
  }
}

/** RUT o clave incorrectos. */
export class ErrorCredenciales extends Error {
  constructor(mensaje = 'El RUT o la clave no coinciden.') {
    super(mensaje)
    this.name = 'ErrorCredenciales'
  }
}
