const mongodb = require('mongodb');

module.exports = async function (context, connection_string, dbname) {
    let dbclient = null;
    try {
        context.log('Connecting to DB.');
        dbclient = await new Promise((resolve, reject) => {
            mongodb.MongoClient.connect(
                connection_string,
                function (err, client) {
                    if (err) {
                        return reject({err, stack: res.stack});
                    }
                    context.log('Connected to DB.');
                    return resolve(client.db(dbname));
                }
            );
        });
        return dbclient;
    } catch (e) {
        context.log('Failed to connect.');
        context.res = {status: 500, body: e};
        return null;
    }
};
