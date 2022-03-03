var cron = require("node-cron");
const airtable = require("airtable");
const sgMail = require("@sendgrid/mail");

const base = airtable.base(`${process.env.AIRTABLE_BASE}`);

const questionsBase = base("Questions");
const allQuestions = questionsBase.select({ view: "Grid view" });
const updateRecord = (record) => {
  base("Questions").update([
    {
      id: record.id,
      fields: {
        Status: "Envoyé",
      },
    },
  ]);
};

const sendMail = (record) => {
  let fields = record.fields;
  let text = `
Bonjour,

Voici notre question pour nos participant.e.s du jour:

${fields.Question}

Réponse : ${fields.Reponse}

Amicales Saluations,

Aurélien Debord
25 rue du champ de foire
87130 - La Croisille-sur-Briance
`;

  let msg = {
    to: `${process.env.RECIPIENT}`,
    from: `${process.env.SENDER}`,
    subject: `Nouvelle question - ${fields.Sujet}`,
    text: text,
  };
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);

  sgMail
    .send(msg)
    .then((response) => {
      if (response[0].statusCode === 202) {
        updateRecord(record);
      }
    })
    .catch((error) => {
      console.error(error);
    });
};
cron.schedule(
  "34 21 * * *",
  () => {
    allQuestions.firstPage((error, records) => {
      let questions = records.map((record) => record._rawJson);
      let questionsFilter = questions.filter(
        (question) => question.fields.Status === "A envoyer"
      );

      sendMail(questionsFilter[0]);
    });
  },
  {
    timezone: "Europe/Paris",
  }
);
