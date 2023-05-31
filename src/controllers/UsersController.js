const { hash, compare } = require("bcryptjs"); //criptografando minha senha. Antes o bcryptjs precisa ser instalado no terminal.

const AppError = require("../utils/AppError"); //importando o AppError para tratar os erros.

const sqliteConnection = require("../database/sqlite"); //Importando minha conexão com o BD.


class UsersController {
  async create(request, response) {
    const { name, email, password } = request.body;
    
    const database = await sqliteConnection(); //constante que guarda nosso banco de dados para uso nesse bloco.
    const checkUserExists = await database.get("SELECT * FROM users WHERE email = (?)", [email]);
    
    if(checkUserExists) {
      throw new AppError("Este e-mail já está em uso.");
    }

    const hashedPassword = await hash(password, 8); //criptografando as senhas antes de inserí-las.

    await database.run(
      "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
      [ name, email, hashedPassword ]
    )

    return response.status(201).json();
  }

  async update(request, response) {
    const { name, email, password, old_password } = request.body;
    const user_id = request.user.id; // colocando nessa constante o id do usuário que está na propriedade id da propriedade user da request

    const database = await sqliteConnection(); //iniciando minha conexão / meu banco de dados para fazer os comandos de run, get, post etc. 
    const user = await database.get("SELECT * FROM users WHERE id = (?)", [user_id]);
    //selecionando o usuário pelo id, esta variável const user pega o meu usuário com todos os seus campos.

    //Verificação se não houver usuário, joga erro na pilha e manda mensagem.
    if (!user) {
      throw new AppError("Usuário não encontrado.");
    }

    const userWithUpdatedEmail = await database.get("SELECT * FROM users WHERE email = (?)", [email]); //verifica se está trocando por email já existente

    //Verificação se encontrar na tabela o email dado em uso, e, se o id do email dado
    //for diferente do id do usuário(ou seja estiver em uso por outrem) soltar erro e mensagem.
    if (userWithUpdatedEmail && userWithUpdatedEmail.id !== user.id) {
      throw new AppError("Este email já está em uso.");
    }

    //Se não houver o erro acima, prossegue e atualiza os dados, nome e email do usuário.
    user.name = name ?? user.name; //se existir conteúdo dentro de name, então esse será utilizado, senão vai deixar o que estava na tabela user.
    user.email = email ?? user.email; //se existir conteúdo dentro de email, então esse será utilizado, senão vai deixar o que estava na tabela user.

    //verificação se o usuário digitou a senha nova mas não digitou a senha antiga vou jogar um erro na pilha e mandar mensagem.
    if(password && !old_password) {
      throw new AppError("Você precisa informar a senha antiga para definir a nova senha.");
    }

    //Se existir o password e o old_password: verificar se a old_password digitada é igual a que já está cadastrada
    if(password && old_password) {
      const checkOldPassword = await compare(old_password, user.password); //comparo a senha informada com a cadastrada com o compare pois a cadastrada está criptografada.
      if(!checkOldPassword) { //se checkOldPassword der falso, solto um erro e mensagem
        throw new AppError("A senha antiga não confere.");
      }

      //Prosseguindo e atualizando a senha, se não caiu no if() anterior
      user.password = await hash(password, 8); //usando hash pra criptografar o novo password.
    }

    //Executando as atualizações: uso await pego o database e executo o update
    await database.run(`
    UPDATE users SET
    name = ?,
    email = ?,
    password = ?,
    updated_at = DATETIME('now')
    WHERE id = ?`, 
    [user.name, user.email, user.password, user_id]
    );

    return response.json();
  }
}

module.exports = UsersController;