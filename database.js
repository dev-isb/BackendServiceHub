const { Model, knexSnakeCaseMappers } = require('objection');

const db = require('knex')({
    client: 'mysql',
    connection: {
        host: '192.168.0.105',
        user: 'kumail',
        password: 'Kumail@123',
        database: 'voip_server',
    },
    pool: {
        min: 0,
        max: 10
    },
    ...knexSnakeCaseMappers()
});


Model.knex(db);

module.exports = db;

