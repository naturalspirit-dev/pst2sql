const Sequelize = require('sequelize');

const {
  PSTFile,
  PSTFolder,
  PSTMessage
} = require('pst-extractor');

const resolve = require('path').resolve;

// create a new Sequelize instance with your database credentials
const sequelize = new Sequelize('dev', 'root', '', {
  host: 'localhost',
  dialect: 'mysql'
});

// define a model for the emails table
const Email = sequelize.define('emails', {
  sender: Sequelize.STRING,
  subject: Sequelize.STRING,
  body: Sequelize.TEXT,
  received: Sequelize.DATE
});

// create the emails table in the database
Email.sync()
  .then(result => {

    let depth = -1;
    let col = 0;
    // specify the path to your PST file
    const pstFilePath = 'test.pst';

    const pstFile = new PSTFile(resolve(pstFilePath));
    processFolder(pstFile.getRootFolder());

    /**
     * Walk the folder tree recursively and process emails.
     * @param {PSTFolder} folder
     */
    function processFolder(folder) {
      depth++;

      // the root folder doesn't have a display name
      if (depth > 0) {
        console.log(getDepth(depth) + folder.displayName);
      }

      // go through the folders...
      if (folder.hasSubfolders) {
        let childFolders = folder.getSubFolders();
        for (let childFolder of childFolders) {
          processFolder(childFolder);
        }
      }

      // and now the emails for this folder
      if (folder.contentCount > 0) {
        depth++;
        let email = folder.getNextChild();
        while (email != null) {
          console.log('##############################################  start of Email  ##############################################');

          console.log(getDepth(depth) +
            'Sender: ' + email.senderName +
            '\n, Subject: ' + email.subject + '\n, Body: ' + email.body, '\n, Received: ' + email.messageDeliveryTime);

          const sender = email.senderName;
          const subject = email.subject;
          const body = email.body;
          const received = email.messageDeliveryTime;

          // insert the email into the database
          Email.create({
            sender: sender,
            subject: subject,
            body: body,
            received: received
          });
          console.log('##############################################  end of Email  ##############################################');
          email = folder.getNextChild();
        }
        depth--;
      }
      depth--;
    }

    /**
     * Returns a string with visual indication of depth in tree.
     * @param {number} depth
     * @returns {string}
     */
    function getDepth(depth) {
      let sdepth = '';
      if (col > 0) {
        col = 0;
        sdepth += '\n';
      }
      for (let x = 0; x < depth - 1; x++) {
        sdepth += ' | ';
      }
      sdepth += ' |- ';
      return sdepth;
    }
  })
  .catch(err => console.log(err));