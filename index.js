const cron = require("node-cron");
const express = require("express");
const airtable = require("airtable");
const sgMail = require("@sendgrid/mail");

var app = express();

const base = airtable.base(`${process.env.AIRTABLE_BASE}`);

const questionsBase = base("Questions");
const allQuestions = questionsBase.select({ view: "Grid view" });
const updateRecord = (record) => {
  let today = new Date();
  let dd = String(today.getDate()).padStart(2, "0");
  let mm = String(today.getMonth() + 1).padStart(2, "0"); //January is 0!
  let yyyy = today.getFullYear();
  let sendDate = `${mm}/${dd}/${yyyy}`;
  console.log(sendDate);
  base("Questions").update([
    {
      id: record.id,
      fields: {
        Status: "Envoyé",
        Date: sendDate,
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
  //"00 18 * * *"
  "5 * * * *",
  () => {
    console.log("launching cron");
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

app.get("/", function (req, res) {
  res.sendFile(path.join(__dirname, "/index.html"));
});

app.listen(process.env.PORT, () =>
  console.log(`listening port : ${process.env.PORT}`)
);
