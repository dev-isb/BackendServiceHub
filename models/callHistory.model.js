const { Model } = require("objection");
class model extends Model {
    static get tableName() {
        return "call_history";
    }

    // static get relationMappings() {

    //     const actionsModel = require('./actions.model');

    //     return {
    //         action: {
    //             relation: Model.BelongsToOneRelation,
    //             modelClass: actionsModel,
    //             join: {
    //                 from: 'actions.id',
    //                 to: 'call_history.action_id'
    //             }
    //         },
    //     }
    // }
}
module.exports = model;
