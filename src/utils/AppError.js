class AppError {
  message;
  statusCode;

  constructor(message, statusCode = 400) {
    this.message = message; //minha variável do bloco vai receber o valor da message que está sendo passada.
    this.statusCode = statusCode; //meu statuscode do bloco vai receber o statuscode passado,e, se não for passado usa o já infomado 400.
  }
}

module.exports = AppError;