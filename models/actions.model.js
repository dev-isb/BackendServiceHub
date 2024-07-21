const { Model } = require("objection");
class model extends Model {
    static get tableName() {
        return "actions";
    }
}
module.exports = model;
