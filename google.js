const { GoogleSpreadsheet } = require('google-spreadsheet');

const creds = require(process.env.GOOGLE_CREDS_FILE); // the file saved above
const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID);

doc.useServiceAccountAuth(creds);

module.exports = {
    doc
}