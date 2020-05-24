const dbinit = require('../dbcommon.js');
const axios = require('axios');
let client = null;

module.exports = async function (context, req) {
    context.log('Running');
    const {body: {language, number, category, type, description, status}} = req;
    const validations = [];

    if (!language) {
        validations.push('Field language missing');
    }
    if (!number || number.length != 12 || !/^[0-9]+$/.test(number)) {
        validations.push('Field number does not have 12 digits');
    }
    for (const enumField of ['category', 'type', 'status']) {
        const validation = await axios.get(process.env.AF_CHECK_ENUM_VALUE_URL, {params: {
            language,
            enumType: enumField,
            value: req.body[enumField]
        }});
        context.log(validation.data);
        if (!validation.data.exists) {
            validations.push(validation.data.message);
        }
    }
    if (validations.length) {
        context.res = {
            status: 400,
            body: validations,
            headers: {'Content-Type': 'application/json'}
        };
        return context.done();
    }

    context.log('Validations passed.');

    if (!client && !(client = await dbinit(context, process.env.COSMOSDB_CONNECT_STRING, 'afnode4db'))) {
        return context.done();
    } else {
        context.log('Already connected to DB.');
    }

    let mongoResult = null;
    try {
        mongoResult = await new Promise ((resolve, reject) => {
            client.collection('documents').findOneAndReplace(
                {_id:number},
                {_id: number, language, category, type, description, status},
                {upsert: true, returnOriginal: false},
                (err, doc) => {
                    if (err) {
                        return reject(err);
                    }
                    return resolve(doc);
                }
            );
        });

    } catch (e) {
        context.res = {
            status: 404,
            body: e
        };
        return context.done();
    }
    if (!mongoResult.value) {
        context.res = {
            status: 404,
            body: mongoResult,
        };
        return context.done();
    }
    context.res = {
        body: mongoResult.value,
        headers: {'Content-Type': 'application/json'}
    };
    return context.done();
};