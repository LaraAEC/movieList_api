//A criação dessas tabelas já se iniciou desde as Migrates na pasta knex. Aqui estou mais é inserindo os dados.
const knex = require("../database/knex"); //importando o knex, o seu index.js

class NotesController{
  async create(request, response) { //método para um user criar uma Nota, inserindo dados. Passo o request e o response vou semopre estar trabalhando com eles, este é o objetivo.
    const { title, grade, description, tags } = request.body; //primeiro vou desestruturar esse valores que estão sendo passados pelo body em formato json.
    const user_id = request.user.id;
    
    //Recebendo meus campos title, description e user_id e inserindo em minha tabela Notes. Coloco todos eles, em formato de um objeto, em uma constante.
    const [note_id] = await knex("notes").insert({ //quando eu cadastro (aqui estou criando a nota com o knex), quando executo esse insert, ele me devolve o ID da nota que foi gerada, pois usei o autoincrement, e estou guardando esse id da nota nessa constante para usá-lo nas duas tabelas a ela vinculada.
      title,
      grade,
      description,
      user_id
    });

    //O conteúdo de uma nota é feito pelo seu ID, pelo title, pela description, pelas tags e pelos links.
    //Para cadastrar tags, cujos valores vem no corpo da nota no request, preciso do id da nota, por isso antes capturamos esse valor.

    //Agora vou passar as tags que quero inserir na tabela Tags, em forma de objeto. Coloco esse objeto dentro dessa constante inserir tags.
    const tagsInsert = tags.map(name => { //percorro a lista de tags, recebida via request, e, para cada item (tag) executo a seguinte função.
      return { //estou criando um objeto novo aqui que me retorna  os itens abaixo.
        note_id, //campo com o id da tabela Notes a qual essa tabela tags está vinculada.
        name,
        user_id //quando criei a table users tbm guardei seu id pois existem tabelas que são vinculadas a ela e iriam precisar ter esse id_user como chave estrangeira.
      }
    });

    await knex("tags").insert(tagsInsert); //Passando para minha tabela Tags, as tags inseridas; e será inserida essa informação.

    return response.json(); //enviando tudo isso como resposta json. Não passo nada por aqui, apenas fiz as ações de insert em meu BD.

  }

  async show (request, response) { //método para visualizar uma Nota através de seu ID, com suas tags e links vinculadas. Aqui passo tbm o request e o response
    const {id} = request.params; //recupero o id da Nota que desejo mostrar, desestruturando.

    const note = await knex("notes").where({ id }).first(); //usando o knex, pego a table Notes e seleciono a nota buscando com o filtro where passando seu id, e pedindo apenas uma, first(), pois buscaremos uma por vez.
    const tags = await knex("tags").where({ note_id: id }).orderBy("name"); //Selecionando as tags vinculadas a essa nota (para visualização). Em table tags pegar a tag cujo seu campo note_id seja igual ao id dessa nota que foi pedida para ser vista via parâmetro. E, com o orderBy("name") coloco em ordem alfabética.

    //respondendo enviando via json a note, e seus tags.
    return response.json({ //monto um objeto despejando todos os detalhes da nota, passando as tags 
      ...note,
      tags
    }); 
   
  }

  async delete (request, response) { //método para deletar uma nota específica através do id da nota passado para o backend.
    const { id } = request.params; //desestruturando para pegar o id da nota qu se deseja deletar, que está sendo passado via parâmetro na rota.

    await knex ("notes").where({ id }).delete(); //através do knex indo na tabela notes e deletando a nota de id especificado. Deverá haver cascade com tags e links.

    return response.json(); //retorno da resposta, retornando o que fizemos neste método. Não passo nada por aqui, apenas fiz as ações de delete em meu BD.
  }

  async index(request, response) {
    const { title, tags } = request.query;

    const user_id = request.user.id;

    let notes;

    if (tags) {
      const filterTags = tags.split(',').map(tag => tag.trim());
      //converter de um texto (vem do SEND em texto simples) para um vetor/array/lista utilizando como delimitador a vírgula. Fiz um .map pois me interessa somente a tag. E apliquei o método .trim() que retira espaços em branco do início e do fim de uma string.
      //console.log(filterTags); apenas para checagem.

      notes = await knex("tags") //knex pega a tabela tags e procura no campo "name" se tem algum com um dos vetores desse vetor filterTags, se tiver mostra.
        .select([ //array com o campos que quero selecionar de ambas as tabelas (Tags e Notes).
          "notes.id",
          "notes.title",
          "notes.user_id",
          "notes.grade",
          "notes.description",
        ])
        .where("notes.user_id", user_id) //filtra baseado no user_id, filtra pelas tags desse usuário.
        .whereLike("notes.title", `%${title}%`) // filtra pelo título.
        .whereIn("name", filterTags) //pego o nome da tag e passo o vetor que eu quero que ele compare se a tag de fato existe ali ou não.
        .innerJoin("notes", "notes.id", "tags.note_id") //usando o innerJoin() para conectar a tabela Notes com a Tags. Passo o nome da tabela que desejo conectar, quais campos vou usar para conectá-las, dentro de notas é o ID e dentro de Tags é o notes_id.
        .groupBy("notes.id") //evitando duplicação
        .orderBy("notes.title") //ordenando alfabeticamente pelo título da Nota.

    } else { //senão faremos uma consulta normal baseada no usuário somente, ou nele e no title da Nota.
      notes = await knex("notes")
        .where({ user_id }) //filtrando essas informações pelo usuário, pelo,user_id que passei por query. Para achar todas as Notas desse usuário.
        .whereLike("title", `%${title}%`) //filtrando essas informações pelo title que passei por query. Para achar uma Nota específica desse usuário.
        .orderBy("title"); //colocando em ordem alfabética.
    }

    //No final quero vincular as tags à Nota exibida. Quero mostrar além das coisas da Nota que coloquei no SELECT, quero acrescentar a essa lista, pegando Nota por Notas, item por item da lista através do .map() e acrescentar a cada um mais as suas tags que estão vinculados.
    const userTags = await knex("tags").where({ user_id }); //fazendo um filtro em todas as tags iguais ao id do usuário. Ou seja, vou na tabela tags e procuro as tags daquele usuário de id passado pelo SEND.
    const notesWithTags = notes.map(note => { // Essa const terá minhas notas com minhas tags, percorro todas as minhas notas e para cada item/note...
      const noteTags = userTags.filter(tag => tag.note_id === note.id); //...vou filtrar as tags correspondentes aquela Nota.
    
      return {
        ...note,
        tags: noteTags,
      }
    });

    return response.json(notesWithTags);
  }
}

module.exports = NotesController;

/*
Operador whereLike para encontrar título sem precisar o nome preciso do título, mas apenas uma palavra que ele contennha
Obs.O LIKE (no where) ajuda a buscar por valores que contenham uma palavra, por exemplo, valores similares,
mas não idênticos, algo que seja contenha algo. Eu digo qual o campo eu quero fazer essa consulta e daí eu uso uma
literal(template, vou misturar símbolo% e variável), pois eu vou colocar a variável title, e vou envolver isso em
percentual, antes e depois dela, esse % é para mandar verificar tanto antes quanto depois, em qualquer parte da
palavra se existir o que eu estou procurando traga para mim.
*/

//Após fazer esta funcionalidade, de uma a uma, não esquecer de criar a rota para tornar esta funcionalidade visível. Isso vale sempre.
