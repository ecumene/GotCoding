const { GoogleSpreadsheet } = require("google-spreadsheet");

const credsFile = process.env.GOOGLE_CREDS_FILE;
// eslint-disable-next-line import/no-dynamic-require
const creds = require(credsFile);
const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID);

doc.useServiceAccountAuth(creds);

module.exports = {
    doc,
};
