const kaltura = require('kaltura');
const config = require('./config');
const mpx = require('./mpx');

function authenticateKaltura() {
  return new Promise((resolve, reject) => {
    // https://knowledge.kaltura.com/introduction-kaltura-client-libraries#UsingaClientObjecttoPerformanAPICall
    const kaltura_conf = new kaltura.kc.KalturaConfiguration(config.kaltura.partner_id);
    kaltura_conf.serviceUrl = config.kaltura.service_url;
    // kaltura_conf.logger = console; // enable to debug requests
    const client = new kaltura.kc.KalturaClient(kaltura_conf);
    const type = kaltura.kc.enums.KalturaSessionType.ADMIN;
    // const expiry = null;
    // const privileges = null;
    client.session.start(clientReady, config.kaltura.secret, config.kaltura.user, type, config.kaltura.partner_id);
    function clientReady(ks) {
      client.setKs(ks);
      resolve(client);
    }
  });
}

function authenticateMpx() {
  return new Promise((resolve, reject) => {
    const mpxClient = new mpx.MpxClient();
    mpxClient.authenticate(config.mpx.user, config.mpx.pass).then(() => resolve(mpxClient));
  });
}

Promise.all([authenticateKaltura(), authenticateMpx()]).then(([kalturaClient, mpxClient]) => {
  // both services are ready
  mpxClient.media.media.read(console.log);
  kalturaClient.media.listAction(console.log, null, {
    pageSize: 2,
    pageIndex: 1
  });
  // mpxClient.media.category.create([{
  //   "title": "Football",
  //   "description": "Content related to football",
  //   "ownerId": null,
  //   "locked": true,
  //   "plcategory$scheme": "News"
  // }], console.log);
}, reason => {
  console.error(reason);
});
